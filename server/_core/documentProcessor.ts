import { createDocument, updateDocumentStatus, createChunks, chunkText, DocumentWeight } from './knowledge';

/**
 * Process uploaded document - extract text and create chunks
 */
export async function processDocument(
  fileBuffer: Buffer,
  fileName: string,
  fileType: string,
  agentId?: number,
  weight: DocumentWeight = 'preferred'
): Promise<{ documentId: number; chunkCount: number }> {
  // Create document record
  const documentId = await createDocument({
    name: fileName,
    originalName: fileName,
    fileType,
    fileSize: fileBuffer.length,
    agentId,
    weight,
  });

  try {
    // Update status to processing
    await updateDocumentStatus(documentId, 'processing');

    // Extract text based on file type
    let text = '';
    
    if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      text = fileBuffer.toString('utf-8');
    } else if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      text = await extractPdfText(fileBuffer);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx')
    ) {
      text = await extractWordText(fileBuffer);
    } else if (
      fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      fileName.endsWith('.xlsx')
    ) {
      text = await extractExcelText(fileBuffer);
    } else {
      throw new Error(`Unsupported file type: ${fileType}`);
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text content extracted from document');
    }

    // Chunk the text
    const chunks = chunkText(text, 1000, 200);
    
    if (chunks.length === 0) {
      throw new Error('No chunks created from document');
    }

    // Save chunks to database
    await createChunks(
      documentId,
      chunks.map(content => ({ content, metadata: { source: fileName } }))
    );

    // Update status to completed
    await updateDocumentStatus(documentId, 'completed', chunks.length);

    return { documentId, chunkCount: chunks.length };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateDocumentStatus(documentId, 'failed', 0, errorMessage);
    throw error;
  }
}

/**
 * Extract text from PDF
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  let parser: import('pdf-parse').PDFParse | undefined;
  try {
    const { PDFParse } = await import('pdf-parse');
    parser = new PDFParse({ data: buffer });
    const data = await parser.getText();
    return data.text || '';
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  } finally {
    await parser?.destroy();
  }
}

/**
 * Extract text from Word document
 */
async function extractWordText(buffer: Buffer): Promise<string> {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value || '';
  } catch (error) {
    console.error('Word extraction error:', error);
    throw new Error('Failed to extract text from Word document');
  }
}

/**
 * Extract text from Excel
 */
async function extractExcelText(buffer: Buffer): Promise<string> {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    const texts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(sheet);
      texts.push(`## ${sheetName}\n${csv}`);
    }
    
    return texts.join('\n\n');
  } catch (error) {
    console.error('Excel extraction error:', error);
    throw new Error('Failed to extract text from Excel');
  }
}
