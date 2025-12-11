import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";
import { documentManager, type DocumentType, type FileFormat } from "../documentManager";
import { generateWordDocument } from "../wordGenerator";
import { generatePDF } from "../pdfGenerator";
import { invokeLLM } from "../_core/llm";
import { getMessageById } from "../db";

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

        // 6. 获取原始消息内容
        const message = await getMessageById(input.messageId);
        if (!message) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "消息不存在",
          });
        }

        // 7. 使用LLM扩展和完善文档内容
        const enhancedContent = await enhanceDocumentContent(
          message.content,
          input.fileName,
          input.documentType
        );

        // 8. 生成文档文件
        let fileBuffer: Buffer;
        let mimeType: string;

        if (input.format === "word") {
          fileBuffer = await generateWordDocument({
            title: input.fileName,
            content: enhancedContent,
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
            input.fileName
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
 * 使用LLM扩展和完善文档内容
 */
async function enhanceDocumentContent(
  originalContent: string,
  fileName: string,
  documentType: DocumentType
): Promise<string> {
  try {
    // 根据文档类型设定不同的扩展策略
    let enhancementPrompt = "";

    if (documentType === "heavy") {
      enhancementPrompt = `你是一位专业的商业顾问。请将以下内容扩展成一份完整的《${fileName}》文档。

要求：
1. 保持原有核心内容和逻辑结构
2. 扩展每个章节，添加更多细节和实例
3. 使用专业的商业语言和术语
4. 确保文档结构完整，包含引言、正文、总结
5. 使用Markdown格式，包含标题、列表、加粗等

原始内容：
${originalContent}`;
    } else if (documentType === "medium") {
      enhancementPrompt = `你是一位专业的商业分析师。请将以下内容整理成一份结构化的《${fileName}》文档。

要求：
1. 保持原有内容的完整性
2. 优化文档结构，使其更易读
3. 添加适当的分段和标题
4. 使用Markdown格式

原始内容：
${originalContent}`;
    } else {
      // light
      enhancementPrompt = `请将以下内容整理成一份清晰的《${fileName}》文档。

要求：
1. 保持原有内容
2. 优化格式，使其更易读
3. 使用Markdown格式

原始内容：
${originalContent}`;
    }

    const response = await invokeLLM({
      messages: [
        {
          role: "user",
          content: enhancementPrompt,
        },
      ],
    });

    const content = response.choices[0].message.content;
    // content可能是string或数组，需要处理
    if (typeof content === "string") {
      return content || originalContent;
    } else if (Array.isArray(content)) {
      // 如果是数组，提取所有text内容
      return content
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join("\n") || originalContent;
    }
    return originalContent;
  } catch (error) {
    console.error("Content enhancement error:", error);
    // 如果LLM失败，返回原始内容
    return originalContent;
  }
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
