import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getConversationMessages, getDb } from "../db";
import { conversations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { generatePPT } from "../pptGenerator";
import { generatePDF } from "../pdfGenerator";

export const exportRouter = router({
  /**
   * Generate PPT file from conversation
   */
  generatePPT: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user owns this conversation
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation || conversation.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "对话不存在",
        });
      }

      if (conversation[0].userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权导出此对话",
        });
      }

      // Get conversation messages
      const messages = await getConversationMessages(input.conversationId);
      
      if (!messages || messages.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "对话没有消息",
        });
      }

      // Generate PPT
      const pptBuffer = await generatePPT(messages, conversation[0].title || '商业咨询报告');
      
      // Convert buffer to base64 for transmission
      const base64Data = pptBuffer.toString('base64');
      
      return {
        data: base64Data,
        filename: `${conversation[0].title || 'presentation'}_${Date.now()}.pptx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      };
    }),

  /**
   * Generate slide content from conversation (Markdown format)
   */
  generateSlideContent: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user owns this conversation
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation || conversation.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "对话不存在",
        });
      }

      if (conversation[0].userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权导出此对话",
        });
      }

      // Get conversation messages
      const messages = await getConversationMessages(input.conversationId);
      
      if (!messages || messages.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "对话没有消息",
        });
      }

      // Convert conversation to slide content markdown
      const slideContent = convertConversationToSlides(messages, conversation[0].title || '商业咨询报告');
      
      return {
        content: slideContent,
        title: conversation[0].title || '商业咨询报告',
      };
    }),

  /**
   * Export conversation as PDF
   */
  exportPDF: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Check if user owns this conversation
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, input.conversationId))
        .limit(1);

      if (!conversation || conversation.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "对话不存在",
        });
      }

      if (conversation[0].userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权导出此对话",
        });
      }

      // Get conversation messages
      const messages = await getConversationMessages(input.conversationId);
      
      if (!messages || messages.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "对话没有消息",
        });
      }

      // Generate PDF
      const pdfBuffer = await generatePDF(messages, conversation[0].title || '商业咨询报告');
      
      // Convert buffer to base64 for transmission
      const base64Data = pdfBuffer.toString('base64');
      
      return {
        data: base64Data,
        filename: `${conversation[0].title || 'report'}_${Date.now()}.pdf`,
        mimeType: 'application/pdf',
      };
    }),

  /**
   * Legacy PPT export (kept for compatibility)
   */
  exportPPT: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      // Return simple JSON structure for now
      return {
        slides: [{ title: 'Placeholder', content: 'Use generateSlideContent instead' }],
        filename: `presentation_${input.conversationId}_${Date.now()}.json`,
      };
    }),
});

/**
 * Convert conversation messages to slide content in markdown format
 * This will be used by Manus slides tool to generate professional PPT
 */
function convertConversationToSlides(
  messages: Array<{ role: string; content: string }>,
  title: string
): string {
  let slideContent = `# ${title}\n\n`;
  slideContent += `泽思AI商业智库 | ${new Date().toLocaleDateString('zh-CN')}\n\n`;
  slideContent += `---\n\n`;

  // Process each assistant message as potential slides
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    
    if (msg.role === 'assistant') {
      // Parse the content to extract structured information
      const sections = extractSections(msg.content);
      
      for (const section of sections) {
        slideContent += `# ${section.title}\n\n`;
        slideContent += `${section.content}\n\n`;
        slideContent += `---\n\n`;
      }
    }
  }

  // Add closing slide
  slideContent += `# 感谢使用泽思AI商业智库\n\n`;
  slideContent += `如需进一步咨询，请访问 Zenith.ai\n\n`;

  return slideContent;
}

/**
 * Extract structured sections from markdown content
 */
function extractSections(content: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = content.split('\n');
  
  let currentTitle = '';
  let currentContent: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentContent.push(line);
      continue;
    }

    // Only treat as heading if not in code block
    if (!inCodeBlock && (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### '))) {
      // Save previous section if it has content
      if (currentTitle && currentContent.length > 0) {
        const contentText = currentContent.join('\n').trim();
        if (contentText) {
          sections.push({
            title: currentTitle,
            content: contentText,
          });
        }
      }
      
      // Start new section
      currentTitle = line.replace(/^#+\s*/, '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentTitle && currentContent.length > 0) {
    const contentText = currentContent.join('\n').trim();
    if (contentText) {
      sections.push({
        title: currentTitle,
        content: contentText,
      });
    }
  }

  // If no sections found, create sections from paragraphs
  if (sections.length === 0) {
    const paragraphs = content.split('\n\n').filter(p => p.trim());
    paragraphs.forEach((para, index) => {
      const firstLine = para.split('\n')[0];
      sections.push({
        title: firstLine.length > 50 ? `要点 ${index + 1}` : firstLine,
        content: para,
      });
    });
  }

  return sections;
}
