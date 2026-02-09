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
  | 'grid_cards'      // 2x2 or 2x3 grid cards
  | 'closing';        // Closing slide

export interface SlidePoint {
  icon: string;        // Emoji icon for visual identification
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

const SYSTEM_PROMPT = `你是一位世界级PPT内容策划大师。你的任务不是"搬运文字到幻灯片"，而是"将信息重新策划为有说服力的视觉叙事"。

## 核心创作原则

**1. 标题必须是观点，不是描述**
- ❌ "市场分析" → ✅ "理财市场突破200万亿，个人理财师迎来黄金时代"
- ❌ "核心服务" → ✅ "三大核心服务构建差异化竞争壁垒"
- ❌ "团队介绍" → ✅ "10年行业深耕，打造最懂客户的专业团队"
- 每个标题都要让读者看完就知道这页在说什么结论

**2. 信息密度要高**
- 每页4-6个要点，每个要点description 30-50字
- 充分挖掘原文中的数字、百分比、金额，用data_highlight突出
- 每个要点都要有一个精准的emoji图标（icon字段），增加视觉辨识度
- 页脚footerNote用于补充数据来源或一句话总结

**3. 布局必须多样化**
- 10-15页内容中，至少使用5种不同布局
- 禁止连续2页使用相同布局
- section分隔页最多1个，且必须有subtitle
- 优先使用内容丰富的布局：key_points、grid_cards、two_column、data_highlight、timeline

**4. 内容要重新组织，不是照搬**
- 理解全文核心论点，围绕论点重新组织信息
- 提炼、归纳、升华，而非简单拆分段落
- 补充逻辑连接，让幻灯片之间有叙事递进感

## 布局类型说明

| 布局 | 用途 | 要求 |
|------|------|------|
| title | 封面页 | 主标题+副标题，副标题要有吸引力 |
| section | 章节分隔 | 必须有subtitle，最多用1个 |
| key_points | 要点列表 | 4-6个要点，每个有icon+title+description |
| grid_cards | 网格卡片 | 4-6个卡片，适合并列概念/特点/优势 |
| two_column | 双栏布局 | 左右各2-3个要点，适合分类/对比 |
| comparison | 对比页 | subtitle用"A vs B"格式，左右对比 |
| timeline | 时间线/流程 | 3-5个阶段，有先后顺序 |
| data_highlight | 数据突出 | highlightNumber必填，配合2-4个补充points |
| text_only | 纯文本 | 2-3个要点，每个description较长(50-80字) |
| closing | 结束页 | 总结性标题+副标题 |

## emoji图标选择指南
- 商业/战略：🎯💡🔑📊💰🏆🚀📈
- 技术/产品：⚡🔧🛠️💻🔬🧩🎨
- 人员/团队：👥🤝💪🎓👨‍💼
- 时间/流程：⏰📅🔄✅📋
- 数据/分析：📊📈💹🔍📉
- 创新/增长：🌟✨🔥💎🌱

请严格按JSON Schema输出。`;

const OUTPUT_SCHEMA = {
  name: 'ppt_outline',
  schema: {
    type: 'object',
    properties: {
      presentationTitle: { type: 'string', description: '演示文稿主标题（观点式，有冲击力）' },
      presentationSubtitle: { type: 'string', description: '副标题（补充说明或吸引语）' },
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slideIndex: { type: 'number', description: '幻灯片序号，从0开始' },
            layout: { 
              type: 'string', 
              enum: ['title', 'section', 'text_only', 'two_column', 'key_points', 'comparison', 'timeline', 'data_highlight', 'grid_cards', 'closing'],
              description: '布局类型'
            },
            title: { type: 'string', description: '幻灯片标题（必须是观点/结论，非描述性）' },
            subtitle: { type: 'string', description: '副标题（可选）' },
            points: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  icon: { type: 'string', description: 'emoji图标（1个字符）' },
                  title: { type: 'string', description: '要点标题（简洁有力）' },
                  description: { type: 'string', description: '要点描述（30-50字，信息密度高）' }
                },
                required: ['icon', 'title', 'description'],
                additionalProperties: false
              },
              description: '要点列表'
            },
            leftColumn: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  icon: { type: 'string', description: 'emoji图标' },
                  title: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['icon', 'title', 'description'],
                additionalProperties: false
              },
              description: '左栏内容'
            },
            rightColumn: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  icon: { type: 'string', description: 'emoji图标' },
                  title: { type: 'string' },
                  description: { type: 'string' }
                },
                required: ['icon', 'title', 'description'],
                additionalProperties: false
              },
              description: '右栏内容'
            },
            highlightNumber: { type: 'string', description: '突出显示的数字（用于data_highlight）' },
            highlightLabel: { type: 'string', description: '数字标签说明' },
            footerNote: { type: 'string', description: '页脚备注（数据来源或一句话总结）' }
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
  const userPrompt = `请将以下文本内容策划为一份高质量PPT大纲：

---
${inputText}
---

要求：
1. 生成10-15页（含封面和结束页），每页都有实质内容
2. 标题必须是观点/结论，不是描述性标题
3. 每个要点都要有emoji图标（icon字段）
4. 至少使用5种不同布局，禁止连续2页相同布局
5. section分隔页最多1个
6. 充分挖掘原文中的数字数据，用data_highlight展示
7. 每个要点的description至少30字，信息密度要高
8. footerNote用于补充数据来源或关键洞察`;

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

    // Validate layout diversity
    const layouts = outline.slides.map(s => s.layout);
    const uniqueLayouts = new Set(layouts.filter(l => l !== 'title' && l !== 'closing'));
    if (uniqueLayouts.size < 3) {
      console.warn(`[PPT Structurer] Low layout diversity: only ${uniqueLayouts.size} unique layouts`);
    }

    // Ensure icon field exists on all points (fallback)
    outline.slides.forEach(slide => {
      const addDefaultIcon = (points?: SlidePoint[]) => {
        if (points) {
          points.forEach(p => {
            if (!p.icon) p.icon = '📌';
          });
        }
      };
      addDefaultIcon(slide.points);
      addDefaultIcon(slide.leftColumn);
      addDefaultIcon(slide.rightColumn);
    });
    
    return outline;
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('LLM返回的JSON格式无效');
    }
    throw e;
  }
}
