import { describe, it, expect, beforeAll } from "vitest";
import { documentManager } from "./documentManager";
import { generateWordDocument } from "./wordGenerator";
import { generatePDF } from "./pdfGenerator";
import { getDb } from "./db";
import { users, conversations, messages, agents } from "../drizzle/schema";
import fs from "fs";
import path from "path";

describe("文档生成功能测试", () => {
  let testUserId: number;
  let testConversationId: number;
  let testMessageId: number;
  let testAgentId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 创建测试用户
    const userResult = await db.insert(users).values({
      openId: `test_doc_user_${Date.now()}`,
      email: `test_doc_${Date.now()}@test.com`,
      name: "文档测试用户",
      creditsPurchased: 1000, // 给足够的积分
      creditsSubscription: 500,
    });
    testUserId = userResult[0].insertId;

    // 创建测试Agent
    const agentResult = await db.insert(agents).values({
      name: "测试顾问",
      description: "测试用顾问",
      icon: "briefcase",
      systemPrompt: "你是一个测试顾问",
      inputFields: "[]",
    });
    testAgentId = agentResult[0].insertId;

    // 创建测试对话
    const convResult = await db.insert(conversations).values({
      userId: testUserId,
      agentId: testAgentId,
      title: "测试对话",
    });
    testConversationId = convResult[0].insertId;

    // 创建测试消息
    const msgResult = await db.insert(messages).values({
      conversationId: testConversationId,
      role: "assistant",
      content: `# 商业计划书

## 执行摘要
这是一份完整的商业计划书，包含市场分析、竞争策略、财务预测等内容。

## 市场分析
- 目标市场规模：100亿元
- 年增长率：25%
- 主要客户群体：中小企业

## 竞争策略
**差异化优势：**
1. 技术领先
2. 服务优质
3. 价格合理

## 财务预测
预计第一年营收：1000万元
预计第二年营收：3000万元
预计第三年营收：8000万元`,
    });
    testMessageId = msgResult[0].insertId;
  });

  it("1. 应该正确检查用户积分", async () => {
    const result = await documentManager.checkDocumentCredits(testUserId, "heavy");
    
    expect(result.sufficient).toBe(true);
    expect(result.required).toBe(200);
    expect(result.current).toBeGreaterThanOrEqual(200);
  });

  it("2. 应该成功创建文档记录", async () => {
    const documentId = await documentManager.createDocumentRecord({
      userId: testUserId,
      conversationId: testConversationId,
      agentId: testAgentId,
      fileId: "test_business_plan",
      fileName: "商业计划书（完整版）.docx",
      format: "word",
      fileType: "heavy",
    });

    expect(documentId).toBeGreaterThan(0);

    // 验证记录是否创建成功
    const doc = await documentManager.getDocumentById(documentId);
    expect(doc).toBeDefined();
    expect(doc?.fileName).toBe("商业计划书（完整版）.docx");
    expect(doc?.status).toBe("pending");
  });

  it("3. 应该成功生成Word文档", async () => {
    const content = `# 测试商业计划书

## 第一章 项目概述
这是一个测试项目。

## 第二章 市场分析
- 市场规模大
- 增长潜力高
- 竞争激烈

## 第三章 财务预测
**收入预测：**
1. 第一年：100万
2. 第二年：300万
3. 第三年：800万`;

    const buffer = await generateWordDocument({
      title: "测试商业计划书",
      content,
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(1000); // Word文档至少1KB

    // 保存到临时文件验证
    const tempPath = path.join("/tmp", `test_word_${Date.now()}.docx`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);
    
    console.log(`✅ Word文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   临时文件: ${tempPath}`);
  });

  it("4. 应该成功生成PDF文档", async () => {
    const messages = [
      {
        role: "assistant",
        content: `# 战略规划报告

## 愿景与使命
成为行业领导者

## 战略目标
1. 市场份额提升到30%
2. 年营收增长50%
3. 客户满意度达到95%

## 实施路径
**短期目标（1年）：**
- 完善产品线
- 扩大销售团队
- 提升品牌知名度

**中期目标（3年）：**
- 进入新市场
- 建立战略合作
- 实现盈利增长`,
      },
    ];

    const buffer = await generatePDF(messages, "战略规划报告");

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(5000); // PDF至少5KB

    // 保存到临时文件验证
    const tempPath = path.join("/tmp", `test_pdf_${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);

    console.log(`✅ PDF文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   临时文件: ${tempPath}`);
  });

  it("5. 应该正确扣除文档生成积分", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // 获取扣除前的积分
    const userBefore = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    const creditsBefore = (userBefore[0].creditsPurchased || 0) + (userBefore[0].creditsSubscription || 0);

    // 创建新的文档记录并扣除积分
    const documentId = await documentManager.createDocumentRecord({
      userId: testUserId,
      conversationId: testConversationId,
      agentId: testAgentId,
      fileId: "test_deduct_credits",
      fileName: "积分测试文档.pdf",
      format: "pdf",
      fileType: "medium", // 140积分
    });

    await documentManager.deductDocumentCredits(
      testUserId,
      "medium",
      documentId,
      "积分测试文档.pdf"
    );

    // 获取扣除后的积分
    const userAfter = await db.select().from(users).where(eq(users.id, testUserId)).limit(1);
    const creditsAfter = (userAfter[0].creditsPurchased || 0) + (userAfter[0].creditsSubscription || 0);

    expect(creditsBefore - creditsAfter).toBe(140);
    console.log(`✅ 积分扣除成功: ${creditsBefore} → ${creditsAfter} (扣除140积分)`);
  });

  it("6. 应该正确识别重复文档（避免重复扣费）", async () => {
    // 第一次创建文档
    const doc1Id = await documentManager.createDocumentRecord({
      userId: testUserId,
      conversationId: testConversationId,
      agentId: testAgentId,
      fileId: "duplicate_test",
      fileName: "重复测试.docx",
      format: "word",
      fileType: "light",
    });

    // 模拟完成状态
    await documentManager.updateDocumentCompleted(
      doc1Id,
      "https://example.com/test.docx",
      10240
    );

    // 尝试查找已存在的文档
    const existing = await documentManager.findExistingDocument(
      testUserId,
      testConversationId,
      "duplicate_test",
      "word"
    );

    expect(existing).toBeDefined();
    expect(existing?.id).toBe(doc1Id);
    expect(existing?.fileName).toBe("重复测试.docx");
    console.log(`✅ 重复文档识别成功，避免重复扣费`);
  });

  it("7. 应该验证文档定价配置", () => {
    expect(documentManager.DOCUMENT_PRICING.heavy).toBe(200);
    expect(documentManager.DOCUMENT_PRICING.medium).toBe(140);
    expect(documentManager.DOCUMENT_PRICING.light).toBe(100);
    expect(documentManager.DOCUMENT_EXPIRY_DAYS).toBe(7);
    console.log(`✅ 文档定价配置正确: 重度200/中度140/轻度100积分，有效期7天`);
  });
});

// 导入eq函数
import { eq } from "drizzle-orm";
