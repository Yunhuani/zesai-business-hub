import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
  TableOfContents,
  Header,
  Footer,
  PageNumber,
  NumberFormat,
  BorderStyle,
} from "docx";

/**
 * Word文档生成器（McKinsey风格）
 * 支持三种文档类型的专业排版：重度、中度、轻度
 */

export interface WordGeneratorOptions {
  title: string;
  content: string;
  author?: string;
  company?: string;
  documentType?: "heavy" | "medium" | "light";
  subtitle?: string;
}

/**
 * 生成Word文档Buffer
 */
export async function generateWordDocument(
  options: WordGeneratorOptions
): Promise<Buffer> {
  const {
    title,
    content,
    author = "泽思 Zenith AI",
    company = "泽思 Zenith AI",
    documentType = "medium",
    subtitle,
  } = options;

  // 解析Markdown内容为段落
  const contentParagraphs = parseMarkdownToParagraphs(content);

  // 根据文档类型生成不同的封面
  const coverPage = generateCoverPage(title, subtitle, company, documentType);

  // 根据文档类型决定是否添加目录
  const tocSection = shouldIncludeTOC(documentType)
    ? [
        new Paragraph({
          text: "目录",
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        new TableOfContents("目录", {
          hyperlink: true,
          headingStyleRange: "1-3",
        }),
        new Paragraph({
          text: "",
          pageBreakBefore: true,
        }),
      ]
    : [];

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
        headers: generateHeaders(title, documentType),
        footers: generateFooters(documentType),
        children: [...coverPage, ...tocSection, ...contentParagraphs],
      },
    ],
  });

  // 生成Buffer
  const buffer = await Packer.toBuffer(doc);
  return buffer;
}

/**
 * 生成封面页
 */
function generateCoverPage(
  title: string,
  subtitle: string | undefined,
  company: string,
  documentType: "heavy" | "medium" | "light"
): Paragraph[] {
  const currentDate = new Date().toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  if (documentType === "heavy") {
    // McKinsey风格封面（重度文档）
    return [
      // 顶部装饰线
      new Paragraph({
        border: {
          top: {
            color: "2E5090",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 24,
          },
        },
        spacing: { after: 800 },
      }),
      // 主标题
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 56,
            color: "1F3864",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      // 副标题（如果有）
      ...(subtitle
        ? [
            new Paragraph({
              children: [
                new TextRun({
                  text: subtitle,
                  size: 32,
                  color: "5B7FA8",
                  italics: true,
                }),
              ],
              alignment: AlignmentType.CENTER,
              spacing: { after: 600 },
            }),
          ]
        : [
            new Paragraph({
              text: "",
              spacing: { after: 600 },
            }),
          ]),
      // 中间空白
      new Paragraph({
        text: "",
        spacing: { after: 1200 },
      }),
      // 公司名称
      new Paragraph({
        children: [
          new TextRun({
            text: company,
            size: 28,
            color: "2E5090",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      // 日期
      new Paragraph({
        children: [
          new TextRun({
            text: currentDate,
            size: 24,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      // 底部装饰线
      new Paragraph({
        border: {
          bottom: {
            color: "2E5090",
            space: 1,
            style: BorderStyle.SINGLE,
            size: 24,
          },
        },
        spacing: { after: 400 },
      }),
      // 分页
      new Paragraph({
        text: "",
        pageBreakBefore: true,
      }),
    ];
  } else if (documentType === "medium") {
    // 简洁专业封面（中度文档）
    return [
      new Paragraph({
        text: "",
        spacing: { after: 1600 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 48,
            color: "1F3864",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 800 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: company,
            size: 24,
            color: "666666",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: currentDate,
            size: 20,
            color: "999999",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: "",
        pageBreakBefore: true,
      }),
    ];
  } else {
    // 极简封面（轻度文档）
    return [
      new Paragraph({
        text: "",
        spacing: { after: 800 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: title,
            bold: true,
            size: 40,
            color: "333333",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: currentDate,
            size: 20,
            color: "999999",
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 },
      }),
      new Paragraph({
        text: "",
        pageBreakBefore: true,
      }),
    ];
  }
}

/**
 * 判断是否需要目录
 */
function shouldIncludeTOC(documentType: "heavy" | "medium" | "light"): boolean {
  return documentType === "heavy" || documentType === "medium";
}

/**
 * 生成页眉
 */
function generateHeaders(
  title: string,
  documentType: "heavy" | "medium" | "light"
): { default: Header } {
  if (documentType === "heavy") {
    // 重度文档：显示章节标题（这里简化为文档标题）
    return {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                size: 18,
                color: "666666",
              }),
            ],
            alignment: AlignmentType.LEFT,
            border: {
              bottom: {
                color: "CCCCCC",
                space: 1,
                style: BorderStyle.SINGLE,
                size: 6,
              },
            },
          }),
        ],
      }),
    };
  } else if (documentType === "medium") {
    // 中度文档：显示文档标题
    return {
      default: new Header({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: title,
                size: 16,
                color: "999999",
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
      }),
    };
  } else {
    // 轻度文档：无页眉
    return {
      default: new Header({
        children: [new Paragraph({ text: "" })],
      }),
    };
  }
}

/**
 * 生成页脚
 */
function generateFooters(
  documentType: "heavy" | "medium" | "light"
): { default: Footer } {
  if (documentType === "heavy" || documentType === "medium") {
    // 重度和中度文档：页码居中
    return {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                children: ["第 ", PageNumber.CURRENT, " 页"],
                size: 18,
                color: "666666",
              }),
            ],
          }),
        ],
      }),
    };
  } else {
    // 轻度文档：简单页码
    return {
      default: new Footer({
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                children: [PageNumber.CURRENT],
                size: 16,
                color: "999999",
              }),
            ],
          }),
        ],
      }),
    };
  }
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
