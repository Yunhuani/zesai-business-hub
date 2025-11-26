import PptxGenJS from 'pptxgenjs';

interface Message {
  role: string;
  content: string;
}

/**
 * Generate a professional PPT from conversation messages
 */
export async function generatePPT(
  messages: Message[],
  title: string
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  
  // Set presentation properties
  pptx.author = '泽思AI商业智库';
  pptx.company = 'Zenith.ai';
  pptx.title = title;
  
  // Define colors
  const colors = {
    primary: '7C3AED', // Purple
    secondary: '3B82F6', // Blue
    text: '1F2937',
    lightBg: 'F3F4F6',
  };
  
  // Add title slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { fill: colors.primary };
  
  titleSlide.addText(title, {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });
  
  titleSlide.addText('泽思AI商业智库 | Zenith.ai', {
    x: 0.5,
    y: 4.2,
    w: 9,
    h: 0.5,
    fontSize: 18,
    color: 'FFFFFF',
    align: 'center',
  });
  
  titleSlide.addText(new Date().toLocaleDateString('zh-CN'), {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.4,
    fontSize: 14,
    color: 'FFFFFF',
    align: 'center',
  });
  
  // Process assistant messages
  for (const msg of messages) {
    if (msg.role === 'assistant') {
      // Extract sections from the message
      const sections = extractSections(msg.content);
      
      for (const section of sections) {
        const slide = pptx.addSlide();
        slide.background = { fill: 'FFFFFF' };
        
        // Add header with gradient
        slide.addShape(pptx.ShapeType.rect, {
          x: 0,
          y: 0,
          w: 10,
          h: 1,
          fill: { type: 'solid', color: colors.primary },
        });
        
        // Add title
        slide.addText(section.title, {
          x: 0.5,
          y: 0.2,
          w: 9,
          h: 0.6,
          fontSize: 28,
          bold: true,
          color: 'FFFFFF',
        });
        
        // Add content
        const contentLines = formatContent(section.content);
        
        slide.addText(contentLines, {
          x: 0.5,
          y: 1.5,
          w: 9,
          h: 4,
          fontSize: 16,
          color: colors.text,
          valign: 'top',
        });
        
        // Add footer
        slide.addText('泽思AI商业智库', {
          x: 0.5,
          y: 7,
          w: 4.5,
          h: 0.3,
          fontSize: 10,
          color: '9CA3AF',
        });
        
        slide.addText(`${new Date().toLocaleDateString('zh-CN')}`, {
          x: 5,
          y: 7,
          w: 4.5,
          h: 0.3,
          fontSize: 10,
          color: '9CA3AF',
          align: 'right',
        });
      }
    }
  }
  
  // Add closing slide
  const closingSlide = pptx.addSlide();
  closingSlide.background = { fill: colors.secondary };
  
  closingSlide.addText('感谢使用', {
    x: 0.5,
    y: 2.5,
    w: 9,
    h: 1,
    fontSize: 40,
    bold: true,
    color: 'FFFFFF',
    align: 'center',
  });
  
  closingSlide.addText('泽思AI商业智库', {
    x: 0.5,
    y: 3.8,
    w: 9,
    h: 0.8,
    fontSize: 32,
    color: 'FFFFFF',
    align: 'center',
  });
  
  closingSlide.addText('Zenith.ai', {
    x: 0.5,
    y: 4.8,
    w: 9,
    h: 0.5,
    fontSize: 20,
    color: 'FFFFFF',
    align: 'center',
  });
  
  // Generate PPT as buffer
  const pptData = await pptx.write({ outputType: 'nodebuffer' });
  return pptData as Buffer;
}

/**
 * Extract sections from markdown content
 */
function extractSections(content: string): Array<{ title: string; content: string }> {
  const sections: Array<{ title: string; content: string }> = [];
  const lines = content.split('\n');
  
  let currentTitle = '';
  let currentContent: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    // Track code blocks
    if (line.trim().startsWith('```')) {
      inCodeBlock = !inCodeBlock;
      currentContent.push(line);
      continue;
    }

    // Only treat as heading if not in code block
    if (!inCodeBlock && (line.startsWith('# ') || line.startsWith('## ') || line.startsWith('### '))) {
      // Save previous section if it has content
      if (currentTitle && currentContent.length > 0) {
        const contentText = currentContent.join('\n').trim();
        if (contentText && contentText.length > 10) {
          sections.push({
            title: currentTitle,
            content: contentText,
          });
        }
      }
      
      // Start new section
      currentTitle = line.replace(/^#+\s*/, '').trim();
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Save last section
  if (currentTitle && currentContent.length > 0) {
    const contentText = currentContent.join('\n').trim();
    if (contentText && contentText.length > 10) {
      sections.push({
        title: currentTitle,
        content: contentText,
      });
    }
  }

  // If no sections found, create sections from paragraphs
  if (sections.length === 0) {
    const paragraphs = content.split('\n\n').filter(p => p.trim() && p.trim().length > 20);
    paragraphs.slice(0, 10).forEach((para, index) => {
      const firstLine = para.split('\n')[0].substring(0, 60);
      sections.push({
        title: firstLine.length > 50 ? `要点 ${index + 1}` : firstLine,
        content: para,
      });
    });
  }

  // Limit to 20 slides to avoid too long presentations
  return sections.slice(0, 20);
}

/**
 * Format content for PPT slide
 */
function formatContent(content: string): string {
  // Remove markdown formatting
  let formatted = content
    .replace(/```[\s\S]*?```/g, '[代码块]') // Replace code blocks
    .replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold
    .replace(/\*(.+?)\*/g, '$1') // Remove italic
    .replace(/`(.+?)`/g, '$1') // Remove inline code
    .replace(/\[(.+?)\]\(.+?\)/g, '$1') // Remove links
    .replace(/^#+\s+/gm, '') // Remove headings
    .replace(/^[-*]\s+/gm, '• ') // Convert lists to bullets
    .replace(/^\d+\.\s+/gm, '• ') // Convert numbered lists to bullets
    .trim();
  
  // Limit length
  if (formatted.length > 500) {
    formatted = formatted.substring(0, 500) + '...';
  }
  
  return formatted;
}
