import { eq, and } from "drizzle-orm";
import { getDb } from "./db";
import { generatedDocuments } from "../drizzle/schema";
import { getUserCredits, deductCredits } from "./creditsManager";

/**
 * 文档类型定义
 */
export type DocumentType = "heavy" | "medium" | "light";

/**
 * 文件格式定义
 */
export type FileFormat = "word" | "pdf";

/**
 * 文件ID定义（用于标识不同类型的文档）
 */
export type FileId = string; // e.g., "business_plan", "strategy_report"

/**
 * 文档定价配置（积分）
 * 重度文档：商业计划书、战略报告等 - 200积分
 * 中度文档：分析报告、方案等 - 140积分
 * 轻度文档：清单、问答等 - 100积分
 */
export const DOCUMENT_PRICING: Record<DocumentType, number> = {
  heavy: 200,
  medium: 140,
  light: 100,
};

/**
 * 文档有效期（天）
 */
export const DOCUMENT_EXPIRY_DAYS = 7;

/**
 * 检查用户是否有足够积分生成文档
 */
export async function checkDocumentCredits(
  userId: number,
  documentType: DocumentType
): Promise<{ sufficient: boolean; required: number; current: number }> {
  const required = DOCUMENT_PRICING[documentType];
  const credits = await getUserCredits(userId);
  const current = credits.total;

  return {
    sufficient: current >= required,
    required,
    current,
  };
}

/**
 * 检查文档是否已存在且未过期（避免重复扣费）
 */
export async function findExistingDocument(
  userId: number,
  conversationId: number,
  fileId: string,
  format: FileFormat
): Promise<{ id: number; fileUrl: string; fileName: string } | null> {
  const db = await getDb();
  if (!db) return null;

  const now = new Date();
  const docs = await db
    .select()
    .from(generatedDocuments)
    .where(
      and(
        eq(generatedDocuments.userId, userId),
        eq(generatedDocuments.conversationId, conversationId),
        eq(generatedDocuments.fileId, fileId),
        eq(generatedDocuments.format, format),
        eq(generatedDocuments.status, "completed")
      )
    )
    .limit(1);

  if (docs.length === 0) return null;

  const doc = docs[0];
  // 检查是否过期
  if (doc.expiresAt && doc.expiresAt < now) {
    return null;
  }

  return {
    id: doc.id,
    fileUrl: doc.fileUrl || "",
    fileName: doc.fileName,
  };
}

/**
 * 创建文档生成记录
 */
export async function createDocumentRecord(params: {
  userId: number;
  conversationId: number;
  agentId: number;
  fileId: string;
  fileName: string;
  format: FileFormat;
  fileType: DocumentType;
}): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const creditsDeducted = DOCUMENT_PRICING[params.fileType];
  const now = new Date();
  const expiresAt = new Date(now.getTime() + DOCUMENT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  const result = await db.insert(generatedDocuments).values({
    userId: params.userId,
    conversationId: params.conversationId,
    agentId: params.agentId,
    fileId: params.fileId,
    fileName: params.fileName,
    format: params.format,
    fileType: params.fileType,
    status: "pending",
    creditsDeducted,
    expiresAt,
  });

  return result[0].insertId;
}

/**
 * 更新文档状态为生成中
 */
export async function updateDocumentGenerating(documentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(generatedDocuments)
    .set({ status: "generating" })
    .where(eq(generatedDocuments.id, documentId));
}

/**
 * 更新文档为已完成，保存S3 URL
 */
export async function updateDocumentCompleted(
  documentId: number,
  fileUrl: string,
  fileSize: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(generatedDocuments)
    .set({
      status: "completed",
      fileUrl,
      fileSize,
    })
    .where(eq(generatedDocuments.id, documentId));
}

/**
 * 更新文档为失败状态
 */
export async function updateDocumentFailed(
  documentId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(generatedDocuments)
    .set({
      status: "failed",
    })
    .where(eq(generatedDocuments.id, documentId));
}

/**
 * 扣除文档生成积分
 */
export async function deductDocumentCredits(
  userId: number,
  documentType: DocumentType,
  documentId: number,
  fileName: string
): Promise<void> {
  const credits = DOCUMENT_PRICING[documentType];
  await deductCredits(
    userId,
    credits,
    `生成文档：${fileName}`
  );
}

/**
 * 获取文档详情
 */
export async function getDocumentById(documentId: number) {
  const db = await getDb();
  if (!db) return null;

  const docs = await db
    .select()
    .from(generatedDocuments)
    .where(eq(generatedDocuments.id, documentId))
    .limit(1);

  return docs.length > 0 ? docs[0] : null;
}

export const documentManager = {
  checkDocumentCredits,
  findExistingDocument,
  createDocumentRecord,
  updateDocumentGenerating,
  updateDocumentCompleted,
  updateDocumentFailed,
  deductDocumentCredits,
  getDocumentById,
  DOCUMENT_PRICING,
  DOCUMENT_EXPIRY_DAYS,
};
