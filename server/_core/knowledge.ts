import { getDb } from "../db";

// Types
export type DocumentWeight = 'strong' | 'preferred' | 'reference';
export type DocumentStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface KnowledgeDocument {
  id: number;
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  s3Key?: string;
  agentId?: number;
  weight: DocumentWeight;
  status: DocumentStatus;
  chunkCount: number;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk {
  id: number;
  documentId: number;
  content: string;
  chunkIndex: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface KnowledgeSearchResult {
  chunkId: number;
  documentId: number;
  documentName: string;
  content: string;
  weight: DocumentWeight;
  similarityScore: number;
  metadata: Record<string, unknown>;
}

/**
 * Get all documents (global or for specific agent)
 */
export async function getDocuments(agentId?: number): Promise<KnowledgeDocument[]> {
  const db = await getDb();
  
  let query = `
    SELECT id, name, original_name as "originalName", file_type as "fileType", 
           file_size as "fileSize", s3_key as "s3Key", agent_id as "agentId",
           weight, status, chunk_count as "chunkCount", error_message as "errorMessage",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM knowledge_documents
  `;
  
  if (agentId === null) {
    query += ` WHERE agent_id IS NULL`;
  } else if (agentId !== undefined) {
    query += ` WHERE agent_id = ${agentId}`;
  }
  
  query += ` ORDER BY created_at DESC`;
  
  const result = await db.execute(query);
  return result.rows as KnowledgeDocument[];
}

/**
 * Get document by ID
 */
export async function getDocumentById(id: number): Promise<KnowledgeDocument | null> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT id, name, original_name as "originalName", file_type as "fileType", 
           file_size as "fileSize", s3_key as "s3Key", agent_id as "agentId",
           weight, status, chunk_count as "chunkCount", error_message as "errorMessage",
           created_at as "createdAt", updated_at as "updatedAt"
    FROM knowledge_documents WHERE id = ${id}
  `);
  return result.rows[0] as KnowledgeDocument || null;
}

/**
 * Create a new document record
 */
export async function createDocument(data: {
  name: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  s3Key?: string;
  agentId?: number;
  weight?: DocumentWeight;
}): Promise<number> {
  const db = await getDb();
  const result = await db.execute(`
    INSERT INTO knowledge_documents (name, original_name, file_type, file_size, s3_key, agent_id, weight)
    VALUES ('${data.name}', '${data.originalName}', '${data.fileType}', ${data.fileSize}, 
            ${data.s3Key ? `'${data.s3Key}'` : 'NULL'}, 
            ${data.agentId ?? 'NULL'}, 
            '${data.weight || 'preferred'}')
    RETURNING id
  `);
  return (result.rows[0] as { id: number }).id;
}

/**
 * Update document status
 */
export async function updateDocumentStatus(
  id: number, 
  status: DocumentStatus, 
  chunkCount?: number,
  errorMessage?: string
): Promise<void> {
  const db = await getDb();
  let query = `UPDATE knowledge_documents SET status = '${status}', updated_at = NOW()`;
  
  if (chunkCount !== undefined) {
    query += `, chunk_count = ${chunkCount}`;
  }
  if (errorMessage) {
    query += `, error_message = '${errorMessage.replace(/'/g, "''")}'`;
  }
  
  query += ` WHERE id = ${id}`;
  await db.execute(query);
}

/**
 * Update document weight
 */
export async function updateDocumentWeight(id: number, weight: DocumentWeight): Promise<void> {
  const db = await getDb();
  await db.execute(`UPDATE knowledge_documents SET weight = '${weight}', updated_at = NOW() WHERE id = ${id}`);
}

/**
 * Delete document and its chunks
 */
export async function deleteDocument(id: number): Promise<void> {
  const db = await getDb();
  await db.execute(`DELETE FROM knowledge_documents WHERE id = ${id}`);
}

/**
 * Create knowledge chunks for a document
 */
export async function createChunks(documentId: number, chunks: { content: string; metadata?: Record<string, unknown> }[]): Promise<void> {
  const db = await getDb();
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const content = chunk.content.replace(/'/g, "''");
    const metadata = JSON.stringify(chunk.metadata || {}).replace(/'/g, "''");
    
    await db.execute(`
      INSERT INTO knowledge_chunks (document_id, content, chunk_index, metadata)
      VALUES (${documentId}, '${content}', ${i}, '${metadata}'::jsonb)
    `);
  }
}

/**
 * Get chunks for a document
 */
export async function getChunksByDocument(documentId: number): Promise<KnowledgeChunk[]> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT id, document_id as "documentId", content, chunk_index as "chunkIndex", 
           metadata, created_at as "createdAt"
    FROM knowledge_chunks 
    WHERE document_id = ${documentId}
    ORDER BY chunk_index
  `);
  return result.rows as KnowledgeChunk[];
}

/**
 * Text chunking function - splits text into overlapping chunks
 */
export function chunkText(text: string, maxChunkSize: number = 1000, overlap: number = 200): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }
  
  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length <= maxChunkSize) {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      
      // If paragraph itself is too long, split it
      if (paragraph.length > maxChunkSize) {
        const sentences = paragraph.split(/(?<=[。！？.!?])\s*/);
        currentChunk = '';
        
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length <= maxChunkSize) {
            currentChunk += sentence;
          } else {
            if (currentChunk) {
              chunks.push(currentChunk.trim());
            }
            currentChunk = sentence;
          }
        }
      } else {
        currentChunk = paragraph;
      }
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }
  
  // Add overlap between chunks
  if (overlap > 0 && chunks.length > 1) {
    const overlappedChunks: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      let chunk = chunks[i];
      if (i > 0) {
        const prevChunk = chunks[i - 1];
        const overlapText = prevChunk.slice(-overlap);
        chunk = overlapText + '\n' + chunk;
      }
      overlappedChunks.push(chunk);
    }
    return overlappedChunks;
  }
  
  return chunks;
}

/**
 * Simple text similarity based on word overlap (Jaccard similarity)
 */
export function textSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  const words2 = new Set(text2.toLowerCase().split(/\s+/).filter(w => w.length > 1));
  
  if (words1.size === 0 || words2.size === 0) return 0;
  
  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) intersection++;
  }
  
  const union = words1.size + words2.size - intersection;
  return union > 0 ? (intersection / union) * 100 : 0;
}

/**
 * Search knowledge base for relevant content
 */
export async function searchKnowledge(
  query: string, 
  agentId?: number, 
  topK: number = 5
): Promise<KnowledgeSearchResult[]> {
  const db = await getDb();
  
  // Get all chunks from relevant documents (global + agent-specific)
  let docQuery = `
    SELECT d.id as doc_id, d.name as doc_name, d.weight,
           c.id as chunk_id, c.content, c.metadata
    FROM knowledge_documents d
    JOIN knowledge_chunks c ON c.document_id = d.id
    WHERE d.status = 'completed'
  `;
  
  if (agentId) {
    docQuery += ` AND (d.agent_id IS NULL OR d.agent_id = ${agentId})`;
  } else {
    docQuery += ` AND d.agent_id IS NULL`;
  }
  
  const result = await db.execute(docQuery);
  const rows = result.rows as Array<{
    doc_id: number;
    doc_name: string;
    weight: DocumentWeight;
    chunk_id: number;
    content: string;
    metadata: Record<string, unknown>;
  }>;
  
  if (rows.length === 0) return [];
  
  // Calculate similarity scores
  const results: KnowledgeSearchResult[] = rows.map(row => ({
    chunkId: row.chunk_id,
    documentId: row.doc_id,
    documentName: row.doc_name,
    content: row.content,
    weight: row.weight,
    similarityScore: textSimilarity(query, row.content),
    metadata: row.metadata || {},
  }));
  
  // Sort by weight priority and similarity score
  const weightPriority: Record<DocumentWeight, number> = {
    strong: 3,
    preferred: 2,
    reference: 1,
  };
  
  results.sort((a, b) => {
    // First by weight priority
    const weightDiff = weightPriority[b.weight] - weightPriority[a.weight];
    if (weightDiff !== 0) return weightDiff;
    // Then by similarity score
    return b.similarityScore - a.similarityScore;
  });
  
  // Filter by minimum similarity threshold
  const filtered = results.filter(r => r.similarityScore > 10);
  
  return filtered.slice(0, topK);
}

/**
 * Build RAG-enhanced prompt with knowledge context
 */
export function buildRAGPrompt(
  userQuery: string,
  knowledgeResults: KnowledgeSearchResult[],
  originalPrompt: string
): string {
  if (knowledgeResults.length === 0) {
    return originalPrompt;
  }
  
  const weightLabels: Record<DocumentWeight, string> = {
    strong: '【必须引用】',
    preferred: '【优先参考】',
    reference: '【仅供参考】',
  };
  
  const knowledgeContext = knowledgeResults.map((r, i) => {
    return `${i + 1}. ${weightLabels[r.weight]} 来源：${r.documentName}\n${r.content}`;
  }).join('\n\n');
  
  return `${originalPrompt}

## 参考知识库内容
以下是与用户问题相关的知识库内容，请根据权重级别合理引用：
- 【必须引用】：必须基于此内容回答
- 【优先参考】：优先使用此内容，如有冲突以此为准
- 【仅供参考】：可作为补充参考

${knowledgeContext}

请基于以上知识库内容和你的专业知识，为用户提供准确、专业的回答。`;
}

/**
 * Save message knowledge references for tracing
 */
export async function saveMessageKnowledgeRefs(
  messageId: number,
  refs: { chunkId: number; similarityScore: number }[]
): Promise<void> {
  const db = await getDb();
  
  for (const ref of refs) {
    await db.execute(`
      INSERT INTO message_knowledge_refs (message_id, chunk_id, similarity_score)
      VALUES (${messageId}, ${ref.chunkId}, ${ref.similarityScore})
    `);
  }
}

/**
 * Get knowledge references for a message
 */
export async function getMessageKnowledgeRefs(messageId: number): Promise<Array<{
  chunkId: number;
  documentName: string;
  content: string;
  similarityScore: number;
}>> {
  const db = await getDb();
  const result = await db.execute(`
    SELECT r.chunk_id as "chunkId", d.name as "documentName", 
           c.content, r.similarity_score as "similarityScore"
    FROM message_knowledge_refs r
    JOIN knowledge_chunks c ON c.id = r.chunk_id
    JOIN knowledge_documents d ON d.id = c.document_id
    WHERE r.message_id = ${messageId}
    ORDER BY r.similarity_score DESC
  `);
  return result.rows as Array<{
    chunkId: number;
    documentName: string;
    content: string;
    similarityScore: number;
  }>;
}
