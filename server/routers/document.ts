import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";
import { TRPCError } from "@trpc/server";

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
    })
});

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
