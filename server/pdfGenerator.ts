import PDFDocument from 'pdfkit';
import { Readable } from 'stream';

interface Message {
  role: string;
  content: string;
}

/**
 * Generate a professional PDF from conversation messages
 */
export async function generatePDF(
  messages: Message[],
  title: string
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

    // Title page
    doc
      .rect(0, 0, doc.page.width, 300)
      .fill(primaryColor);

    doc
      .fillColor('#FFFFFF')
      .fontSize(32)
      .font('Helvetica-Bold')
      .text(title, 50, 150, { width: doc.page.width - 100 });

    doc
      .fontSize(16)
      .font('Helvetica')
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
          .font('Helvetica-Bold')
          .text('用户问题:', 50, doc.y + 5);

        doc.moveDown(0.5);

        // Question content
        const cleanContent = cleanMarkdown(msg.content);
        doc
          .fillColor(textColor)
          .fontSize(12)
          .font('Helvetica')
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
          .font('Helvetica-Bold')
          .text('AI 顾问回复:', 50, doc.y + 5);

        doc.moveDown(0.5);

        // Answer content
        const cleanContent = cleanMarkdown(msg.content);
        doc
          .fillColor(textColor)
          .fontSize(11)
          .font('Helvetica')
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
      doc.switchToPage(i);
      doc
        .fillColor('#999999')
        .fontSize(10)
        .font('Helvetica')
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
