import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from "docx";

/**
 * Word文档生成器
 * 将Markdown格式的内容转换为专业的Word文档
 */

export interface WordGeneratorOptions {
  title: string;
  content: string;
  author?: string;
  company?: string;
}

/**
 * 生成Word文档Buffer
 */
export async function generateWordDocument(
  options: WordGeneratorOptions
): Promise<Buffer> {
  const { title, content, author = "泽思 Zenith AI", company = "泽思 Zenith AI" } = options;

  // 解析Markdown内容为段落
  const paragraphs = parseMarkdownToParagraphs(content);

  // 创建文档
  const doc = new Document({
    creator: author,
    title: title,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        children: [
          // 标题页
          new Paragraph({
            text: title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
          }),
          new Paragraph({
            text: `由 ${company} 生成`,
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 400,
            },
          }),
          new Paragraph({
            text: new Date().toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric",
            }),
            alignment: AlignmentType.CENTER,
            spacing: {
              after: 800,
            },
          }),
          // 内容段落
          ...paragraphs,
        ],
      },
    ],
  });

  // 生成Buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * 解析Markdown内容为Word段落
 */
function parseMarkdownToParagraphs(markdown: string): Paragraph[] {
  const lines = markdown.split("\n");
  const paragraphs: Paragraph[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // 跳过空行
    if (!line) {
      paragraphs.push(
        new Paragraph({
          text: "",
          spacing: { after: 200 },
        })
      );
      continue;
    }

    // 一级标题 (# Title)
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(2),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }

    // 二级标题 (## Title)
    if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(3),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 200 },
        })
      );
      continue;
    }

    // 三级标题 (### Title)
    if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(4),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 150 },
        })
      );
      continue;
    }

    // 无序列表 (- Item 或 * Item)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          text: line.substring(2),
          bullet: {
            level: 0,
          },
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // 有序列表 (1. Item)
    const numberedMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      paragraphs.push(
        new Paragraph({
          text: numberedMatch[2],
          numbering: {
            reference: "default-numbering",
            level: 0,
          },
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // 粗体文本 (**text**)
    const boldMatches = line.match(/\*\*(.+?)\*\*/g);
    if (boldMatches) {
      const children: TextRun[] = [];
      let remaining = line;

      boldMatches.forEach((match) => {
        const [before, ...rest] = remaining.split(match);
        if (before) {
          children.push(new TextRun({ text: before }));
        }
        children.push(
          new TextRun({
            text: match.replace(/\*\*/g, ""),
            bold: true,
          })
        );
        remaining = rest.join(match);
      });

      if (remaining) {
        children.push(new TextRun({ text: remaining }));
      }

      paragraphs.push(
        new Paragraph({
          children,
          spacing: { after: 150 },
        })
      );
      continue;
    }

    // 普通段落
    paragraphs.push(
      new Paragraph({
        text: line,
        spacing: { after: 150 },
      })
    );
  }

  return paragraphs;
}
