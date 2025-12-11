import { describe, it, expect } from "vitest";
import { generateWordDocument } from "./wordGenerator";
import { generatePDF } from "./pdfGenerator";
import fs from "fs";
import path from "path";

describe("文档排版效果测试", () => {
  const testContent = `# 商业计划书

## 执行摘要

本商业计划书旨在为投资者提供全面的项目概览，包括市场机会、竞争优势、财务预测等关键信息。

## 市场分析

### 目标市场

- **市场规模**：预计2025年市场规模达到100亿元
- **增长率**：年复合增长率25%
- **客户群体**：中小企业及个人用户

### 竞争格局

当前市场主要竞争者包括：

1. 竞争对手A：市场份额30%
2. 竞争对手B：市场份额25%
3. 竞争对手C：市场份额20%

## 产品与服务

### 核心产品

我们的核心产品具有以下**差异化优势**：

- 技术领先：采用最新AI技术
- 用户体验优秀：界面简洁直观
- 价格合理：性价比高

### 服务体系

提供7x24小时客户支持，确保用户满意度。

## 财务预测

### 收入预测

**未来三年收入预测：**

1. 第一年：1000万元
2. 第二年：3000万元
3. 第三年：8000万元

### 成本结构

- 研发成本：40%
- 市场推广：30%
- 运营成本：20%
- 其他：10%

## 团队介绍

核心团队成员均来自知名企业，拥有丰富的行业经验。

## 融资计划

本轮融资目标：5000万元
用途：产品研发、市场推广、团队扩充

## 总结

我们相信，凭借优秀的团队、创新的产品和清晰的战略，一定能够在市场中脱颖而出。`;

  it("1. 应该生成重度文档（McKinsey风格封面+目录+页眉页脚）", async () => {
    const buffer = await generateWordDocument({
      title: "商业计划书（完整版）",
      content: testContent,
      documentType: "heavy",
      company: "泽思 Zenith AI",
      subtitle: "科技创新项目融资方案",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(5000);

    // 保存到临时文件
    const tempPath = path.join("/tmp", `heavy_document_${Date.now()}.docx`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);

    console.log(`✅ 重度Word文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   特点：McKinsey风格封面、完整目录、页眉显示章节标题、页脚显示页码`);
    console.log(`   文件：${tempPath}`);
  });

  it("2. 应该生成中度文档（简洁封面+简化目录+页眉页脚）", async () => {
    const buffer = await generateWordDocument({
      title: "市场分析报告",
      content: testContent,
      documentType: "medium",
      company: "泽思 Zenith AI",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(4000);

    const tempPath = path.join("/tmp", `medium_document_${Date.now()}.docx`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);

    console.log(`✅ 中度Word文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   特点：简洁专业封面、简化目录、页眉显示文档标题、页脚显示页码`);
    console.log(`   文件：${tempPath}`);
  });

  it("3. 应该生成轻度文档（极简封面+无目录+仅页码）", async () => {
    const buffer = await generateWordDocument({
      title: "项目简报",
      content: testContent,
      documentType: "light",
      company: "泽思 Zenith AI",
    });

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(3000);

    const tempPath = path.join("/tmp", `light_document_${Date.now()}.docx`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);

    console.log(`✅ 轻度Word文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   特点：极简封面、无目录、无页眉、仅页脚显示页码`);
    console.log(`   文件：${tempPath}`);
  });

  it("4. 应该生成重度PDF文档（McKinsey风格封面）", async () => {
    const buffer = await generatePDF(
      [
        {
          role: "assistant",
          content: testContent,
        },
      ],
      "战略规划报告（完整版）",
      "heavy"
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(10000);

    const tempPath = path.join("/tmp", `heavy_pdf_${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);

    console.log(`✅ 重度PDF文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   特点：McKinsey风格封面，紫色装饰栏，专业排版`);
    console.log(`   文件：${tempPath}`);
  });

  it("5. 应该生成中度PDF文档（简洁封面）", async () => {
    const buffer = await generatePDF(
      [
        {
          role: "assistant",
          content: testContent,
        },
      ],
      "竞品分析报告",
      "medium"
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(8000);

    const tempPath = path.join("/tmp", `medium_pdf_${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);

    console.log(`✅ 中度PDF文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   特点：简洁专业封面，紫色装饰栏，标准排版`);
    console.log(`   文件：${tempPath}`);
  });

  it("6. 应该生成轻度PDF文档（极简封面）", async () => {
    const buffer = await generatePDF(
      [
        {
          role: "assistant",
          content: testContent,
        },
      ],
      "项目摘要",
      "light"
    );

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(6000);

    const tempPath = path.join("/tmp", `light_pdf_${Date.now()}.pdf`);
    fs.writeFileSync(tempPath, buffer);
    expect(fs.existsSync(tempPath)).toBe(true);

    console.log(`✅ 轻度PDF文档生成成功: ${(buffer.length / 1024).toFixed(2)}KB`);
    console.log(`   特点：极简封面，灰色背景，简洁排版`);
    console.log(`   文件：${tempPath}`);
  });

  it("7. 应该验证文档大小递减（重度>中度>轻度）", async () => {
    const heavyBuffer = await generateWordDocument({
      title: "测试文档",
      content: testContent,
      documentType: "heavy",
    });

    const mediumBuffer = await generateWordDocument({
      title: "测试文档",
      content: testContent,
      documentType: "medium",
    });

    const lightBuffer = await generateWordDocument({
      title: "测试文档",
      content: testContent,
      documentType: "light",
    });

    console.log(`📊 文档大小对比：`);
    console.log(`   重度：${(heavyBuffer.length / 1024).toFixed(2)}KB`);
    console.log(`   中度：${(mediumBuffer.length / 1024).toFixed(2)}KB`);
    console.log(`   轻度：${(lightBuffer.length / 1024).toFixed(2)}KB`);

    // 重度文档应该最大（包含封面、目录、页眉页脚）
    expect(heavyBuffer.length).toBeGreaterThan(mediumBuffer.length);
    // 中度文档应该比轻度大（包含目录）
    expect(mediumBuffer.length).toBeGreaterThan(lightBuffer.length);
  });
});
