import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

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
  const pdfDoc = await PDFDocument.create();
  
  // Load fonts
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  // Define colors
  const primaryColor = rgb(0.486, 0.227, 0.929); // Purple
  const textColor = rgb(0.122, 0.161, 0.216); // Dark gray
  const lightGray = rgb(0.953, 0.957, 0.965);
  
  // Add title page
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  
  // Title page background
  page.drawRectangle({
    x: 0,
    y: height - 300,
    width: width,
    height: 300,
    color: primaryColor,
  });
  
  // Title
  page.drawText(title, {
    x: 50,
    y: height - 200,
    size: 32,
    font: boldFont,
    color: rgb(1, 1, 1),
  });
  
  // Subtitle
  page.drawText('泽思AI商业智库 | Zenith.ai', {
    x: 50,
    y: height - 240,
    size: 16,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  // Date
  page.drawText(`生成日期: ${new Date().toLocaleDateString('zh-CN')}`, {
    x: 50,
    y: height - 270,
    size: 12,
    font: font,
    color: rgb(1, 1, 1),
  });
  
  // Process messages
  let currentY = height - 350;
  const margin = 50;
  const maxWidth = width - 2 * margin;
  const lineHeight = 20;
  
  for (const msg of messages) {
    // Check if we need a new page
    if (currentY < 100) {
      page = pdfDoc.addPage([595, 842]);
      currentY = height - 50;
    }
    
    if (msg.role === 'user') {
      // User question
      page.drawRectangle({
        x: margin - 10,
        y: currentY - 5,
        width: maxWidth + 20,
        height: 30,
        color: lightGray,
      });
      
      page.drawText('用户问题:', {
        x: margin,
        y: currentY + 5,
        size: 14,
        font: boldFont,
        color: primaryColor,
      });
      
      currentY -= 35;
      
      // Question content
      const questionLines = wrapText(msg.content, maxWidth, 12, font);
      for (const line of questionLines.slice(0, 5)) { // Limit to 5 lines
        if (currentY < 50) {
          page = pdfDoc.addPage([595, 842]);
          currentY = height - 50;
        }
        
        page.drawText(line, {
          x: margin,
          y: currentY,
          size: 12,
          font: font,
          color: textColor,
        });
        
        currentY -= lineHeight;
      }
      
      currentY -= 10;
    } else {
      // AI answer
      page.drawRectangle({
        x: margin - 10,
        y: currentY - 5,
        width: maxWidth + 20,
        height: 30,
        color: primaryColor,
        opacity: 0.1,
      });
      
      page.drawText('AI 顾问回复:', {
        x: margin,
        y: currentY + 5,
        size: 14,
        font: boldFont,
        color: primaryColor,
      });
      
      currentY -= 35;
      
      // Answer content
      const answerLines = wrapText(msg.content, maxWidth, 11, font);
      for (const line of answerLines.slice(0, 30)) { // Limit to 30 lines per answer
        if (currentY < 50) {
          page = pdfDoc.addPage([595, 842]);
          currentY = height - 50;
        }
        
        page.drawText(line, {
          x: margin,
          y: currentY,
          size: 11,
          font: font,
          color: textColor,
        });
        
        currentY -= lineHeight;
      }
      
      currentY -= 20;
    }
  }
  
  // Add footer to all pages
  const pages = pdfDoc.getPages();
  pages.forEach((p, index) => {
    p.drawText(`泽思AI商业智库 | 第 ${index + 1} 页`, {
      x: margin,
      y: 30,
      size: 10,
      font: font,
      color: rgb(0.6, 0.6, 0.6),
    });
  });
  
  // Generate PDF as buffer
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

/**
 * Wrap text to fit within a given width
 */
function wrapText(text: string, maxWidth: number, fontSize: number, font: any): string[] {
  // Remove markdown formatting
  const cleanText = text
    .replace(/```[\s\S]*?```/g, '[代码块]')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/`(.+?)`/g, '$1')
    .replace(/\[(.+?)\]\(.+?\)/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim();
  
  const words = cleanText.split(' ');
  const lines: string[] = [];
  let currentLine = '';
  
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    
    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  
  if (currentLine) {
    lines.push(currentLine);
  }
  
  return lines;
}
