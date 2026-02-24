/**
 * PPT Content Structurer V2
 * Uses LLM to analyze, restructure, and enrich text into structured PPT outline
 */
import { invokeLLM } from './_core/llm';

// Layout types for different slide designs
export type SlideLayout = 
  | 'title'           // Title slide (cover)
  | 'key_points'      // Key points with icons
  | 'two_column'      // Two column layout
  | 'comparison'      // A vs B comparison with colored borders
  | 'timeline'        // Timeline / process steps
  | 'data_highlight'  // Big number / data emphasis
  | 'grid_cards'      // 2x2 or 2x3 grid cards
  | 'process_flow'    // Horizontal process flow with nodes
  | 'chart'           // Chart-based slide (bar/line/progress)
  | 'text_only'       // Rich text content
  | 'closing';        // Closing slide

export interface SlidePoint {
  icon: string;        // Emoji icon
  title: string;
  description: string;
}

export interface ChartDataItem {
  label: string;
  value: number;
  color?: string;      // Optional color hint
}

export interface ChartData {
  type: 'bar' | 'line' | 'progress';
  title: string;
  items: ChartDataItem[];
  unit?: string;       // e.g. '%', '万', '$'
}

export interface ProcessNode {
  icon: string;
  label: string;
}

export interface SlideOutline {
  slideIndex: number;
  layout: SlideLayout;
  title: string;
  subtitle?: string;
  points?: SlidePoint[];
  leftColumn?: SlidePoint[];
  rightColumn?: SlidePoint[];
  leftLabel?: string;
  rightLabel?: string;
  highlightNumber?: string;
  highlightLabel?: string;
  chartData?: ChartData;
  processFlow?: ProcessNode[];
  quote?: string;       // Key insight / golden quote at bottom
  footerNote?: string;
}

export interface PPTOutline {
  presentationTitle: string;
  presentationSubtitle: string;
  slides: SlideOutline[];
}

const SYSTEM_PROMPT = `你是一位顶级商业咨询顾问兼PPT策划大师。你的任务是将客户提供的文本内容转化为一份高质量的咨询级演示文档。

## 你的核心价值

你不是"文字搬运工"，而是"内容增值引擎"。客户给你的是原始素材，你要输出的是：
1. **原文核心内容**的结构化呈现（客户能看到他提供的信息）
2. **你补充的增值内容**：案例、数据、洞察、对比分析（让信息更完整更有说服力）
3. **精心设计的信息架构**：逻辑清晰、层次分明、重点突出

## 工作流程

### 第一步：分析原文，形成逻辑结构
- 阅读全文，识别核心主题和论点
- 不要按原文顺序平铺，要根据逻辑关系重新组织
- 常见结构：总分总、问题-分析-方案、现状-趋势-行动、并列递进等
- 确定每个章节的核心论点

### 第二步：内容增值
- 基于原文中提到的概念，补充具体的企业案例（真实公司名+具体做法+量化结果）
- 补充关键数据点（百分比、金额、增长率等）
- 为每个论点提炼一句"金句"（quote），作为该页的点睛之笔
- 当内容涉及数据对比或趋势变化时，构造chartData用于图表展示

### 第三步：设计信息架构
- 每页必须有完整的信息层次：标题 → 正文内容 → 底部金句
- 页数由内容量决定（通常12-20页），内容丰富的章节可以用2页展开
- 不要使用section分隔页，章节信息通过内容页的标题和subtitle体现

## 布局选择指南

| 布局 | 适用场景 | 要求 |
|------|---------|------|
| title | 封面页 | 主标题要有冲击力，subtitle补充说明 |
| key_points | 要点阐述 | 4-6个要点，每个有icon+title+description(30-50字) |
| grid_cards | 并列概念/特点/优势 | 4-6个卡片，适合展示多个并列项 |
| two_column | 分类展示/补充说明 | 左右各2-3个要点，subtitle可标注左右栏主题 |
| comparison | A vs B对比 | 必须设置leftLabel和rightLabel，左右各3-4个要点 |
| timeline | 步骤/阶段/流程 | 3-5个阶段，有先后顺序 |
| data_highlight | 突出关键数据 | highlightNumber必填，配合2-4个补充points |
| process_flow | 横向流程展示 | processFlow数组，3-6个节点，每个有icon和label |
| chart | 数据可视化 | chartData必填，type为bar/line/progress，配合points补充说明 |
| text_only | 深度阐述/案例详情 | 2-3个要点，description较长(50-100字)，适合案例展开 |
| closing | 结束页 | 总结性标题+行动号召 |

## 内容质量标准

1. **标题必须是观点/结论**，不是描述性标题
   - ❌ "市场分析" → ✅ "中国理财市场突破200万亿，个人理财师迎来黄金时代"
   - ❌ "AI趋势" → ✅ "AI Agent将在2026年取代40%的重复性知识工作"

2. **每页必须有quote（金句）**
   - 金句是全页的灵魂，一句话总结核心洞察
   - 例："不要试图和AI比速度和记忆力，你的核心竞争力在于定义问题、情感连接和最终责任判定。"

3. **案例要具体**
   - ❌ "某公司使用AI提升效率" → ✅ "Klarna用AI客服替代700名员工，处理速度提升3倍，客户满意度持平"

4. **数据要精确**
   - 充分挖掘原文中的数字，同时基于你的知识补充相关数据
   - 当有对比数据时使用chart布局展示

5. **布局多样化**
   - 至少使用6种不同布局，禁止连续2页使用相同布局
   - 优先使用信息丰富的布局：key_points、chart、comparison、process_flow

## emoji图标选择
- 商业/战略：🎯💡🔑📊💰🏆🚀📈
- 技术/AI：⚡🤖🔧💻🔬🧩🧠
- 人员/组织：👥🤝💪🎓👨‍💼
- 数据/分析：📊📈💹🔍📉
- 创新/增长：🌟✨🔥💎🌱
- 行业/场景：🏭🏥🛒🏦✈️🚗

请严格按JSON Schema输出。所有内容使用简体中文。`;

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
              enum: ['title', 'key_points', 'two_column', 'comparison', 'timeline', 'data_highlight', 'grid_cards', 'process_flow', 'chart', 'text_only', 'closing'],
              description: '布局类型'
            },
            title: { type: 'string', description: '幻灯片标题（必须是观点/结论）' },
            subtitle: { type: 'string', description: '副标题' },
            points: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  icon: { type: 'string', description: 'emoji图标' },
                  title: { type: 'string', description: '要点标题' },
                  description: { type: 'string', description: '要点描述（30-50字）' }
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
            leftLabel: { type: 'string', description: '左栏标签（用于comparison布局）' },
            rightLabel: { type: 'string', description: '右栏标签（用于comparison布局）' },
            highlightNumber: { type: 'string', description: '突出显示的数字（用于data_highlight）' },
            highlightLabel: { type: 'string', description: '数字标签说明' },
            chartData: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['bar', 'line', 'progress'], description: '图表类型' },
                title: { type: 'string', description: '图表标题' },
                items: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      label: { type: 'string' },
                      value: { type: 'number' },
                      color: { type: 'string', description: '可选颜色' }
                    },
                    required: ['label', 'value'],
                    additionalProperties: false
                  }
                },
                unit: { type: 'string', description: '单位' }
              },
              required: ['type', 'title', 'items'],
              additionalProperties: false,
              description: '图表数据'
            },
            processFlow: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  icon: { type: 'string', description: 'emoji图标' },
                  label: { type: 'string', description: '节点标签' }
                },
                required: ['icon', 'label'],
                additionalProperties: false
              },
              description: '流程节点'
            },
            quote: { type: 'string', description: '金句/核心洞察（每页必须有，一句话点睛）' },
            footerNote: { type: 'string', description: '页脚备注（数据来源）' }
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
  const userPrompt = `请将以下文本内容转化为一份高质量的咨询级PPT大纲：

---
${inputText}
---

要求：
1. 先分析原文的核心主题和逻辑结构，然后重新组织信息（不要按原文顺序平铺）
2. 基于原文内容进行增值：补充真实企业案例、关键数据、深度洞察
3. 页数由内容量决定（12-20页含封面和结束页），不要使用section分隔页
4. 每页必须有quote字段（金句/核心洞察），这是全页的点睛之笔
5. 标题必须是观点/结论式，不是描述性标题
6. 至少使用6种不同布局，禁止连续2页使用相同布局
7. 当内容涉及数据对比时，使用chart布局并填充chartData
8. 当内容涉及流程/演进时，使用process_flow布局并填充processFlow
9. comparison布局必须设置leftLabel和rightLabel
10. 每个要点的description至少30字，信息密度要高`;

  const result = await invokeLLM({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt }
    ],
    responseFormat: {
      type: 'json_schema',
      json_schema: OUTPUT_SCHEMA
    },
    maxTokens: 24000
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
    if (uniqueLayouts.size < 4) {
      console.warn(`[PPT Structurer] Low layout diversity: only ${uniqueLayouts.size} unique layouts`);
    }

    // Check for consecutive same layouts
    for (let i = 1; i < layouts.length; i++) {
      if (layouts[i] === layouts[i - 1] && layouts[i] !== 'title' && layouts[i] !== 'closing') {
        console.warn(`[PPT Structurer] Consecutive same layout at slides ${i - 1} and ${i}: ${layouts[i]}`);
      }
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
