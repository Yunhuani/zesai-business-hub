import { z } from "zod";
import { router, adminProcedure } from "../_core/trpc";
import {
  getDocuments,
  getDocumentById,
  updateDocumentWeight,
  deleteDocument,
  searchKnowledge,
  getMessageKnowledgeRefs,
  DocumentWeight,
} from "../_core/knowledge";
import { processDocument } from "../_core/documentProcessor";

export const knowledgeRouter = router({
  // Get all documents (global or for specific agent)
  list: adminProcedure
    .input(z.object({
      agentId: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      const agentId = input?.agentId;
      return getDocuments(agentId);
    }),

  // Get global documents only
  listGlobal: adminProcedure.query(async () => {
    return getDocuments(undefined);
  }),

  // Get document by ID
  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getDocumentById(input.id);
    }),

  // Upload and process document
  upload: adminProcedure
    .input(z.object({
      fileName: z.string(),
      fileType: z.string(),
      fileData: z.string(), // Base64 encoded
      agentId: z.number().optional(),
      weight: z.enum(['strong', 'preferred', 'reference']).default('preferred'),
    }))
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.fileData, 'base64');
      
      // Check file size (max 20MB)
      if (buffer.length > 20 * 1024 * 1024) {
        throw new Error('File size exceeds 20MB limit');
      }
      
      const result = await processDocument(
        buffer,
        input.fileName,
        input.fileType,
        input.agentId,
        input.weight as DocumentWeight
      );
      
      return result;
    }),

  // Update document weight
  updateWeight: adminProcedure
    .input(z.object({
      id: z.number(),
      weight: z.enum(['strong', 'preferred', 'reference']),
    }))
    .mutation(async ({ input }) => {
      await updateDocumentWeight(input.id, input.weight as DocumentWeight);
      return { success: true };
    }),

  // Delete document
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteDocument(input.id);
      return { success: true };
    }),

  // Test knowledge search (for admin testing)
  testSearch: adminProcedure
    .input(z.object({
      query: z.string(),
      agentId: z.number().optional(),
      topK: z.number().default(5),
    }))
    .query(async ({ input }) => {
      return searchKnowledge(input.query, input.agentId, input.topK);
    }),

  // Get knowledge references for a message (for tracing)
  getMessageRefs: adminProcedure
    .input(z.object({ messageId: z.number() }))
    .query(async ({ input }) => {
      return getMessageKnowledgeRefs(input.messageId);
    }),
});
