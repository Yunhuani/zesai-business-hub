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

const SYSTEM_PROMPT = `你是一位专业的PPT内容策划师。你的任务是将用户提供的文本内容转化为结构化的PPT大纲。

要求：
1. 分析文本内容，提取核心主题、关键信息和逻辑结构
2. 设计12-20页幻灯片，包含封面页和结束页
3. 每页选择最合适的布局类型
4. 每页内容精炼，要点不超过4个
5. 确保信息层次清晰，逻辑连贯

布局类型说明：
- title: 封面页，包含主标题和副标题
- section: 章节分隔页，用于引入新的主题
- text_only: 纯文本内容页
- two_column: 双栏布局，适合对比或并列信息
- key_points: 要点列表页，适合核心观点
- comparison: 对比页，左右两列对比
- timeline: 时间线/流程页
- data_highlight: 数据突出页，强调关键数字
- closing: 结束页

你必须严格按照JSON Schema输出，不要添加任何额外文字。`;

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

请生成12-20页的PPT大纲，第一页为封面(title布局)，最后一页为结束页(closing布局)。中间页面根据内容选择合适的布局类型。确保内容精炼、结构清晰。`;

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
