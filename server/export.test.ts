import { describe, it, expect } from 'vitest';
import { generatePPT } from './pptGenerator';
import { generatePDF } from './pdfGenerator';
import fs from 'fs';
import path from 'path';

describe('Export Functions', () => {
  const testMessages = [
    {
      role: 'user',
      content: '我想开一家咖啡店，需要做哪些准备？',
    },
    {
      role: 'assistant',
      content: `# 开设咖啡店的准备工作

## 1. 市场调研

在开设咖啡店之前，需要进行充分的市场调研：

- 目标客户群体分析
- 竞争对手调查
- 选址考察

## 2. 资金准备

初期投资预算：

- 租金：每月2-5万元
- 装修：10-30万元
- 设备：15-25万元
- 原料：3-5万元

## 3. 证照办理

需要办理的证照包括：

1. 营业执照
2. 食品经营许可证
3. 消防许可证

## 4. 人员招聘

需要招聘的岗位：

- 店长1名
- 咖啡师2-3名
- 服务员2-3名`,
    },
    {
      role: 'user',
      content: '如何选择合适的地址？',
    },
    {
      role: 'assistant',
      content: `# 咖啡店选址策略

## 核心原则

选址是咖啡店成功的关键因素之一。

## 优质地段特征

1. **人流量大**：商业区、写字楼、大学城
2. **目标客户集中**：白领、学生、文艺青年
3. **交通便利**：地铁站、公交站附近
4. **停车方便**：有停车位或附近有停车场

## 成本考虑

- 租金占比不超过营业额的20%
- 转让费合理
- 租期稳定（至少3-5年）`,
    },
  ];

  it('should generate PPT successfully', async () => {
    const pptBuffer = await generatePPT(testMessages, '咖啡店创业指南');
    
    expect(pptBuffer).toBeInstanceOf(Buffer);
    expect(pptBuffer.length).toBeGreaterThan(0);
    
    // Save to file for manual inspection
    const outputPath = path.join(__dirname, '../test-output.pptx');
    fs.writeFileSync(outputPath, pptBuffer);
    console.log(`PPT saved to: ${outputPath}`);
    
    // Verify it's a valid PPTX file (starts with PK signature)
    const signature = pptBuffer.toString('hex', 0, 2);
    expect(signature).toBe('504b'); // PK signature
  }, 30000);

  it('should generate PDF successfully', async () => {
    const pdfBuffer = await generatePDF(testMessages, '咖啡店创业指南');
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Save to file for manual inspection
    const outputPath = path.join(__dirname, '../test-output.pdf');
    fs.writeFileSync(outputPath, pdfBuffer);
    console.log(`PDF saved to: ${outputPath}`);
    
    // Verify it's a valid PDF file
    const signature = pdfBuffer.toString('utf8', 0, 5);
    expect(signature).toBe('%PDF-');
  }, 30000);

  it('should handle empty messages', async () => {
    await expect(generatePPT([], '空对话')).rejects.toThrow();
  });

  it('should handle long content', async () => {
    const longMessages = [
      {
        role: 'user',
        content: '请详细介绍一下商业计划书的内容。',
      },
      {
        role: 'assistant',
        content: '这是一段很长的内容。'.repeat(1000),
      },
    ];
    
    const pptBuffer = await generatePPT(longMessages, '长内容测试');
    expect(pptBuffer).toBeInstanceOf(Buffer);
    expect(pptBuffer.length).toBeGreaterThan(0);
  }, 30000);
});
