/**
 * PPT Content Structurer V4
 * Two-phase batch architecture: Phase 1 generates outline skeleton, Phase 2 fills content batch by batch
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
// Phase 1: Outline skeleton (lightweight, small output)
// ============================================================

interface OutlineSkeleton {
  presentationTitle: string;
  presentationSubtitle: string;
  slides: Array<{
    slideIndex: number;
    layout: PageLayout;
    title: string;
    subtitle?: string;
    sectionHints: string[];  // Brief hints for what each section should contain
    quote?: string;
    quoteLabel?: string;
  }>;
}

const OUTLINE_SYSTEM_PROMPT = `你是顶级商业咨询PPT策划师。根据客户文本，生成PPT的大纲骨架。

## 任务
只生成每页的标题、布局类型和内容提示，不需要生成详细内容。

## 规则
1. 分析原文逻辑后重新组织，不按原文顺序平铺
2. 标题必须是观点/结论式（如"AI Agent将取代40%重复性工作"）
3. 布局多样化，禁止连续相同布局
4. 第一页必须是title布局，最后一页必须是closing布局
5. sectionHints是每个区块的内容提示（1-2句话描述该区块应包含什么）

## 布局类型
- title: 封面页（sectionHints空数组）
- quad: 2x2四区块（4个sectionHints）
- two_col_mixed: 左文右图（2个sectionHints）
- case_cards: 案例卡片（2-3个sectionHints）
- comparison: A vs B对比（2个sectionHints）
- key_points: 要点+数据（2个sectionHints）
- data_dashboard: 数据仪表盘（3个sectionHints）
- timeline: 时间线/流程（1-2个sectionHints）
- closing: 结束页（sectionHints空数组）

请严格按JSON输出。简体中文。`;

const OUTLINE_SCHEMA = {
  name: 'ppt_outline_skeleton',
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
            sectionHints: {
              type: 'array',
              items: { type: 'string' },
              description: '每个区块的内容提示',
            },
            quote: { type: 'string' },
            quoteLabel: { type: 'string' },
          },
          required: ['slideIndex', 'layout', 'title', 'sectionHints'],
          additionalProperties: false,
        },
      },
    },
    required: ['presentationTitle', 'presentationSubtitle', 'slides'],
    additionalProperties: false,
  },
  strict: true,
};

async function generateOutlineSkeleton(inputText: string, targetPages: number): Promise<OutlineSkeleton> {
  const textPreview = inputText.slice(0, 8000);
  const userPrompt = `请将以下文本生成PPT大纲骨架（只需标题和布局，不需要详细内容）：

---
${textPreview}
---

要求：共${targetPages}页（含封面和结束页），观点式标题，布局多样化。
每页的sectionHints简要描述该页每个区块应包含的内容方向。`;

  console.log(`[PPT Outline] Generating skeleton: ${targetPages} pages...`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const result = await invokeLLM({
        messages: [
          { role: 'system', content: OUTLINE_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        responseFormat: {
          type: 'json_schema',
          json_schema: OUTLINE_SCHEMA,
        },
        maxTokens: 4000,
      });

      const content = result.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        console.error(`[PPT Outline] Attempt ${attempt}: Empty content`);
        continue;
      }

      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      const skeleton: OutlineSkeleton = JSON.parse(jsonStr);
      if (!skeleton.presentationTitle || !skeleton.slides || skeleton.slides.length < 3) {
        console.error(`[PPT Outline] Attempt ${attempt}: Incomplete skeleton`);
        continue;
      }

      // Ensure first is title, last is closing
      if (skeleton.slides[0].layout !== 'title') skeleton.slides[0].layout = 'title';
      if (skeleton.slides[skeleton.slides.length - 1].layout !== 'closing') {
        skeleton.slides[skeleton.slides.length - 1].layout = 'closing';
      }

      console.log(`[PPT Outline] Skeleton generated: ${skeleton.slides.length} pages`);
      return skeleton;
    } catch (e: any) {
      console.error(`[PPT Outline] Attempt ${attempt} error:`, e.message);
      if (attempt === 2) throw new Error('大纲生成失败，请稍后重试');
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('大纲生成失败，请稍后重试');
}

// ============================================================
// Phase 2: Batch content generation (3-4 slides per call)
// ============================================================

const BATCH_SYSTEM_PROMPT = `你是顶级商业咨询PPT内容填充专家。根据大纲骨架和原文，为指定的几页PPT生成详细内容。

## 核心原则
你是"内容增值引擎"：原文结构化呈现 + 补充案例数据洞察 + 清晰信息架构。

## ★ Bullet输出格式（最重要）
每个bullet必须是【短语式要点】，不是长句子：
- title: 关键词短语，3-10字（如"核能：SMR模块化反应堆"、"数据中心电力需求激增"）
- description: 一句话补充说明，15-30字
- 禁止把title和description写成一整段长文！
- 每个section必须有4-6个bullets

## 区块类型及必填字段
- text_block/bullet_list: 必填title(含emoji,8字以内), leadSentence(引导句20-35字), bullets数组(4-6个)
- chart_block: 必填chartData{type,title,items[{label,value}](4-6个),source}
- case_block: 必填cases数组(2-3个)，每个{icon,company,industry,traditional(20-40字),transformed(20-40字),valueProposition(20-40字)}
- stats_block: 必填stats数组(3-4个)，每个{icon,number,label}
- flow_block: 必填flowNodes数组(4-5个)，每个{icon,label}
- insight_block: 必填insightText(30-60字),insightLabel
- progress_block: 必填chartData(type="progress",items4-6个)

## 布局对应的sections结构
- title: sections空数组
- quad: 4个不同类型区块
- two_col_mixed: 2个区块（左文右图）
- case_cards: 2-3个case_block
- comparison: 2个bullet_list（旧vs新）
- key_points: 1个bullet_list + 1个stats_block或insight_block
- data_dashboard: stats_block + chart_block + bullet_list
- timeline: 1个bullet_list(4-5个步骤)
- closing: sections空数组

## 重要
- section.title只写8字以内短标题（含emoji）
- leadSentence是引导句，20-35字
- 严禁重复内容，每个字段只写一次
- 确保JSON完整闭合

请严格按JSON Schema输出。简体中文。`;

const BATCH_OUTPUT_SCHEMA = {
  name: 'ppt_batch_slides',
  schema: {
    type: 'object',
    properties: {
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
            title: { type: 'string' },
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
                  title: { type: 'string' },
                  leadSentence: { type: 'string' },
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
            leftLabel: { type: 'string' },
            rightLabel: { type: 'string' },
          },
          required: ['slideIndex', 'layout', 'title', 'sections'],
          additionalProperties: false,
        },
      },
    },
    required: ['slides'],
    additionalProperties: false,
  },
  strict: true,
};

async function generateSlidesBatch(
  inputText: string,
  skeleton: OutlineSkeleton,
  batchSlideIndices: number[],
): Promise<SlideOutline[]> {
  const batchSlides = batchSlideIndices.map(i => skeleton.slides[i]).filter(Boolean);
  if (batchSlides.length === 0) return [];

  // For title and closing slides, generate directly without LLM
  const simpleSlides: SlideOutline[] = [];
  const needsLLM: typeof batchSlides = [];

  for (const s of batchSlides) {
    if (s.layout === 'title') {
      simpleSlides.push({
        slideIndex: s.slideIndex,
        layout: 'title',
        title: skeleton.presentationTitle,
        subtitle: skeleton.presentationSubtitle,
        sections: [],
      });
    } else if (s.layout === 'closing') {
      simpleSlides.push({
        slideIndex: s.slideIndex,
        layout: 'closing',
        title: '感谢观看',
        subtitle: skeleton.presentationSubtitle,
        sections: [],
        quote: '未来已来，唯变不变',
        quoteLabel: '结束语',
      });
    } else {
      needsLLM.push(s);
    }
  }

  if (needsLLM.length === 0) return simpleSlides;

  // Build batch prompt
  const slideDescriptions = needsLLM.map(s => {
    const hints = s.sectionHints.map((h, i) => `  区块${i + 1}: ${h}`).join('\n');
    return `第${s.slideIndex}页 [${s.layout}] "${s.title}"
${hints}`;
  }).join('\n\n');

  // Provide relevant text context (distribute text across batches)
  const textPerSlide = Math.floor(inputText.length / skeleton.slides.length);
  const startIdx = Math.max(0, (needsLLM[0].slideIndex - 1) * textPerSlide - 500);
  const endIdx = Math.min(inputText.length, (needsLLM[needsLLM.length - 1].slideIndex + 1) * textPerSlide + 500);
  const relevantText = inputText.slice(startIdx, Math.min(endIdx, startIdx + 6000));

  const userPrompt = `请为以下${needsLLM.length}页PPT生成详细内容：

## 需要生成的页面
${slideDescriptions}

## 原文参考
---
${relevantText}
---

★每个bullet的title是短语关键词(3-10字)，description是补充说明(15-30字)。
★section必填leadSentence引导句。严禁重复内容。确保JSON完整闭合。`;

  console.log(`[PPT Batch] Generating slides [${needsLLM.map(s => s.slideIndex).join(',')}]...`);

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const maxTokens = Math.min(8000, needsLLM.length * 2500);
      const result = await invokeLLM({
        messages: [
          { role: 'system', content: BATCH_SYSTEM_PROMPT },
          { role: 'user', content: userPrompt },
        ],
        responseFormat: {
          type: 'json_schema',
          json_schema: BATCH_OUTPUT_SCHEMA,
        },
        maxTokens,
      });

      const content = result.choices[0]?.message?.content;
      if (!content || typeof content !== 'string') {
        console.error(`[PPT Batch] Attempt ${attempt}: Empty content`);
        continue;
      }

      let jsonStr = content.trim();
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) jsonStr = jsonMatch[1].trim();

      console.log(`[PPT Batch] Raw output: ${jsonStr.length} chars`);

      // Try direct parse first
      let parsed: { slides: SlideOutline[] } | null = null;
      try {
        parsed = JSON.parse(jsonStr);
      } catch {
        // Try truncation + repair
        jsonStr = truncateRepetitiveContent(jsonStr);
        parsed = repairBatchJSON(jsonStr);
      }

      if (parsed && parsed.slides && parsed.slides.length > 0) {
        console.log(`[PPT Batch] Got ${parsed.slides.length} slides on attempt ${attempt}`);
        return [...simpleSlides, ...parsed.slides];
      }

      console.error(`[PPT Batch] Attempt ${attempt}: Parse failed`);
    } catch (e: any) {
      console.error(`[PPT Batch] Attempt ${attempt} error:`, e.message);
      if (attempt === 2) {
        // Return simple slides + fallback content slides
        console.warn(`[PPT Batch] Using fallback for slides [${needsLLM.map(s => s.slideIndex).join(',')}]`);
        const fallbacks = needsLLM.map(s => createFallbackSlide(s));
        return [...simpleSlides, ...fallbacks];
      }
      await new Promise(r => setTimeout(r, 1500));
    }
  }

  // Fallback: return minimal slides
  const fallbacks = needsLLM.map(s => createFallbackSlide(s));
  return [...simpleSlides, ...fallbacks];
}

function createFallbackSlide(skeletonSlide: OutlineSkeleton['slides'][0]): SlideOutline {
  return {
    slideIndex: skeletonSlide.slideIndex,
    layout: 'key_points',
    title: skeletonSlide.title,
    sections: [
      {
        type: 'bullet_list',
        title: '📌 核心要点',
        leadSentence: skeletonSlide.sectionHints[0] || skeletonSlide.title,
        bullets: skeletonSlide.sectionHints.map((hint, i) => ({
          icon: ['📌', '💡', '🔑', '📊', '🎯', '🚀'][i % 6],
          title: hint.slice(0, 15),
          description: hint.slice(15, 50) || hint,
        })),
      },
      {
        type: 'insight_block',
        insightText: skeletonSlide.sectionHints.join('；').slice(0, 60) || skeletonSlide.title,
        insightLabel: '核心洞察',
      },
    ],
    quote: skeletonSlide.quote || '深度洞察，驱动决策',
    quoteLabel: skeletonSlide.quoteLabel || '核心启示',
  };
}

// ============================================================
// Utility: truncate repetitive LLM output
// ============================================================

function truncateRepetitiveContent(jsonStr: string): string {
  console.log(`[PPT Structurer] Raw LLM output length: ${jsonStr.length} chars`);

  // Quick check: if string is valid JSON, no need to process
  try {
    JSON.parse(jsonStr);
    console.log('[PPT Structurer] JSON is valid, no truncation needed');
    return jsonStr;
  } catch {
    // Continue with repair
  }

  const len = jsonStr.length;
  let cutPoint = len;
  const startCheck = Math.floor(len * 0.5);

  // Also detect short repetitive patterns like emoji spam or "成本飙升"" repeated
  // Check for very short patterns (5-30 chars) repeated 5+ times consecutively
  for (let windowSize = 5; windowSize <= 30; windowSize += 5) {
    for (let pos = startCheck; pos < len - windowSize * 5; pos++) {
      const pattern = jsonStr.slice(pos, pos + windowSize);
      // Must repeat at least 5 times consecutively
      let repeats = 0;
      let searchPos = pos;
      while (searchPos < len) {
        const nextOccurrence = jsonStr.indexOf(pattern, searchPos);
        if (nextOccurrence >= 0 && nextOccurrence <= searchPos + windowSize + 2) {
          repeats++;
          searchPos = nextOccurrence + windowSize;
        } else {
          break;
        }
      }
      if (repeats >= 5) {
        console.log(`[PPT Structurer] Short repetitive pattern (${windowSize} chars, ${repeats}x) at pos ${pos}, cutting`);
        cutPoint = Math.min(cutPoint, pos);
        break;
      }
    }
    if (cutPoint < len) break;
  }

  // Also check for longer structural repetition (120+ chars)
  if (cutPoint === len) {
    const longStartCheck = Math.floor(len * 0.7);
    for (let windowSize = 120; windowSize <= 300; windowSize += 20) {
      for (let pos = longStartCheck; pos < len - windowSize * 3; pos++) {
        const pattern = jsonStr.slice(pos, pos + windowSize);
        if (pattern.includes('"slideIndex"') || pattern.includes('"sections"')) continue;
        const next1 = jsonStr.indexOf(pattern, pos + windowSize);
        if (next1 > 0 && next1 < pos + windowSize * 3) {
          const next2 = jsonStr.indexOf(pattern, next1 + windowSize);
          if (next2 > 0 && next2 < next1 + windowSize * 3) {
            console.log(`[PPT Structurer] Long repetitive pattern (${windowSize} chars) at pos ${pos}, cutting`);
            cutPoint = Math.min(cutPoint, pos);
            break;
          }
        }
      }
      if (cutPoint < len) break;
    }
  }

  if (cutPoint < len) {
    console.log(`[PPT Structurer] Truncated from ${len} to ${cutPoint} chars`);
    jsonStr = jsonStr.slice(0, cutPoint);
  } else {
    console.log('[PPT Structurer] No repetitive pattern detected, keeping full output');
  }

  return jsonStr;
}

// ============================================================
// JSON Repair for batch output
// ============================================================

function repairBatchJSON(jsonStr: string): { slides: SlideOutline[] } | null {
  try {
    // Strategy 1: Close all open brackets/braces
    let fixed = jsonStr;
    let openBraces = 0, openBrackets = 0;
    let inStr = false, esc = false;
    for (const c of fixed) {
      if (esc) { esc = false; continue; }
      if (c === '\\' && inStr) { esc = true; continue; }
      if (c === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (c === '{') openBraces++;
      if (c === '}') openBraces--;
      if (c === '[') openBrackets++;
      if (c === ']') openBrackets--;
    }
    if (inStr) fixed += '"';
    const lastChar = fixed.trim().slice(-1);
    if (lastChar !== '}' && lastChar !== ']' && lastChar !== '"') {
      const lastComma = fixed.lastIndexOf(',');
      if (lastComma > fixed.length * 0.5) {
        fixed = fixed.slice(0, lastComma);
        openBraces = 0; openBrackets = 0; inStr = false; esc = false;
        for (const c of fixed) {
          if (esc) { esc = false; continue; }
          if (c === '\\' && inStr) { esc = true; continue; }
          if (c === '"') { inStr = !inStr; continue; }
          if (inStr) continue;
          if (c === '{') openBraces++;
          if (c === '}') openBraces--;
          if (c === '[') openBrackets++;
          if (c === ']') openBrackets--;
        }
      }
    }
    fixed += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
    const parsed = JSON.parse(fixed);
    if (parsed.slides && parsed.slides.length > 0) {
      console.log(`[PPT Batch Repair] Quick repair succeeded: ${parsed.slides.length} slides`);
      return parsed;
    }
  } catch {
    console.log('[PPT Batch Repair] Quick repair failed, trying slide extraction...');
  }

  // Strategy 2: Extract complete slide objects
  try {
    const slidesMatch = jsonStr.indexOf('"slides"');
    if (slidesMatch === -1) return null;
    const arrayStart = jsonStr.indexOf('[', slidesMatch);
    if (arrayStart === -1) return null;

    const completeSlides: string[] = [];
    let braceDepth = 0;
    let inString = false;
    let escapeNext = false;
    let slideStart = -1;

    for (let i = arrayStart + 1; i < jsonStr.length; i++) {
      const ch = jsonStr[i];
      if (escapeNext) { escapeNext = false; continue; }
      if (ch === '\\' && inString) { escapeNext = true; continue; }
      if (ch === '"' && !escapeNext) { inString = !inString; continue; }
      if (inString) continue;
      if (ch === '{') {
        if (braceDepth === 0) slideStart = i;
        braceDepth++;
      } else if (ch === '}') {
        braceDepth--;
        if (braceDepth === 0 && slideStart >= 0) {
          const slideStr = jsonStr.slice(slideStart, i + 1);
          try {
            JSON.parse(slideStr);
            completeSlides.push(slideStr);
          } catch {
            // Try fixing this slide
            try {
              const lastComma = slideStr.lastIndexOf(',\n');
              if (lastComma > slideStr.length * 0.3) {
                let sf = slideStr.slice(0, lastComma);
                let ob = 0, oq = 0, si = false, se = false;
                for (const c of sf) {
                  if (se) { se = false; continue; }
                  if (c === '\\' && si) { se = true; continue; }
                  if (c === '"') { si = !si; continue; }
                  if (si) continue;
                  if (c === '{') ob++;
                  if (c === '}') ob--;
                  if (c === '[') oq++;
                  if (c === ']') oq--;
                }
                sf += ']'.repeat(Math.max(0, oq)) + '}'.repeat(Math.max(0, ob));
                JSON.parse(sf);
                completeSlides.push(sf);
              }
            } catch { /* skip */ }
          }
          slideStart = -1;
        }
      }
    }

    if (completeSlides.length > 0) {
      const repaired = '{"slides":[' + completeSlides.join(',') + ']}';
      const parsed = JSON.parse(repaired);
      console.log(`[PPT Batch Repair] Extracted ${parsed.slides.length} complete slides`);
      return parsed;
    }
  } catch (e) {
    console.error('[PPT Batch Repair] Extraction failed:', e);
  }

  return null;
}

// ============================================================
// Post-processing (same as before)
// ============================================================

function parseTitleToBullets(text: string): BulletPoint[] {
  if (!text || text.length < 20) return [];
  const emojiSplitRegex = /(?=(?:^|\n)\s*[\p{Emoji_Presentation}\p{Extended_Pictographic}])/gu;
  const segments = text.split(emojiSplitRegex).filter(s => s.trim().length > 10);

  if (segments.length < 2) {
    const lines = text.split(/\n+/).filter(l => l.trim().length > 10);
    if (lines.length >= 2) {
      return lines.slice(0, 6).map((line, i) => {
        const emojiMatch = line.match(/^\s*([\p{Emoji_Presentation}\p{Extended_Pictographic}])\s*/u);
        const icon = emojiMatch ? emojiMatch[1] : ['📌', '💡', '🔑', '📊', '🎯', '🚀'][i % 6];
        const rest = emojiMatch ? line.slice(emojiMatch[0].length) : line;
        const colonIdx = rest.indexOf('：');
        const colonIdx2 = rest.indexOf(':');
        const splitIdx = colonIdx > 0 && colonIdx < 20 ? colonIdx : (colonIdx2 > 0 && colonIdx2 < 20 ? colonIdx2 : -1);
        if (splitIdx > 0) {
          return { icon, title: rest.slice(0, splitIdx).trim(), description: rest.slice(splitIdx + 1).trim().slice(0, 80) };
        }
        const words = rest.trim();
        const titleEnd = Math.min(words.indexOf(' ', 2), 15);
        if (titleEnd > 2) {
          return { icon, title: words.slice(0, titleEnd).trim(), description: words.slice(titleEnd).trim().slice(0, 80) };
        }
        return { icon, title: words.slice(0, 12), description: words.slice(12).slice(0, 80) };
      });
    }
    return [];
  }

  return segments.slice(0, 6).map((seg, i) => {
    const trimmed = seg.trim();
    const emojiMatch = trimmed.match(/^([\p{Emoji_Presentation}\p{Extended_Pictographic}])\s*/u);
    const icon = emojiMatch ? emojiMatch[1] : ['📌', '💡', '🔑', '📊', '🎯', '🚀'][i % 6];
    const rest = emojiMatch ? trimmed.slice(emojiMatch[0].length) : trimmed;
    const colonIdx = rest.indexOf('：');
    const colonIdx2 = rest.indexOf(':');
    const splitIdx = colonIdx > 0 && colonIdx < 25 ? colonIdx : (colonIdx2 > 0 && colonIdx2 < 25 ? colonIdx2 : -1);
    if (splitIdx > 0) {
      const title = rest.slice(0, splitIdx).trim();
      const desc = rest.slice(splitIdx + 1).trim();
      const numMatch = desc.match(/(\d+[%％万亿倍x]|\$[\d.]+[BMKbmk]?)/u);
      return { icon, title: title.slice(0, 20), description: desc.slice(0, 80), highlight: numMatch ? numMatch[1] : undefined };
    }
    const spaceIdx = rest.indexOf(' ', 4);
    if (spaceIdx > 0 && spaceIdx < 20) {
      return { icon, title: rest.slice(0, spaceIdx).trim(), description: rest.slice(spaceIdx).trim().slice(0, 80) };
    }
    return { icon, title: rest.slice(0, 15), description: rest.slice(15).slice(0, 80) };
  });
}

function postProcessOutline(outline: PPTOutline): PPTOutline {
  // Ensure first slide is title and last is closing
  if (outline.slides[0]?.layout !== 'title') outline.slides[0].layout = 'title';
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
        slide.layout = alternatives[0];
      }
    }
  }

  // Fix sections with content in title field but empty bullets/stats
  outline.slides.forEach((slide, slideIdx) => {
    if (slide.layout === 'title' || slide.layout === 'closing') return;

    slide.sections?.forEach(section => {
      const titleLen = (section.title || '').length;
      const hasBullets = section.bullets && section.bullets.length > 0;
      const hasCases = section.cases && section.cases.length > 0;
      const hasChart = section.chartData && section.chartData.items && section.chartData.items.length > 0;
      const hasStats = section.stats && section.stats.length > 0;
      const hasFlow = section.flowNodes && section.flowNodes.length > 0;
      const hasInsight = section.insightText && section.insightText.length > 0;

      if (titleLen > 100 && !hasBullets && !hasCases && !hasChart && !hasStats && !hasFlow && !hasInsight) {
        const parsed = parseTitleToBullets(section.title || '');
        if (parsed.length >= 2) {
          section.bullets = parsed;
          const firstLine = (section.title || '').split('\n')[0] || '';
          section.title = firstLine.slice(0, 30).replace(/[：:].*/u, '').trim() || undefined;
          if (section.type === 'text_block') section.type = 'bullet_list';
        }
      }

      if ((section.type === 'bullet_list' || section.type === 'text_block') && !hasBullets) {
        const content = (section as any).content;
        if (content && typeof content === 'string' && content.length > 50) {
          const parsed = parseTitleToBullets(content);
          if (parsed.length >= 2) section.bullets = parsed;
        }
      }
    });

    // Fix quad layout
    if (slide.layout === 'quad' && slide.sections.length < 4) {
      const existingSec = slide.sections[0];
      if (existingSec && existingSec.bullets && existingSec.bullets.length >= 4) {
        const allBullets = existingSec.bullets;
        const perSection = Math.ceil(allBullets.length / 4);
        const newSections: SlideSection[] = [];
        for (let i = 0; i < 4; i++) {
          const chunk = allBullets.slice(i * perSection, (i + 1) * perSection);
          if (chunk.length > 0) {
            newSections.push({ type: 'bullet_list', title: chunk[0]?.icon + ' ' + chunk[0]?.title, bullets: chunk });
          }
        }
        while (newSections.length < 4 && newSections.length > 0) {
          newSections.push({ ...newSections[newSections.length - 1] });
        }
        slide.sections = newSections;
      } else if (existingSec && (!existingSec.bullets || existingSec.bullets.length === 0)) {
        slide.layout = 'key_points';
      }
    }

    // Fix key_points
    if (slide.layout === 'key_points') {
      const bulletSec = slide.sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
      if (bulletSec && (!bulletSec.bullets || bulletSec.bullets.length === 0)) {
        if (bulletSec.title && bulletSec.title.length > 50) {
          const parsed = parseTitleToBullets(bulletSec.title);
          if (parsed.length >= 2) { bulletSec.bullets = parsed; bulletSec.title = undefined; }
        }
        if (!bulletSec.bullets || bulletSec.bullets.length === 0) {
          bulletSec.bullets = [{ icon: '📌', title: '要点', description: slide.title || '详见正文' }];
        }
      }
    }

    // Fix data_dashboard
    if (slide.layout === 'data_dashboard') {
      const statsSec = slide.sections.find(s => s.type === 'stats_block');
      if (statsSec && (!statsSec.stats || statsSec.stats.length === 0)) {
        const allText = slide.sections.map(s => (s.title || '') + ' ' + (s.bullets || []).map(b => b.title + ' ' + b.description + ' ' + (b.highlight || '')).join(' ')).join(' ');
        const numMatches = allText.match(/(\d+[%％万亿倍x]|\$[\d.]+[BMKbmk]?)/gu) || [];
        if (numMatches.length >= 2) {
          statsSec.stats = numMatches.slice(0, 4).map((n, i) => ({
            icon: ['📊', '📈', '💰', '🎯'][i % 4], number: n, label: '关键指标',
          }));
        }
      }
      const bulletSec = slide.sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
      if (bulletSec && (!bulletSec.bullets || bulletSec.bullets.length === 0) && bulletSec.title && bulletSec.title.length > 50) {
        const parsed = parseTitleToBullets(bulletSec.title);
        if (parsed.length >= 2) { bulletSec.bullets = parsed; bulletSec.title = undefined; }
      }
    }

    // Fix comparison
    if (slide.layout === 'comparison' && slide.sections.length >= 2) {
      slide.sections.slice(0, 2).forEach(sec => {
        if (!sec.bullets || sec.bullets.length === 0) {
          if (sec.title && sec.title.length > 50) {
            const parsed = parseTitleToBullets(sec.title);
            if (parsed.length >= 2) {
              const sectionLabel = parsed[0]?.title || sec.title.slice(0, 15);
              sec.bullets = parsed;
              sec.title = sectionLabel;
            }
          }
        }
      });
    }
  });

  // Ensure all bullets have icons
  outline.slides.forEach(slide => {
    slide.sections?.forEach(section => {
      section.bullets?.forEach(b => { if (!b.icon) b.icon = '📌'; });
      section.cases?.forEach(c => { if (!c.icon) c.icon = '🏢'; });
      section.flowNodes?.forEach(n => { if (!n.icon) n.icon = '🔹'; });
      section.stats?.forEach(s => { if (!s.icon) s.icon = '📊'; });
    });

    // Backward compat: populate legacy fields
    if (slide.sections && slide.sections.length > 0) {
      const bulletSection = slide.sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
      if (bulletSection?.bullets && !slide.points) slide.points = bulletSection.bullets;
      const chartSection = slide.sections.find(s => s.type === 'chart_block' || s.type === 'progress_block');
      if (chartSection?.chartData && !slide.chartData) slide.chartData = chartSection.chartData;
      const flowSection = slide.sections.find(s => s.type === 'flow_block');
      if (flowSection?.flowNodes && !slide.processFlow) slide.processFlow = flowSection.flowNodes;
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
// Main export: Two-phase batch generation
// ============================================================

export type ProgressCallback = (phase: string, detail: string, pct: number) => void;

export async function structureTextToPPTOutline(
  inputText: string,
  onProgress?: ProgressCallback,
): Promise<PPTOutline> {
  // Determine target pages based on text length
  const charCount = inputText.length;
  let targetPages: number;
  if (charCount < 1000) targetPages = 8;
  else if (charCount < 3000) targetPages = 12;
  else if (charCount < 6000) targetPages = 16;
  else if (charCount < 10000) targetPages = 20;
  else targetPages = 24;

  console.log(`[PPT] Input: ${charCount} chars → target ${targetPages} pages`);

  // Phase 1: Generate outline skeleton
  onProgress?.('structuring', '正在生成PPT大纲...', 5);
  const skeleton = await generateOutlineSkeleton(inputText, targetPages);
  onProgress?.('structuring', `大纲完成：${skeleton.slides.length}页`, 15);

  // Phase 2: Generate content in batches of 3-4 slides
  const BATCH_SIZE = 3;
  const contentIndices: number[] = [];
  for (let i = 0; i < skeleton.slides.length; i++) {
    contentIndices.push(i);
  }

  const batches: number[][] = [];
  for (let i = 0; i < contentIndices.length; i += BATCH_SIZE) {
    batches.push(contentIndices.slice(i, i + BATCH_SIZE));
  }

  const allSlides: SlideOutline[] = [];
  const progressPerBatch = 60 / batches.length;  // 15% to 75% for content generation

  for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
    const batch = batches[batchIdx];
    const pct = Math.round(15 + (batchIdx + 1) * progressPerBatch);
    const batchDesc = `正在生成第${batch[0] + 1}-${batch[batch.length - 1] + 1}页内容...`;
    onProgress?.('structuring', batchDesc, pct);

    console.log(`[PPT] Batch ${batchIdx + 1}/${batches.length}: slides [${batch.join(',')}]`);
    const batchSlides = await generateSlidesBatch(inputText, skeleton, batch);
    allSlides.push(...batchSlides);
  }

  // Sort by slideIndex and build final outline
  allSlides.sort((a, b) => a.slideIndex - b.slideIndex);

  const outline: PPTOutline = {
    presentationTitle: skeleton.presentationTitle,
    presentationSubtitle: skeleton.presentationSubtitle,
    slides: allSlides,
  };

  // Post-process
  onProgress?.('structuring', '正在优化内容结构...', 80);
  const processed = postProcessOutline(outline);

  console.log(`[PPT] Final outline: ${processed.slides.length} slides`);
  return processed;
}
