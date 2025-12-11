import PDFDocument from 'pdfkit';
import fs from 'fs';
import { Readable } from 'stream';
import path from 'path';

interface Message {
  role: string;
  content: string;
}

/**
 * Generate a professional PDF from conversation messages
 */
export async function generatePDF(
  messages: Message[],
  title: string,
  documentType: "heavy" | "medium" | "light" = "medium"
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: title,
        Author: '泽思AI商业智库',
        Subject: 'AI咨询对话记录',
      },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Colors
    const primaryColor = '#7C3AED';
    const textColor = '#1F2937';
    const lightGray = '#F3F4F6';

    // Register fonts using dynamic path resolution
    const fontsDir = path.join(process.cwd(), 'assets', 'fonts');
    const normalFontPath = path.join(fontsDir, 'SourceHanSansSC-Normal.otf');
    const boldFontPath = path.join(fontsDir, 'SourceHanSansSC-Bold.otf');
    
    // Check if font files exist
    if (!fs.existsSync(normalFontPath)) {
      throw new Error(`Font file not found: ${normalFontPath}`);
    }
    if (!fs.existsSync(boldFontPath)) {
      throw new Error(`Font file not found: ${boldFontPath}`);
    }
    
    doc.registerFont('SourceHanSans-Normal', normalFontPath);
    doc.registerFont('SourceHanSans-Bold', boldFontPath);

    // 根据文档类型生成不同的封面
    generatePDFCoverPage(doc, title, documentType, primaryColor);

    doc
      .fillColor('#FFFFFF')
      .fontSize(32)
      .font('SourceHanSans-Bold')
      .text(title, 50, 150, { width: doc.page.width - 100 });

        doc
      .fontSize(16)
      .font('SourceHanSans-Normal')
      .text('泽思AI商业智库 | Zenith.ai', 50, 200);

    doc
      .fontSize(12)
      .text(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, 50, 230);

    // Move to content area
    doc.moveDown(8);

    // Process messages
    for (const msg of messages) {
      // Check if we need a new page
      if (doc.y > doc.page.height - 150) {
        doc.addPage();
      }

      if (msg.role === 'user') {
        // User question header
        doc
          .rect(40, doc.y - 5, doc.page.width - 80, 30)
          .fill(lightGray);

        doc
          .fillColor(primaryColor)
          .fontSize(14)
          .font('SourceHanSans-Bold')
          .text('用户问题:', 50, doc.y + 5);

        doc.moveDown(0.5);

        // Question content
        const cleanContent = cleanMarkdown(msg.content);
        doc
          .fillColor(textColor)
          .fontSize(12)
          .font('SourceHanSans-Normal')
          .lineGap(4) // Add line gap for better readability
          .text(cleanContent, 50, doc.y, {
            width: doc.page.width - 100,
            align: 'left',
          });

        doc.moveDown(1);
      } else {
        // AI answer header
        doc
          .rect(40, doc.y - 5, doc.page.width - 80, 30)
          .fillOpacity(0.1)
          .fill(primaryColor)
          .fillOpacity(1);

        doc
          .fillColor(primaryColor)
          .fontSize(14)
          .font('SourceHanSans-Bold')
          .text('AI 顾问回复:', 50, doc.y + 5);

        doc.moveDown(0.5);

        // Answer content
        const cleanContent = cleanMarkdown(msg.content);
        doc
          .fillColor(textColor)
          .fontSize(11)
          .font('SourceHanSans-Normal')
          .lineGap(4) // Add line gap for better readability
          .text(cleanContent, 50, doc.y, {
            width: doc.page.width - 100,
            align: 'left',
          });

        doc.moveDown(1.5);
      }
    }

    // Add footer to all pages
    const range = doc.bufferedPageRange();
    for (let i = 0; i < range.count; i++) {
      doc.switchToPage(range.start + i);
      doc
        .fillColor('#999999')
        .fontSize(10)
        .font('SourceHanSans-Normal')
        .text(
          `泽思AI商业智库 | 第 ${i + 1} 页`,
          50,
          doc.page.height - 50,
          { align: 'left' }
        );
    }

    doc.end();
  });
}

/**
 * 生成PDF封面页
 */
function generatePDFCoverPage(
  doc: PDFKit.PDFDocument,
  title: string,
  documentType: "heavy" | "medium" | "light",
  primaryColor: string
): void {
  const currentDate = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (documentType === "heavy") {
    // McKinsey风格封面（重度文档）
    // 顶部装饰栏
    doc
      .rect(0, 0, doc.page.width, 300)
      .fill(primaryColor);

    // 主标题
    doc
      .fillColor('#FFFFFF')
      .fontSize(36)
      .font('SourceHanSans-Bold')
      .text(title, 50, 120, { width: doc.page.width - 100, align: 'center' });

    // 公司名称
    doc
      .fontSize(18)
      .font('SourceHanSans-Normal')
      .text('泽思AI商业智库 | Zenith.ai', 50, 200, { width: doc.page.width - 100, align: 'center' });

    // 日期
    doc
      .fontSize(14)
      .text(currentDate, 50, 240, { width: doc.page.width - 100, align: 'center' });

    // 底部装饰线
    doc
      .moveTo(50, 280)
      .lineTo(doc.page.width - 50, 280)
      .strokeColor('#FFFFFF')
      .lineWidth(2)
      .stroke();

  } else if (documentType === "medium") {
    // 简洁专业封面（中度文档）
    doc
      .rect(0, 0, doc.page.width, 200)
      .fill(primaryColor);

    doc
      .fillColor('#FFFFFF')
      .fontSize(32)
      .font('SourceHanSans-Bold')
      .text(title, 50, 80, { width: doc.page.width - 100, align: 'center' });

    doc
      .fontSize(14)
      .font('SourceHanSans-Normal')
      .text('泽思AI商业智库', 50, 140, { width: doc.page.width - 100, align: 'center' });

    doc
      .fontSize(12)
      .text(currentDate, 50, 165, { width: doc.page.width - 100, align: 'center' });

  } else {
    // 极简封面（轻度文档）
    doc
      .rect(0, 0, doc.page.width, 150)
      .fill('#F3F4F6');

    doc
      .fillColor('#1F2937')
      .fontSize(28)
      .font('SourceHanSans-Bold')
      .text(title, 50, 60, { width: doc.page.width - 100, align: 'center' });

    doc
      .fontSize(12)
      .font('SourceHanSans-Normal')
      .fillColor('#6B7280')
      .text(currentDate, 50, 110, { width: doc.page.width - 100, align: 'center' });
  }
}

/**
 * Clean markdown formatting from text
 */
function cleanMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, '[代码块]')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim();
}
