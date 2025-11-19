import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getConversationMessages, getDb } from "../db";
import { conversations } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const exportRouter = router({
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

      // Generate PDF content (markdown)
      let content = `# AI 商业咨询对话\n\n`;
      content += `**日期**: ${new Date().toLocaleDateString('zh-CN')}\n\n`;
      content += `---\n\n`;

      for (const msg of messages) {
        if (msg.role === 'user') {
          content += `## 👤 用户\n\n${msg.content}\n\n`;
        } else {
          content += `## 🤖 AI 顾问\n\n${msg.content}\n\n`;
        }
        content += `---\n\n`;
      }

      return {
        content,
        filename: `conversation_${input.conversationId}_${Date.now()}.md`,
      };
    }),

  /**
   * Export conversation as PPT
   */
  exportPPT: protectedProcedure
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

      // Generate PPT slides structure
      const slides: Array<{ title: string; content: string }> = [];
      
      // Title slide
      slides.push({
        title: 'AI 商业咨询报告',
        content: `生成日期: ${new Date().toLocaleDateString('zh-CN')}`,
      });

      // Content slides
      for (let i = 0; i < messages.length; i++) {
        const msg = messages[i];
        if (msg.role === 'assistant') {
          // Split long content into multiple slides
          const sections = splitIntoSections(msg.content);
          sections.forEach((section, index) => {
            slides.push({
              title: section.title || `第 ${i + 1} 部分 (${index + 1})`,
              content: section.content,
            });
          });
        }
      }

      return {
        slides,
        filename: `presentation_${input.conversationId}_${Date.now()}.json`,
      };
    }),
});

/**
 * Split markdown content into sections for slides
 */
function splitIntoSections(content: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = content.split('\n');
  
  let currentTitle = '';
  let currentContent: string[] = [];

  for (const line of lines) {
    // Check if it's a heading
    if (line.startsWith('# ') || line.startsWith('## ')) {
      // Save previous section
      if (currentTitle || currentContent.length > 0) {
        sections.push({
          title: currentTitle || '内容',
          content: currentContent.join('\n').trim(),
        });
      }
      
      // Start new section
      currentTitle = line.replace(/^#+\s*/, '');
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentTitle || currentContent.length > 0) {
    sections.push({
      title: currentTitle || '内容',
      content: currentContent.join('\n').trim(),
    });
  }

  // If no sections found, create one
  if (sections.length === 0) {
    sections.push({
      title: '内容',
      content: content,
    });
  }

  return sections;
}
