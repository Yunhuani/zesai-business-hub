import { describe, it, expect } from 'vitest';
import { generatePPT } from './pptGenerator';
import { generatePDF } from './pdfGenerator';

describe('Export Functions', () => {
  const testMessages = [
    {
      role: 'user',
      content: '请帮我生成一份AI教育SaaS平台的融资BP大纲',
    },
    {
      role: 'assistant',
      content: `# 融资BP大纲

## 一、项目概述
AI教育SaaS平台是一个创新的在线教育解决方案...

## 二、市场分析
- 市场规模：中国在线教育市场规模达5000亿
- 增长趋势：年复合增长率20%
- 目标用户：K12学生及家长

## 三、产品优势
1. **智能化教学**：AI驱动的个性化学习路径
2. **数据分析**：学习效果可视化
3. **师资优势**：顶级教师资源整合`,
    },
  ];

  it('should generate PPT successfully', async () => {
    const pptBuffer = await generatePPT(testMessages, '融资BP大纲');
    
    expect(pptBuffer).toBeInstanceOf(Buffer);
    expect(pptBuffer.length).toBeGreaterThan(0);
    
    // Check if it's a valid PPT file (starts with PK signature)
    expect(pptBuffer[0]).toBe(0x50); // 'P'
    expect(pptBuffer[1]).toBe(0x4B); // 'K'
  });

  it('should generate PDF successfully', async () => {
    const pdfBuffer = await generatePDF(testMessages, '融资BP大纲');
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Check if it's a valid PDF file (starts with %PDF)
    const header = pdfBuffer.toString('utf-8', 0, 4);
    expect(header).toBe('%PDF');
  });

  it('should handle Chinese characters in PPT', async () => {
    const chineseMessages = [
      { role: 'user', content: '你好，世界！这是中文测试。' },
      { role: 'assistant', content: '欢迎使用泽思AI商业智库！' },
    ];
    
    const pptBuffer = await generatePPT(chineseMessages, '中文测试');
    expect(pptBuffer).toBeInstanceOf(Buffer);
    expect(pptBuffer.length).toBeGreaterThan(0);
  });

  it('should handle Chinese characters in PDF', async () => {
    const chineseMessages = [
      { role: 'user', content: '你好，世界！这是中文测试。' },
      { role: 'assistant', content: '欢迎使用泽思AI商业智库！' },
    ];
    
    const pdfBuffer = await generatePDF(chineseMessages, '中文测试');
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });

  it('should handle long content in PPT', async () => {
    const longContent = '这是一段很长的内容。'.repeat(100);
    const longMessages = [
      { role: 'user', content: longContent },
      { role: 'assistant', content: longContent },
    ];
    
    const pptBuffer = await generatePPT(longMessages, '长内容测试');
    expect(pptBuffer).toBeInstanceOf(Buffer);
    expect(pptBuffer.length).toBeGreaterThan(0);
  });

  it('should handle long content in PDF', async () => {
    const longContent = '这是一段很长的内容。'.repeat(100);
    const longMessages = [
      { role: 'user', content: longContent },
      { role: 'assistant', content: longContent },
    ];
    
    const pdfBuffer = await generatePDF(longMessages, '长内容测试');
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
  });
});
