/**
 * PPT Content Structurer
 * Uses LLM to convert raw text into structured PPT outline JSON
 */
import { invokeLLM } from './_core/llm';

// Layout types for different slide designs
export type SlideLayout = 
  | 'title'           // Title slide (cover)
  | 'section'         // Section divider
  | 'text_only'       // Text content only
  | 'two_column'      // Two column layout
  | 'key_points'      // Bullet points / key points
  | 'comparison'      // Side by side comparison
  | 'timeline'        // Timeline / process flow
  | 'data_highlight'  // Big number / data emphasis
  | 'closing';        // Closing slide

export interface SlidePoint {
  title: string;
  description: string;
}

export interface SlideOutline {
  slideIndex: number;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  points?: SlidePoint[];
  leftColumn?: SlidePoint[];
  rightColumn?: SlidePoint[];
  highlightNumber?: string;
  highlightLabel?: string;
  footerNote?: string;
}

export interface PPTOutline {
  presentationTitle: string;
  presentationSubtitle: string;
  slides: SlideOutline[];
}

const SYSTEM_PROMPT = `你是一位顶级PPT内容策划师，擅长将文本转化为视觉冲击力强的演示文稿。

核心原则：
1. 每一页都必须有实质内容，禁止出现只有标题没有内容的空页
2. 设计10-15页幻灯片（含封面和结束页），宁精勿多
3. section分隔页最多使用1-2个，且必须包含subtitle描述该章节概要
4. 优先使用key_points、two_column、comparison、data_highlight、timeline等内容丰富的布局
5. 每页要点3-4个，每个要点的description至少20字，信息密度要高
6. 如果原文有数字数据，必须用data_highlight布局突出展示
7. 标题要精炼有力，避免简单重复原文章节标题

布局类型：
- title: 封面页（主标题+副标题）
- section: 章节分隔页（必须有subtitle，尽量少用）
- text_only: 纯文本页
- two_column: 双栏布局（对比/并列信息，左右各2-3个要点）
- key_points: 要点列表页（3-4个核心观点）
- comparison: 对比页（左右对比）
- timeline: 时间线/流程页（3-5个阶段）
- data_highlight: 数据突出页（highlightNumber+highlightLabel+补充points）
- closing: 结束页

严格按JSON Schema输出。`;

const OUTPUT_SCHEMA = {
  name: 'ppt_outline',
  schema: {
    type: 'object',
    properties: {
      presentationTitle: { type: 'string', description: '演示文稿主标题' },
      presentationSubtitle: { type: 'string', description: '副标题或描述' },
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slideIndex: { type: 'number', description: '幻灯片序号，从0开始' },
            layout: { 
              type: 'string', 
              enum: ['title', 'section', 'text_only', 'two_column', 'key_points', 'comparison', 'timeline', 'data_highlight', 'closing'],
              description: '布局类型'
            },
            title: { type: 'string', description: '幻灯片标题' },
            subtitle: { type: 'string', description: '副标题（可选）' },
            points: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string', description: '要点标题' },
                  description: { type: 'string', description: '要点描述' }
                },
                required: ['title', 'description'],
                additionalProperties: false
              },
              description: '要点列表（用于key_points、text_only、timeline、data_highlight布局）'
            },
            leftColumn: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['title', 'description'],
                additionalProperties: false
              },
              description: '左栏内容（用于two_column、comparison布局）'
            },
            rightColumn: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['title', 'description'],
                additionalProperties: false
              },
              description: '右栏内容（用于two_column、comparison布局）'
            },
            highlightNumber: { type: 'string', description: '突出显示的数字（用于data_highlight布局）' },
            highlightLabel: { type: 'string', description: '数字标签（用于data_highlight布局）' },
            footerNote: { type: 'string', description: '页脚备注（可选）' }
          },
          required: ['slideIndex', 'layout', 'title'],
          additionalProperties: false
        }
      }
    },
    required: ['presentationTitle', 'presentationSubtitle', 'slides'],
    additionalProperties: false
  },
  strict: true
};

/**
 * Convert raw text to structured PPT outline using LLM
 */
export async function structureTextToPPTOutline(inputText: string): Promise<PPTOutline> {
  const userPrompt = `请将以下文本内容转化为PPT大纲结构：

---
${inputText}
---

请生成10-15页的PPT大纲。第一页为封面(title)，最后一页为结束页(closing)。每一页都必须有实质内容（points或leftColumn/rightColumn），禁止空页。section分隔页最多1个。优先使用key_points、two_column、data_highlight、timeline布局。`;

  const result = await invokeLLM({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    responseFormat: {
      type: 'json_schema',
      json_schema: OUTPUT_SCHEMA
    },
    maxTokens: 16000
  });

  const content = result.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('LLM返回内容为空');
  }

  try {
    const outline: PPTOutline = JSON.parse(content);
    
    // Validate basic structure
    if (!outline.presentationTitle || !outline.slides || outline.slides.length < 3) {
      throw new Error('PPT大纲结构不完整');
    }
    
    // Ensure first slide is title and last is closing
    if (outline.slides[0].layout !== 'title') {
      outline.slides[0].layout = 'title';
    }
    if (outline.slides[outline.slides.length - 1].layout !== 'closing') {
      outline.slides[outline.slides.length - 1].layout = 'closing';
    }
    
    // Re-index slides
    outline.slides.forEach((slide, idx) => {
      slide.slideIndex = idx;
    });
    
    return outline;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('LLM返回的JSON格式无效');
    }
    throw e;
  }
}
