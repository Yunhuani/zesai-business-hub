/**
 * PPT Content Structurer V3
 * Multi-block composite page architecture with content enrichment
 */
import { invokeLLM } from './_core/llm';

// ============================================================
// Data Structures
// ============================================================

/** Section types within a slide page */
export type SectionType =
  | 'text_block'      // Text block: icon + title + lead sentence + bullet points
  | 'chart_block'     // Chart: bar/line/progress with data
  | 'case_block'      // Case study: company + before/after + value
  | 'insight_block'   // Key insight/quote block with colored background
  | 'progress_block'  // Progress bars with labels and percentages
  | 'flow_block'      // Horizontal process flow nodes
  | 'stats_block'     // 2-4 stat cards with big numbers
  | 'bullet_list';    // Structured bullet list with emoji + bold title + description

/** A bullet point with layered structure */
export interface BulletPoint {
  icon: string;           // Emoji icon
  title: string;          // Bold keyword/phrase
  description: string;    // 20-50 char description
  highlight?: string;     // Optional highlighted number/data in accent color
}

/** Chart data */
export interface ChartDataItem {
  label: string;
  value: number;
}

export interface ChartData {
  type: 'bar' | 'line' | 'progress';
  title: string;
  items: ChartDataItem[];
  unit?: string;
  source?: string;  // Data source attribution
}

/** Case study */
export interface CaseStudy {
  icon: string;           // Emoji for the case
  company: string;        // Company name
  industry?: string;      // Industry tag
  traditional: string;    // Before / traditional approach
  transformed: string;    // After / AI-enabled approach
  valueProposition: string; // Key value / result
}

/** Process flow node */
export interface FlowNode {
  icon: string;
  label: string;
}

/** Stat card */
export interface StatCard {
  icon: string;
  number: string;    // e.g. "40%", "$17.5B", "3x"
  label: string;     // What the number represents
}

/** A section/block within a slide */
export interface SlideSection {
  type: SectionType;
  title?: string;         // Block title (emoji + text)
  leadSentence?: string;  // One-sentence summary below title
  bullets?: BulletPoint[];
  chartData?: ChartData;
  cases?: CaseStudy[];
  insightText?: string;   // For insight_block
  insightLabel?: string;  // e.g. "核心洞察", "讲者话术"
  flowNodes?: FlowNode[];
  stats?: StatCard[];
}

/** Page layout type */
export type PageLayout =
  | 'title'              // Cover page
  | 'quad'               // 2x2 four-block composite (the core layout)
  | 'two_col_mixed'      // Left text + right chart/cases
  | 'case_cards'         // 2-3 case study cards in columns
  | 'comparison'         // A vs B with transition arrow
  | 'key_points'         // Structured bullet points (enhanced)
  | 'data_dashboard'     // Stats + chart + bullets combined
  | 'timeline'           // Vertical timeline with detailed steps
  | 'closing';           // End page

/** A single slide page */
export interface SlideOutline {
  slideIndex: number;
  layout: PageLayout;
  title: string;
  subtitle?: string;
  sections: SlideSection[];    // 2-4 content blocks per page
  quote?: string;              // Bottom golden quote
  quoteLabel?: string;         // e.g. "核心洞察", "关键启示"
  footerNote?: string;         // Data source / footer
  // Legacy fields for backward compatibility
  points?: BulletPoint[];
  leftColumn?: BulletPoint[];
  rightColumn?: BulletPoint[];
  leftLabel?: string;
  rightLabel?: string;
  highlightNumber?: string;
  highlightLabel?: string;
  chartData?: ChartData;
  processFlow?: FlowNode[];
}

/** Complete PPT outline */
export interface PPTOutline {
  presentationTitle: string;
  presentationSubtitle: string;
  slides: SlideOutline[];
}

// For backward compat with renderer imports
export type SlideLayout = PageLayout;
export type SlidePoint = BulletPoint;
export type ProcessNode = FlowNode;

// ============================================================
// LLM Prompt
// ============================================================

const SYSTEM_PROMPT = `你是一位顶级商业咨询顾问兼PPT策划大师。你的任务是将客户提供的文本转化为一份**咨询级演示文档**。

## 核心原则

你不是"文字搬运工"，而是"内容增值引擎"。最终输出必须让客户看到：
1. 他提供的原始内容（结构化呈现）
2. 你补充的增值内容（案例、数据、洞察）
3. 精心设计的信息架构（逻辑清晰、层次分明）

## 工作流程

### 第一步：分析原文，形成逻辑结构
- 识别核心主题和论点，根据逻辑关系重新组织（不按原文顺序平铺）
- 常见结构：总分总、问题-分析-方案、现状-趋势-行动、并列递进

### 第二步：内容增值
- 补充具体企业案例（真实公司名+具体做法+量化结果）
- 补充关键数据点（百分比、金额、增长率），标注数据来源
- 为每个论点提炼金句（quote）
- 当涉及数据对比/趋势时，构造chartData

### 第三步：设计多区块页面
每个内容页由2-4个sections（区块）组成，不同区块类型混合使用。

## 页面结构

每页 = 标题栏 + 2-4个内容区块 + 底部金句

### 区块类型说明

| 类型 | 用途 | 必填字段 |
|------|------|---------|
| text_block | 文字要点块 | title, bullets(2-4个) |
| chart_block | 图表数据块 | chartData(type/title/items/source) |
| case_block | 企业案例块 | cases(1-3个, 每个有company/traditional/transformed/valueProposition) |
| insight_block | 洞察/引用块 | insightText, insightLabel |
| progress_block | 进度条数据块 | chartData(type=progress, items有label和value百分比) |
| flow_block | 流程图块 | flowNodes(3-5个节点) |
| stats_block | 数据卡片块 | stats(2-4个, 每个有icon/number/label) |
| bullet_list | 结构化列表块 | title, bullets(3-6个, 每个有icon/title/description/highlight) |

### 页面布局类型

| 布局 | 区块数量 | 适用场景 | sections要求 |
|------|---------|---------|-------------|
| title | 0 | 封面 | 无sections |
| quad | 4 | 核心解读页（最重要！） | 4个不同类型区块，如: text_block + chart_block + flow_block + bullet_list |
| two_col_mixed | 2 | 左文右图/左文右案例 | 2个区块，左侧text_block/bullet_list，右侧chart_block/progress_block/case_block |
| case_cards | 2-3 | 案例展示页 | 2-3个case_block |
| comparison | 2 | A vs B对比 | 2个bullet_list，第一个=旧模式，第二个=新模式 |
| key_points | 1-2 | 要点阐述 | 1个bullet_list(4-6个bullets) + 可选1个stats_block/chart_block |
| data_dashboard | 3-4 | 数据密集页 | stats_block + chart_block + bullet_list组合 |
| timeline | 1 | 时间线/步骤 | 1个bullet_list(作为时间线步骤，3-5个) |
| closing | 0 | 结束页 | 无sections |

## 内容质量标准

### 标题必须是观点/结论式
- ❌ "市场分析" → ✅ "中国理财市场突破200万亿，个人理财师迎来黄金时代"
- ❌ "AI趋势" → ✅ "AI Agent将在2026年取代40%的重复性知识工作"

### 每页必须有quote（金句）
金句是全页灵魂，一句话总结核心洞察。quoteLabel标注类型（"核心洞察"/"关键启示"/"讲者话术"）。

### 文字4层结构
每个text_block/bullet_list中的bullets必须有：
1. icon: emoji图标
2. title: 粗体关键词（3-8字）
3. description: 描述说明（20-50字）
4. highlight: 可选的高亮数据（如"40%"、"3倍"、"$17.5B"）

### 案例要具体
- ❌ "某公司使用AI提升效率"
- ✅ company:"Klarna", traditional:"700名客服人员处理工单", transformed:"AI客服替代，处理速度从11分钟降至2分钟", valueProposition:"效率提升3倍，客户满意度持平"

### 数据要有来源
chartData中的source字段标注数据来源（如"Gartner 2025预测"、"公司年报"）

### 布局多样化
- 至少使用5种不同布局
- 禁止连续2页使用相同布局
- quad布局至少使用3次（这是核心布局）
- 每个主要章节用2页展开：第1页quad/two_col_mixed（解读），第2页case_cards/key_points（案例+启示）

### 页数要求
- 总页数15-25页（含封面和结束页）
- 不要使用section分隔页
- 内容丰富的主题用2页展开

## emoji图标选择
- 商业/战略：🎯💡🔑📊💰🏆🚀📈
- 技术/AI：⚡🤖🔧💻🔬🧩🧠
- 人员/组织：👥🤝💪🎓👨‍💼
- 数据/分析：📊📈💹🔍📉
- 创新/增长：🌟✨🔥💎🌱
- 行业/场景：🏭🏥🛒🏦✈️🚗
- 状态标记：✅❌⚠️🔴🟢🟡

请严格按JSON Schema输出。所有内容使用简体中文。`;

const OUTPUT_SCHEMA = {
  name: 'ppt_outline',
  schema: {
    type: 'object',
    properties: {
      presentationTitle: { type: 'string', description: '主标题（观点式，有冲击力）' },
      presentationSubtitle: { type: 'string', description: '副标题' },
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slideIndex: { type: 'number' },
            layout: {
              type: 'string',
              enum: ['title', 'quad', 'two_col_mixed', 'case_cards', 'comparison', 'key_points', 'data_dashboard', 'timeline', 'closing'],
            },
            title: { type: 'string', description: '观点/结论式标题' },
            subtitle: { type: 'string' },
            sections: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['text_block', 'chart_block', 'case_block', 'insight_block', 'progress_block', 'flow_block', 'stats_block', 'bullet_list'],
                  },
                  title: { type: 'string', description: '区块标题（含emoji）' },
                  leadSentence: { type: 'string', description: '一句话概括' },
                  bullets: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        icon: { type: 'string' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        highlight: { type: 'string' },
                      },
                      required: ['icon', 'title', 'description'],
                      additionalProperties: false,
                    },
                  },
                  chartData: {
                    type: 'object',
                    properties: {
                      type: { type: 'string', enum: ['bar', 'line', 'progress'] },
                      title: { type: 'string' },
                      items: {
                        type: 'array',
                        items: {
                          type: 'object',
                          properties: {
                            label: { type: 'string' },
                            value: { type: 'number' },
                          },
                          required: ['label', 'value'],
                          additionalProperties: false,
                        },
                      },
                      unit: { type: 'string' },
                      source: { type: 'string' },
                    },
                    required: ['type', 'title', 'items'],
                    additionalProperties: false,
                  },
                  cases: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        icon: { type: 'string' },
                        company: { type: 'string' },
                        industry: { type: 'string' },
                        traditional: { type: 'string' },
                        transformed: { type: 'string' },
                        valueProposition: { type: 'string' },
                      },
                      required: ['icon', 'company', 'traditional', 'transformed', 'valueProposition'],
                      additionalProperties: false,
                    },
                  },
                  insightText: { type: 'string' },
                  insightLabel: { type: 'string' },
                  flowNodes: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        icon: { type: 'string' },
                        label: { type: 'string' },
                      },
                      required: ['icon', 'label'],
                      additionalProperties: false,
                    },
                  },
                  stats: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        icon: { type: 'string' },
                        number: { type: 'string' },
                        label: { type: 'string' },
                      },
                      required: ['icon', 'number', 'label'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['type'],
                additionalProperties: false,
              },
            },
            quote: { type: 'string' },
            quoteLabel: { type: 'string' },
            footerNote: { type: 'string' },
            // Legacy comparison fields
            leftLabel: { type: 'string' },
            rightLabel: { type: 'string' },
          },
          required: ['slideIndex', 'layout', 'title', 'sections'],
          additionalProperties: false,
        },
      },
    },
    required: ['presentationTitle', 'presentationSubtitle', 'slides'],
    additionalProperties: false,
  },
  strict: true,
};

// ============================================================
// Post-processing
// ============================================================

function postProcessOutline(outline: PPTOutline): PPTOutline {
  // Ensure first slide is title and last is closing
  if (outline.slides[0]?.layout !== 'title') {
    outline.slides[0].layout = 'title';
  }
  if (outline.slides[outline.slides.length - 1]?.layout !== 'closing') {
    outline.slides[outline.slides.length - 1].layout = 'closing';
  }

  // Re-index
  outline.slides.forEach((slide, idx) => {
    slide.slideIndex = idx;
    if (!slide.sections) slide.sections = [];
  });

  // Fix consecutive same layouts
  const contentLayouts: PageLayout[] = ['quad', 'two_col_mixed', 'case_cards', 'comparison', 'key_points', 'data_dashboard', 'timeline'];
  for (let i = 1; i < outline.slides.length - 1; i++) {
    const slide = outline.slides[i];
    if (slide.layout === outline.slides[i - 1].layout && slide.layout !== 'title' && slide.layout !== 'closing') {
      const usedByNeighbors = new Set([outline.slides[i - 1].layout]);
      if (i + 1 < outline.slides.length) usedByNeighbors.add(outline.slides[i + 1].layout);
      const alternatives = contentLayouts.filter(l => !usedByNeighbors.has(l));
      if (alternatives.length > 0) {
        console.log(`[PPT V3] Fixed consecutive layout: slide ${i} ${slide.layout} → ${alternatives[0]}`);
        slide.layout = alternatives[0];
      }
    }
  }

  // Ensure all bullets have icons
  outline.slides.forEach(slide => {
    slide.sections?.forEach(section => {
      section.bullets?.forEach(b => {
        if (!b.icon) b.icon = '📌';
      });
      section.cases?.forEach(c => {
        if (!c.icon) c.icon = '🏢';
      });
      section.flowNodes?.forEach(n => {
        if (!n.icon) n.icon = '🔹';
      });
      section.stats?.forEach(s => {
        if (!s.icon) s.icon = '📊';
      });
    });

    // Backward compat: populate legacy fields from sections
    if (slide.sections && slide.sections.length > 0) {
      // Extract points from first bullet_list or text_block section
      const bulletSection = slide.sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
      if (bulletSection?.bullets && !slide.points) {
        slide.points = bulletSection.bullets;
      }
      // Extract chartData from first chart_block or progress_block
      const chartSection = slide.sections.find(s => s.type === 'chart_block' || s.type === 'progress_block');
      if (chartSection?.chartData && !slide.chartData) {
        slide.chartData = chartSection.chartData;
      }
      // Extract processFlow from first flow_block
      const flowSection = slide.sections.find(s => s.type === 'flow_block');
      if (flowSection?.flowNodes && !slide.processFlow) {
        slide.processFlow = flowSection.flowNodes;
      }
      // For comparison, extract leftColumn/rightColumn
      if (slide.layout === 'comparison' && slide.sections.length >= 2) {
        if (!slide.leftColumn) slide.leftColumn = slide.sections[0]?.bullets;
        if (!slide.rightColumn) slide.rightColumn = slide.sections[1]?.bullets;
        if (!slide.leftLabel) slide.leftLabel = slide.sections[0]?.title;
        if (!slide.rightLabel) slide.rightLabel = slide.sections[1]?.title;
      }
    }
  });

  return outline;
}

// ============================================================
// Main export
// ============================================================

export async function structureTextToPPTOutline(inputText: string): Promise<PPTOutline> {
  const userPrompt = `请将以下文本内容转化为一份高质量的咨询级PPT大纲：

---
${inputText}
---

要求：
1. 先分析原文核心主题和逻辑结构，然后重新组织信息
2. 基于原文进行内容增值：补充真实企业案例、关键数据、深度洞察
3. 总页数15-25页（含封面和结束页），每个主要章节用2页展开（解读页+案例页）
4. 每页必须有quote字段（金句/核心洞察）和quoteLabel
5. 标题必须是观点/结论式
6. 至少使用5种不同布局，quad布局至少使用3次
7. 禁止连续2页使用相同布局
8. 每页的sections数组必须有2-4个不同类型的区块（title和closing页除外）
9. quad布局的4个sections必须是不同类型（如text_block + chart_block + flow_block + bullet_list）
10. case_block中的案例必须有具体公司名、传统做法、转型做法、价值结果
11. chart_block必须有source字段标注数据来源
12. bullet_list中每个bullet的description至少20字
13. 不要使用section分隔页`;

  const result = await invokeLLM({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    responseFormat: {
      type: 'json_schema',
      json_schema: OUTPUT_SCHEMA,
    },
    maxTokens: 32000,
  });

  const content = result.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('LLM返回内容为空');
  }

  try {
    const outline: PPTOutline = JSON.parse(content);
    if (!outline.presentationTitle || !outline.slides || outline.slides.length < 3) {
      throw new Error('PPT大纲结构不完整');
    }
    return postProcessOutline(outline);
  } catch (e) {
    if (e instanceof SyntaxError) {
      throw new Error('LLM返回的JSON格式无效');
    }
    throw e;
  }
}
