import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import { documentManager, type DocumentType, type FileFormat } from "../documentManager";
import { generateWordDocument } from "../wordGenerator";
import { generatePDF } from "../pdfGenerator";
import { invokeLLM } from "../_core/llm";
import { getMessageById, getConversationMessages } from "../db";
import { getDocumentStructure } from "../documentStructures";

/**
 * 文档上传和解析路由
 */
export const documentRouter = router({
  /**
   * 上传文档到S3并解析内容
   */
  upload: protectedProcedure
    .input(
      z.object({
        filename: z.string(),
        content: z.string(), // Base64 encoded file content
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // 验证文件类型
        const allowedTypes = [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
          "application/msword", // .doc
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
          "application/vnd.ms-excel", // .xls
        ];

        if (!allowedTypes.includes(input.mimeType)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "不支持的文件类型。仅支持 PDF、Word 和 Excel 文件。",
          });
        }

        // 检查文件大小(16MB限制)
        const buffer = Buffer.from(input.content, "base64");
        const fileSizeInMB = buffer.length / (1024 * 1024);
        if (fileSizeInMB > 16) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "文件大小超过16MB限制",
          });
        }

        // 生成唯一文件名
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileExtension = input.filename.split(".").pop();
        const fileKey = `${ctx.user.id}-documents/${timestamp}-${randomSuffix}.${fileExtension}`;

        // 上传到S3
        const { url } = await storagePut(fileKey, buffer, input.mimeType);

        // 解析文档内容
        let extractedText = "";
        try {
          extractedText = await extractDocumentText(url, input.mimeType);
        } catch (error) {
          console.error("Document extraction error:", error);
          // 即使解析失败,也返回文件URL,让用户知道文件已上传
          return {
            url,
            fileKey,
            filename: input.filename,
            extractedText: "",
            error: "文档内容解析失败,但文件已成功上传",
          };
        }

        return {
          url,
          fileKey,
          filename: input.filename,
          extractedText,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Document upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "文档上传失败",
        });
      }
    }),

  /**
   * 生成文档（Word/PDF）
   */
  generate: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        messageId: z.number(),
        agentId: z.number(),
        fileId: z.string(), // e.g., "business_plan", "strategy_report"
        fileName: z.string(), // e.g., "商业计划书（完整版）"
        format: z.enum(["word", "pdf"]),
        documentType: z.enum(["heavy", "medium", "light"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const userId = ctx.user.id;

        // 1. 检查是否已存在未过期的文档（避免重复扣费）
        const existing = await documentManager.findExistingDocument(
          userId,
          input.conversationId,
          input.fileId,
          input.format
        );

        if (existing) {
          return {
            success: true,
            documentId: existing.id,
            downloadUrl: existing.fileUrl,
            fileName: existing.fileName,
            cached: true,
          };
        }

        // 2. 检查积分是否足够
        const creditsCheck = await documentManager.checkDocumentCredits(
          userId,
          input.documentType
        );

        if (!creditsCheck.sufficient) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `积分不足。当前积分：${creditsCheck.current}，需要：${creditsCheck.required}`,
          });
        }

        // 3. 创建文档生成记录
        const documentId = await documentManager.createDocumentRecord({
          userId,
          conversationId: input.conversationId,
          agentId: input.agentId,
          fileId: input.fileId,
          fileName: input.fileName,
          format: input.format,
          fileType: input.documentType,
        });

        // 4. 扣除积分
        await documentManager.deductDocumentCredits(
          userId,
          input.documentType,
          documentId,
          input.fileName
        );

        // 5. 更新状态为生成中
        await documentManager.updateDocumentGenerating(documentId);

        // 6. 获取完整对话历史
        const conversationMessages = await getConversationMessages(input.conversationId);
        if (!conversationMessages || conversationMessages.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "对话记录不存在",
          });
        }

        // 7. 使用LLM基于完整对话历史生成文档内容（统一最高质量标准）
        const enhancedContent = await enhanceDocumentContent(
          conversationMessages,
          input.fileName
        );

        // 8. 生成文档文件
        let fileBuffer: Buffer;
        let mimeType: string;

        if (input.format === "word") {
          fileBuffer = await generateWordDocument({
            title: input.fileName,
            content: enhancedContent,
            documentType: input.documentType,
            company: "泽思 Zenith AI",
          });
          mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        } else {
          // PDF生成器需要Message[]格式
          fileBuffer = await generatePDF(
            [
              {
                role: "assistant",
                content: enhancedContent,
              },
            ],
            input.fileName,
            input.documentType
          );
          mimeType = "application/pdf";
        }

        // 9. 上传到S3
        const timestamp = Date.now();
        const randomSuffix = Math.random().toString(36).substring(7);
        const fileExtension = input.format === "word" ? "docx" : "pdf";
        const fileKey = `${userId}-generated-docs/${timestamp}-${randomSuffix}.${fileExtension}`;

        const { url: downloadUrl } = await storagePut(fileKey, fileBuffer, mimeType);

        // 10. 更新文档记录为完成
        await documentManager.updateDocumentCompleted(
          documentId,
          downloadUrl,
          fileBuffer.length
        );

        return {
          success: true,
          documentId,
          downloadUrl,
          fileName: input.fileName,
          cached: false,
        };
      } catch (error) {
        console.error("Document generation error:", error);

        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "文档生成失败，请稍后重试",
        });
      }
    }),
});

/**
 * 使用LLM基于完整对话历史生成文档内容（V2方案）
 */
async function enhanceDocumentContent(
  conversationMessages: Array<{ role: string; content: string; createdAt: string | Date }>,
  fileName: string
): Promise<string> {
  // 将对话历史转换为文本
  const conversationText = conversationMessages
    .map((msg) => `${msg.role === "user" ? "用户" : "顾问"}：${msg.content}`)
    .join("\n\n");

  // 根据文件名获取对应的文档结构模板
  const documentStructure = getDocumentStructure(fileName);

  // 构建增强提示词
  const enhancementPrompt = buildEnhancementPrompt(fileName, documentStructure, conversationText);

  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: enhancementPrompt,
        },
      ],
    });

    const content = response.choices[0].message.content;
    if (typeof content === "string") {
      return content || generateFallbackDocument(conversationMessages, fileName);
    } else if (Array.isArray(content)) {
      const textContent = content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n");
      return textContent || generateFallbackDocument(conversationMessages, fileName);
    }
    return generateFallbackDocument(conversationMessages, fileName);
  } catch (error) {
    console.error("LLM文档生成失败，使用fallback方案:", error);
    return generateFallbackDocument(conversationMessages, fileName);
  }
}

/**
 * 构建文档增强提示词（V2方案 - 简化版）
 */
function buildEnhancementPrompt(
  fileName: string,
  documentStructure: string,
  conversationText: string
): string {
  return `你是一位曾在麦肯锡、BCG等顶级咨询公司工作多年的资深商业顾问。

任务：基于以下咨询对话，生成一份专业的《${fileName}》文档。

核心要求：
1. 彻底过滤对话痕迹：移除所有问候、确认、引导语、emoji、角色标记
2. 专业排版：使用Markdown格式，层级清晰，表格规范，段落适中
3. 内容组织：按照以下结构组织内容

文档结构：
${documentStructure}

对话记录：
${conversationText}

请生成一份可直接交付给客户的专业商业文档。`;
}

/**
 * 生成fallback文档（当LLM失败时）
 */
function generateFallbackDocument(
  conversationMessages: Array<{ role: string; content: string; createdAt: Date }>,
  fileName: string
): string {
  const assistantMessages = conversationMessages
    .filter((msg) => msg.role === "assistant")
    .map((msg) => msg.content);

  const cleanedContent = assistantMessages
    .map((content) => {
      return content
        .replace(/^(好的|明白了|没问题|非常好)[,。!]?\s*/gm, "")
        .replace(/^(让我|我来|接下来)[^。]*。\s*/gm, "")
        .replace(/^(您好|欢迎)[^。]*。\s*/gm, "")
        .replace(/[\uD800-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]/g, "")
        .replace(/(AI顾问|用户|客户)[:：]/g, "")
        .replace(/【[^】]+】/g, "")
        .replace(/阶段[一二三四五六七八九十\d]+[:：]/g, "")
        .trim();
    })
    .filter((content) => content.length > 0)
    .join("\n\n---\n\n");

  return `# ${fileName}

> **注意：** 本文档为自动整理版本，建议进一步编辑完善。

---

${cleanedContent}

---

*文档生成时间：${new Date().toLocaleString("zh-CN")}*
`;
}

/**
 * 从文档URL提取文本内容
 */
async function extractDocumentText(url: string, mimeType: string): Promise<string> {
  // 根据文件类型选择不同的解析方法
  if (mimeType === "application/pdf") {
    return await extractPDFText(url);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType === "application/msword"
  ) {
    return await extractWordText(url);
  } else if (
    mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mimeType === "application/vnd.ms-excel"
  ) {
    return await extractExcelText(url);
  }

  return "";
}

/**
 * 提取PDF文本内容
 */
async function extractPDFText(url: string): Promise<string> {
  try {
    // 下载PDF文件
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用pdf-parse库解析PDF
    const pdfParse = await import("pdf-parse");
    const data = await (pdfParse as any)(buffer);

    return data.text;
  } catch (error) {
    console.error("PDF extraction error:", error);
    throw new Error("PDF解析失败");
  }
}

/**
 * 提取Word文档文本内容
 */
async function extractWordText(url: string): Promise<string> {
  try {
    // 下载Word文件
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用mammoth库解析Word文档
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });

    return result.value;
  } catch (error) {
    console.error("Word extraction error:", error);
    throw new Error("Word文档解析失败");
  }
}

/**
 * 提取Excel文本内容
 */
async function extractExcelText(url: string): Promise<string> {
  try {
    // 下载Excel文件
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 使用xlsx库解析Excel
    const XLSX = await import("xlsx");
    const workbook = XLSX.read(buffer, { type: "buffer" });

    let text = "";
    workbook.SheetNames.forEach((sheetName: string) => {
      const sheet = workbook.Sheets[sheetName];
      text += `\n\n=== ${sheetName} ===\n\n`;
      text += XLSX.utils.sheet_to_txt(sheet);
    });

    return text;
  } catch (error) {
    console.error("Excel extraction error:", error);
    throw new Error("Excel解析失败");
  }
}
