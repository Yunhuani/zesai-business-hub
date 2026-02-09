/**
 * PPT Generation Router
 * Handles text-to-PPT generation requests
 */
import { router, protectedProcedure } from '../_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDb } from '../db';
import { pptDocuments } from '../../drizzle/schema';
import { eq, desc } from 'drizzle-orm';
import { deductCredits, getUserCredits } from '../creditsManager';
import { structureTextToPPTOutline } from '../pptStructurer';
import { renderAllSlidesToImages, closeBrowser } from '../pptRenderer';
import { assemblePPT, generatePreviewBase64 } from '../pptAssembler';
import { storageGet, storagePut } from '../storage';

const PPT_CREDITS_COST = 200;

export const pptGenerationRouter = router({
  // Get available themes and color schemes
  getOptions: protectedProcedure.query(() => {
    return {
      themes: [
        { id: 'business', name: '商务专业', description: '适合商业报告、商业计划书' },
        { id: 'tech', name: '科技未来', description: '适合科技产品、技术方案' },
        { id: 'simple', name: '简约素雅', description: '适合学术报告、研究分析' },
        { id: 'creative', name: '创意活力', description: '适合营销方案、品牌策划' },
      ],
      colorSchemes: [
        { id: 'forest_gold', name: '森林金', colors: ['#0a1a0f', '#c8a951'] },
        { id: 'deep_blue', name: '深海蓝', colors: ['#0a0e1a', '#4a90d9'] },
        { id: 'zenith_purple', name: '泽思紫', colors: ['#0e0a1a', '#8b5cf6'] },
        { id: 'classic_black', name: '经典黑', colors: ['#111111', '#ffffff'] },
      ],
      creditsCost: PPT_CREDITS_COST,
    };
  }),

  // Create PPT generation task
  create: protectedProcedure
    .input(z.object({
      inputText: z.string().min(100, '内容至少需要100字').max(50000, '内容不能超过50000字'),
      themeStyle: z.enum(['business', 'tech', 'simple', 'creative']).default('business'),
      colorScheme: z.enum(['forest_gold', 'deep_blue', 'zenith_purple', 'classic_black']).default('forest_gold'),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user.id;
      
      // Check credits
      const credits = await getUserCredits(userId);
      if (credits.total < PPT_CREDITS_COST) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `积分不足，生成PPT需要${PPT_CREDITS_COST}积分，当前剩余${credits.total}积分`,
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: '数据库不可用' });

      // Create document record
      const [result] = await db.insert(pptDocuments).values({
        userId,
        title: '生成中...',
        inputText: input.inputText,
        themeStyle: input.themeStyle,
        colorScheme: input.colorScheme,
        status: 'pending',
      });

      const documentId = result.insertId;

      // Start async generation (don't await)
      generatePPTAsync(Number(documentId), userId, input.inputText, input.themeStyle, input.colorScheme)
        .catch(err => console.error(`[PPT] Generation failed for doc ${documentId}:`, err));

      return { documentId: Number(documentId) };
    }),

  // Get document status (includes preview URLs when completed)
  getStatus: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const [doc] = await db.select().from(pptDocuments)
        .where(eq(pptDocuments.id, input.documentId))
        .limit(1);

      if (!doc || doc.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文档不存在' });
      }

      // Parse preview URLs from outlineJson if completed
      let previewUrls: string[] = [];
      if (doc.status === 'completed' && doc.outlineJson) {
        try {
          const data = JSON.parse(doc.outlineJson);
          if (data.previewUrls) {
            previewUrls = data.previewUrls;
          }
        } catch {}
      }

      return {
        id: doc.id,
        title: doc.title,
        status: doc.status,
        slideCount: doc.slideCount,
        fileUrl: doc.fileUrl,
        fileSize: doc.fileSize,
        errorMessage: doc.errorMessage,
        creditsDeducted: doc.creditsDeducted,
        createdAt: doc.createdAt,
        previewUrls,
      };
    }),

  // Get download URL
  getDownloadUrl: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const [doc] = await db.select().from(pptDocuments)
        .where(eq(pptDocuments.id, input.documentId))
        .limit(1);

      if (!doc || doc.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND', message: '文档不存在' });
      }

      if (doc.status !== 'completed' || !doc.fileUrl) {
        throw new TRPCError({ code: 'BAD_REQUEST', message: '文档尚未生成完成' });
      }

      // Return the CDN URL directly from database
      return { url: doc.fileUrl, title: doc.title };
    }),

  // Get slide previews (from S3 stored images)
  getPreviews: protectedProcedure
    .input(z.object({ documentId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR' });

      const [doc] = await db.select().from(pptDocuments)
        .where(eq(pptDocuments.id, input.documentId))
        .limit(1);

      if (!doc || doc.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (!doc.outlineJson) {
        return { previews: [] };
      }

      // Get preview URLs from stored data
      try {
        const data = JSON.parse(doc.outlineJson);
        if (data.previewUrls && data.previewUrls.length > 0) {
          // Return presigned URLs for each preview
          const previews: string[] = [];
          for (const key of data.previewKeys || []) {
            try {
              const { url } = await storageGet(key);
              previews.push(url);
            } catch {
              // Skip failed ones
            }
          }
          if (previews.length > 0) return { previews };
          // Fallback to stored URLs
          return { previews: data.previewUrls };
        }
      } catch {}

      return { previews: [] };
    }),

  // List user's PPT documents
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return [];

    const docs = await db.select({
      id: pptDocuments.id,
      title: pptDocuments.title,
      status: pptDocuments.status,
      slideCount: pptDocuments.slideCount,
      themeStyle: pptDocuments.themeStyle,
      colorScheme: pptDocuments.colorScheme,
      creditsDeducted: pptDocuments.creditsDeducted,
      createdAt: pptDocuments.createdAt,
    }).from(pptDocuments)
      .where(eq(pptDocuments.userId, ctx.user.id))
      .orderBy(desc(pptDocuments.createdAt))
      .limit(50);

    return docs;
  }),
});

// ============================================================
// Async PPT generation pipeline
// ============================================================
async function generatePPTAsync(
  documentId: number,
  userId: number,
  inputText: string,
  themeStyle: string,
  colorScheme: string
) {
  const db = await getDb();
  if (!db) throw new Error('Database not available');

  const updateStatus = async (status: string, extra: Record<string, any> = {}) => {
    await db.update(pptDocuments)
      .set({ status: status as any, ...extra })
      .where(eq(pptDocuments.id, documentId));
  };

  try {
    // Step 1: Structure text with LLM
    await updateStatus('structuring');
    console.log(`[PPT] Doc ${documentId}: Structuring text...`);
    const outline = await structureTextToPPTOutline(inputText);
    
    await updateStatus('structuring', { 
      title: outline.presentationTitle,
      outlineJson: JSON.stringify(outline),
      slideCount: outline.slides.length,
    });
    console.log(`[PPT] Doc ${documentId}: Got ${outline.slides.length} slides`);

    // Step 2: Render slides to images
    await updateStatus('rendering');
    console.log(`[PPT] Doc ${documentId}: Rendering slides...`);
    const slideImages = await renderAllSlidesToImages(
      outline.slides, 
      colorScheme, 
      themeStyle,
      (current, total) => console.log(`[PPT] Doc ${documentId}: Rendering slide ${current}/${total}`)
    );
    await closeBrowser();

    // Step 3: Upload preview images to S3
    await updateStatus('assembling');
    console.log(`[PPT] Doc ${documentId}: Uploading previews...`);
    const previewKeys: string[] = [];
    const previewUrls: string[] = [];
    for (let i = 0; i < slideImages.length; i++) {
      const key = `ppt/${userId}/${documentId}/preview_${i}.png`;
      try {
        const result = await storagePut(key, slideImages[i], 'image/png');
        previewKeys.push(key);
        previewUrls.push(result.url);
      } catch (err) {
        console.error(`[PPT] Doc ${documentId}: Failed to upload preview ${i}:`, err);
      }
    }

    // Step 4: Assemble PPT
    console.log(`[PPT] Doc ${documentId}: Assembling PPT...`);
    const { url, fileSize } = await assemblePPT(slideImages, outline.presentationTitle, userId, documentId);

    // Step 5: Deduct credits
    console.log(`[PPT] Doc ${documentId}: Deducting credits...`);
    await deductCredits(userId, PPT_CREDITS_COST, `生成PPT: ${outline.presentationTitle}`);

    // Step 6: Mark completed (store preview keys/urls in outlineJson)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const outlineWithPreviews = {
      ...outline,
      previewKeys,
      previewUrls,
    };

    await updateStatus('completed', {
      fileUrl: url,
      fileSize,
      creditsDeducted: PPT_CREDITS_COST,
      outlineJson: JSON.stringify(outlineWithPreviews),
      expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
    });
    console.log(`[PPT] Doc ${documentId}: Completed! URL: ${url}`);

  } catch (error: any) {
    console.error(`[PPT] Doc ${documentId}: Failed:`, error);
    await closeBrowser();
    await updateStatus('failed', { errorMessage: error.message || '生成失败' });
  }
}
