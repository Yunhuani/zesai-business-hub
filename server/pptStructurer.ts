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

const SYSTEM_PROMPT = `你是顶级商业咨询PPT策划师。将客户文本转化为咨询级PPT大纲。

## 核心原则
你是“内容增值引擎”：原文结构化呈现 + 补充案例数据洞察 + 清晰信息架构。

## 关键规则
1. 分析原文逻辑后重新组织，不按原文顺序平铺
2. 标题必须是观点/结论式（如“AI Agent将取代40%重复性工作”）
3. 每页必须有quote金句
4. 布局多样化，禁止连续相同布局
5. 总页数8-12页，不用section分隔页
6. 严禁在任何字段中重复内容，每个字段只写一次

## 区块类型及必填字段
- text_block/bullet_list: 必填bullets数组(3-5个)，每个{icon,title(3-8字),description(20-40字)}
- chart_block: 必填chartData{type,title,items[{label,value}](4-6个),source}
- case_block: 必填cases数组(2-3个)，每个{icon,company,traditional(15-30字),transformed(15-30字),valueProposition(15-30字)}
- stats_block: 必填stats数组(3-4个)，每个{icon,number,label}
- flow_block: 必填flowNodes数组(4-5个)，每个{icon,label}
- insight_block: 必填insightText(20-50字),insightLabel
- progress_block: 必填chartData(type="progress",items4-6个)

## 布局类型及要求
- title: 封面，sections空数组
- quad: 4个不同类型区块（核心布局，至少用3次）
- two_col_mixed: 2个区块（左文右图）
- case_cards: 2-3个case_block，每个必须有完整的cases数组
- comparison: 2个bullet_list（旧vs新），必须有leftLabel和rightLabel
- key_points: 1个bullet_list(4-6个bullets) + 可选1个stats_block
- data_dashboard: stats_block(3-4个) + chart_block + bullet_list
- timeline: 1个bullet_list(4-5个步骤)
- closing: 结束页，sections空数组

## 重要规则
- section.title只写8字以内短标题，内容放在结构化字段中
- description控制15-30字，简洁有力
- case_cards布局必须有2-3个case_block section，每个都有完整cases数组
- 确保JSON完整闭合

请严格按JSON Schema输出。简体中文。`;

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

/**
 * Parse a long text (often dumped into section.title by LLM) into structured BulletPoints.
 * Recognizes patterns like: emoji Title: Description  or  emoji Title Description
 */
function parseTitleToBullets(text: string): BulletPoint[] {
  if (!text || text.length < 20) return [];
  
  // Split by emoji patterns at the start of segments
  const emojiSplitRegex = /(?=(?:^|\n)\s*[\p{Emoji_Presentation}\p{Extended_Pictographic}])/gu;
  const segments = text.split(emojiSplitRegex).filter(s => s.trim().length > 10);
  
  if (segments.length < 2) {
    // Try splitting by newlines or sentence boundaries
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
        // Split at first space after 2-8 chars
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
    
    // Find title: text before first colon (Chinese or English) within first 20 chars
    const colonIdx = rest.indexOf('：');
    const colonIdx2 = rest.indexOf(':');
    const splitIdx = colonIdx > 0 && colonIdx < 25 ? colonIdx : (colonIdx2 > 0 && colonIdx2 < 25 ? colonIdx2 : -1);
    
    if (splitIdx > 0) {
      const title = rest.slice(0, splitIdx).trim();
      const desc = rest.slice(splitIdx + 1).trim();
      // Extract highlight number if present
      const numMatch = desc.match(/(\d+[%％万亿倍x]|\$[\d.]+[BMKbmk]?)/u);
      return {
        icon,
        title: title.slice(0, 20),
        description: desc.slice(0, 80),
        highlight: numMatch ? numMatch[1] : undefined,
      };
    }
    
    // No colon, split at reasonable point
    const spaceIdx = rest.indexOf(' ', 4);
    if (spaceIdx > 0 && spaceIdx < 20) {
      return { icon, title: rest.slice(0, spaceIdx).trim(), description: rest.slice(spaceIdx).trim().slice(0, 80) };
    }
    return { icon, title: rest.slice(0, 15), description: rest.slice(15).slice(0, 80) };
  });
}

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

  // ============================================================
  // CRITICAL: Fix sections with content in title field but empty bullets/stats
  // LLM sometimes dumps all content into section.title as a long string
  // ============================================================
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
      
      // If title is very long (>100 chars) and no structured data, parse title into bullets
      if (titleLen > 100 && !hasBullets && !hasCases && !hasChart && !hasStats && !hasFlow && !hasInsight) {
        console.log(`[PPT V3] Slide ${slideIdx}: Parsing long title (${titleLen} chars) into bullets for section type=${section.type}`);
        const parsed = parseTitleToBullets(section.title || '');
        if (parsed.length >= 2) {
          section.bullets = parsed;
          // Set a short title from the first few words
          const firstLine = (section.title || '').split('\n')[0] || '';
          const shortTitle = firstLine.slice(0, 30).replace(/[：:].*/u, '').trim();
          section.title = shortTitle || undefined;
          // Force type to bullet_list if it was text_block
          if (section.type === 'text_block') {
            section.type = 'bullet_list';
          }
        }
      }
      
      // If bullet_list/text_block has content field but no bullets, parse content
      if ((section.type === 'bullet_list' || section.type === 'text_block') && !hasBullets) {
        const content = (section as any).content;
        if (content && typeof content === 'string' && content.length > 50) {
          const parsed = parseTitleToBullets(content);
          if (parsed.length >= 2) {
            section.bullets = parsed;
          }
        }
      }
    });
    
    // ============================================================
    // Fix quad layout: must have 4 sections
    // If only 1 section with parsed bullets, split into 4 bullet_list sections
    // ============================================================
    if (slide.layout === 'quad' && slide.sections.length < 4) {
      const existingSec = slide.sections[0];
      if (existingSec && existingSec.bullets && existingSec.bullets.length >= 4) {
        console.log(`[PPT V3] Slide ${slideIdx}: Splitting ${existingSec.bullets.length} bullets into 4 quad sections`);
        const allBullets = existingSec.bullets;
        const perSection = Math.ceil(allBullets.length / 4);
        const newSections: SlideSection[] = [];
        for (let i = 0; i < 4; i++) {
          const chunk = allBullets.slice(i * perSection, (i + 1) * perSection);
          if (chunk.length > 0) {
            newSections.push({
              type: 'bullet_list',
              title: chunk[0]?.icon + ' ' + chunk[0]?.title,
              bullets: chunk,
            });
          }
        }
        // Pad to 4 if needed
        while (newSections.length < 4 && newSections.length > 0) {
          newSections.push({ ...newSections[newSections.length - 1] });
        }
        slide.sections = newSections;
      } else if (existingSec && (!existingSec.bullets || existingSec.bullets.length === 0)) {
        // No bullets at all, downgrade to key_points
        console.log(`[PPT V3] Slide ${slideIdx}: Downgrading quad to key_points (no bullets)`);
        slide.layout = 'key_points';
      }
    }
    
    // ============================================================
    // Fix key_points: bullet_list must have bullets
    // ============================================================
    if (slide.layout === 'key_points') {
      const bulletSec = slide.sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
      if (bulletSec && (!bulletSec.bullets || bulletSec.bullets.length === 0)) {
        // Try to parse from title
        if (bulletSec.title && bulletSec.title.length > 50) {
          const parsed = parseTitleToBullets(bulletSec.title);
          if (parsed.length >= 2) {
            bulletSec.bullets = parsed;
            bulletSec.title = undefined;
          }
        }
        // Still empty? Create placeholder bullets from slide title
        if (!bulletSec.bullets || bulletSec.bullets.length === 0) {
          bulletSec.bullets = [{ icon: '📌', title: '要点', description: slide.title || '详见正文' }];
        }
      }
    }
    
    // ============================================================
    // Fix data_dashboard: stats_block must have stats
    // ============================================================
    if (slide.layout === 'data_dashboard') {
      const statsSec = slide.sections.find(s => s.type === 'stats_block');
      if (statsSec && (!statsSec.stats || statsSec.stats.length === 0)) {
        // Try to extract numbers from title or other sections
        const allText = slide.sections.map(s => (s.title || '') + ' ' + (s.bullets || []).map(b => b.title + ' ' + b.description + ' ' + (b.highlight || '')).join(' ')).join(' ');
        const numMatches = allText.match(/(\d+[%％万亿倍x]|\$[\d.]+[BMKbmk]?)/gu) || [];
        if (numMatches.length >= 2) {
          statsSec.stats = numMatches.slice(0, 4).map((n, i) => ({
            icon: ['📊', '📈', '💰', '🎯'][i % 4],
            number: n,
            label: '关键指标',
          }));
        }
      }
      // Fix bullet_list in data_dashboard
      const bulletSec = slide.sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
      if (bulletSec && (!bulletSec.bullets || bulletSec.bullets.length === 0) && bulletSec.title && bulletSec.title.length > 50) {
        const parsed = parseTitleToBullets(bulletSec.title);
        if (parsed.length >= 2) {
          bulletSec.bullets = parsed;
          bulletSec.title = undefined;
        }
      }
    }
    
    // ============================================================
    // Fix comparison: both sides must have bullets
    // ============================================================
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

  // Ensure all bullets have icons (after parsing)
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
      const bulletSection = slide.sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
      if (bulletSection?.bullets && !slide.points) {
        slide.points = bulletSection.bullets;
      }
      const chartSection = slide.sections.find(s => s.type === 'chart_block' || s.type === 'progress_block');
      if (chartSection?.chartData && !slide.chartData) {
        slide.chartData = chartSection.chartData;
      }
      const flowSection = slide.sections.find(s => s.type === 'flow_block');
      if (flowSection?.flowNodes && !slide.processFlow) {
        slide.processFlow = flowSection.flowNodes;
      }
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
// Pre-process: truncate repetitive content in LLM output
// ============================================================

function truncateRepetitiveContent(jsonStr: string): string {
  // Quick check: if string is valid JSON, no need to process
  try {
    JSON.parse(jsonStr);
    return jsonStr;
  } catch {
    // Continue with repair
  }
  
  // Strategy: scan from the end backwards to find where repetition starts
  // Look for any 15+ char pattern that repeats 3+ times
  const len = jsonStr.length;
  let cutPoint = len;
  
  // Check from 60% of the string onwards for repetition
  const startCheck = Math.floor(len * 0.5);
  
  for (let windowSize = 15; windowSize <= 80; windowSize += 5) {
    for (let pos = startCheck; pos < len - windowSize * 3; pos++) {
      const pattern = jsonStr.slice(pos, pos + windowSize);
      // Check if this pattern appears again within 2x window
      const next1 = jsonStr.indexOf(pattern, pos + windowSize);
      if (next1 > 0 && next1 < pos + windowSize * 2) {
        const next2 = jsonStr.indexOf(pattern, next1 + windowSize);
        if (next2 > 0 && next2 < next1 + windowSize * 2) {
          // Found 3 consecutive occurrences - cut before first
          console.log(`[PPT Structurer] Repetitive pattern (${windowSize} chars) at pos ${pos}, cutting`);
          cutPoint = Math.min(cutPoint, pos);
          break;
        }
      }
    }
    if (cutPoint < len) break;
  }
  
  if (cutPoint < len) {
    jsonStr = jsonStr.slice(0, cutPoint);
  }
  
  return jsonStr;
}

// ============================================================
// JSON Repair for truncated LLM output
// ============================================================

function repairTruncatedJSON(jsonStr: string): PPTOutline | null {
  try {
    // Strategy: use regex to find complete slide objects (between matching braces)
    // by looking for the pattern: { "slideIndex": N, ... }
    
    const slidesMatch = jsonStr.indexOf('"slides"');
    if (slidesMatch === -1) return null;
    
    const arrayStart = jsonStr.indexOf('[', slidesMatch);
    if (arrayStart === -1) return null;
    
    // Extract the header (everything before slides array)
    const header = jsonStr.slice(0, arrayStart + 1);
    
    // Find all complete slide objects using brace matching
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
          // Verify this is a valid JSON object
          try {
            JSON.parse(slideStr);
            completeSlides.push(slideStr);
          } catch {
            // This slide object has issues, try to fix common problems
            // Truncated string values - find last complete key-value pair
            try {
              // Remove everything after the last complete property
              const lastCompleteComma = slideStr.lastIndexOf(',\n');
              if (lastCompleteComma > slideStr.length * 0.3) {
                // Close all open arrays and objects
                let fixed = slideStr.slice(0, lastCompleteComma);
                // Count open brackets
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
                fixed += ']'.repeat(Math.max(0, openBrackets)) + '}'.repeat(Math.max(0, openBraces));
                JSON.parse(fixed);
                completeSlides.push(fixed);
              }
            } catch {
              // Skip this slide entirely
            }
          }
          slideStart = -1;
        }
      }
    }
    
    if (completeSlides.length < 2) return null;
    
    // Reconstruct JSON
    const repaired = header + '\n    ' + completeSlides.join(',\n    ') + '\n  ]\n}';
    
    const parsed: PPTOutline = JSON.parse(repaired);
    if (parsed.presentationTitle && parsed.slides && parsed.slides.length >= 2) {
      console.log(`[PPT Structurer] Repaired JSON: ${parsed.slides.length} slides recovered from ${completeSlides.length} complete objects`);
      
      // Add closing slide if missing
      const lastSlide = parsed.slides[parsed.slides.length - 1];
      if (lastSlide.layout !== 'closing') {
        parsed.slides.push({
          slideIndex: parsed.slides.length,
          layout: 'closing',
          title: '感谢观看',
          subtitle: parsed.presentationSubtitle || '',
          sections: [],
          quote: '未来已来，唯变不变',
          quoteLabel: '结束语',
        });
      }
      return parsed;
    }
    return null;
  } catch (e) {
    console.error('[PPT Structurer] Repair exception:', e);
    return null;
  }
}

// ============================================================
// Main export
// ============================================================

export async function structureTextToPPTOutline(inputText: string): Promise<PPTOutline> {
  const userPrompt = `请将以下文本转化为PPT大纲：

---
${inputText}
---

要求：8-12页，补充案例数据，观点式标题，布局多样化。section.title只写8字以内短标题。description控制15-30字。严禁重复内容。确保JSON完整闭合。`;

  const result = await invokeLLM({
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: userPrompt },
    ],
    responseFormat: {
      type: 'json_schema',
      json_schema: OUTPUT_SCHEMA,
    },
    maxTokens: 16000,
  });

  const content = result.choices[0]?.message?.content;
  if (!content || typeof content !== 'string') {
    throw new Error('LLM返回内容为空');
  }

  // Try to extract JSON from the response
  let jsonStr = content.trim();
  // Sometimes LLM wraps JSON in markdown code blocks
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }
  
  // Pre-process: detect and truncate repetitive content patterns
  jsonStr = truncateRepetitiveContent(jsonStr);
  
  try {
    const outline: PPTOutline = JSON.parse(jsonStr);
    if (!outline.presentationTitle || !outline.slides || outline.slides.length < 3) {
      console.error('[PPT Structurer] Incomplete outline:', JSON.stringify(outline).slice(0, 200));
      throw new Error('PPT大纲结构不完整');
    }
    return postProcessOutline(outline);
  } catch (e) {
    if (e instanceof SyntaxError) {
      console.log('[PPT Structurer] JSON parse failed, attempting truncation repair...');
      // Try to repair truncated JSON by finding the last complete slide
      const repaired = repairTruncatedJSON(jsonStr);
      if (repaired) {
        console.log('[PPT Structurer] JSON repair succeeded');
        return postProcessOutline(repaired);
      }
      console.error('[PPT Structurer] JSON repair failed. First 500 chars:', content.slice(0, 500));
      console.error('[PPT Structurer] Last 200 chars:', content.slice(-200));
      throw new Error('LLM返回的JSON格式无效，请重试');
    }
    throw e;
  }
}
