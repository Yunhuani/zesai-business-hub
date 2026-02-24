/**
 * PPT Slide Renderer V3
 * Multi-block composite pages with rich visual design
 */
import puppeteer, { Browser } from 'puppeteer';
import type {
  SlideOutline, PageLayout, SlideSection, BulletPoint,
  ChartData, CaseStudy, FlowNode, StatCard,
} from './pptStructurer';

// ============================================================
// Color Schemes
// ============================================================
export interface ColorScheme {
  name: string;
  bg: string;
  bgGradient: string;
  accent: string;         // Primary accent (orange-like)
  accentLight: string;
  accentDark: string;
  accentSecondary: string; // Secondary accent (green-like)
  positive: string;       // Green for positive/new
  negative: string;       // Red for negative/old
  text: string;
  textSecondary: string;
  cardBg: string;
  cardBorder: string;
  blockBg: string;        // Slightly different bg for blocks
  quoteBg: string;
  insightBg: string;      // Background for insight blocks
}

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  forest_gold: {
    name: '森林金',
    bg: '#0a1a0f',
    bgGradient: 'linear-gradient(135deg, #0a1a0f 0%, #0f2518 40%, #0d1f14 100%)',
    accent: '#c8a951',
    accentLight: '#e8d48b',
    accentDark: '#8a7235',
    accentSecondary: '#5dba7d',
    positive: '#5dba7d',
    negative: '#d45d5d',
    text: '#f0ede4',
    textSecondary: '#a8b5a0',
    cardBg: 'rgba(200,169,81,0.07)',
    cardBorder: 'rgba(200,169,81,0.15)',
    blockBg: 'rgba(200,169,81,0.04)',
    quoteBg: 'rgba(200,169,81,0.06)',
    insightBg: 'rgba(93,186,125,0.08)',
  },
  deep_blue: {
    name: '深海蓝',
    bg: '#080c1a',
    bgGradient: 'linear-gradient(135deg, #080c1a 0%, #0d1530 40%, #0a1025 100%)',
    accent: '#f0a030',
    accentLight: '#f5c060',
    accentDark: '#c07820',
    accentSecondary: '#4a90d9',
    positive: '#2ecc71',
    negative: '#e74c3c',
    text: '#e8ecf4',
    textSecondary: '#8899b5',
    cardBg: 'rgba(240,160,48,0.06)',
    cardBorder: 'rgba(240,160,48,0.15)',
    blockBg: 'rgba(74,144,217,0.05)',
    quoteBg: 'rgba(240,160,48,0.06)',
    insightBg: 'rgba(46,204,113,0.08)',
  },
  zenith_purple: {
    name: '泽思紫',
    bg: '#0c081a',
    bgGradient: 'linear-gradient(135deg, #0c081a 0%, #150d30 40%, #100a25 100%)',
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
    accentDark: '#5b3aaa',
    accentSecondary: '#f59e0b',
    positive: '#34d399',
    negative: '#f87171',
    text: '#ede8f5',
    textSecondary: '#9b8ab5',
    cardBg: 'rgba(139,92,246,0.07)',
    cardBorder: 'rgba(139,92,246,0.15)',
    blockBg: 'rgba(139,92,246,0.04)',
    quoteBg: 'rgba(139,92,246,0.06)',
    insightBg: 'rgba(52,211,153,0.08)',
  },
  classic_dark: {
    name: '经典深色',
    bg: '#1a1a1a',
    bgGradient: 'linear-gradient(135deg, #1a1a1a 0%, #222222 40%, #1e1e1e 100%)',
    accent: '#f0a030',
    accentLight: '#f5c060',
    accentDark: '#c07820',
    accentSecondary: '#2ecc71',
    positive: '#2ecc71',
    negative: '#e74c3c',
    text: '#f5f5f5',
    textSecondary: '#999999',
    cardBg: 'rgba(255,255,255,0.04)',
    cardBorder: 'rgba(255,255,255,0.10)',
    blockBg: 'rgba(255,255,255,0.03)',
    quoteBg: 'rgba(240,160,48,0.06)',
    insightBg: 'rgba(46,204,113,0.08)',
  },
};

// ============================================================
// Theme Styles
// ============================================================
export interface ThemeStyle {
  name: string;
  fontFamily: string;
  headingWeight: number;
}

export const THEME_STYLES: Record<string, ThemeStyle> = {
  business: { name: '商务专业', fontFamily: '"Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", sans-serif', headingWeight: 700 },
  tech: { name: '科技未来', fontFamily: '"Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", sans-serif', headingWeight: 600 },
  simple: { name: '简约素雅', fontFamily: '"Noto Serif CJK SC", "Noto Serif SC", serif', headingWeight: 500 },
  creative: { name: '创意活力', fontFamily: '"Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", sans-serif', headingWeight: 800 },
};

// ============================================================
// Shared Components
// ============================================================

const SLIDE_W = 1280;
const SLIDE_H = 720;
const PAD_X = 48;
const PAD_TOP = 32;
const PAD_BOT = 20;
const TITLE_H = 70;
const QUOTE_H = 60;
const FOOTER_H = 28;
const CONTENT_H = SLIDE_H - PAD_TOP - TITLE_H - QUOTE_H - FOOTER_H - PAD_BOT;

/** Background decorations */
function bgDeco(colors: ColorScheme): string {
  return `<div style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;">
    <div style="position:absolute;top:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,${colors.accent}08,transparent 70%);"></div>
    <div style="position:absolute;bottom:-60px;left:-60px;width:300px;height:300px;background:radial-gradient(circle,${colors.accentSecondary}06,transparent 70%);"></div>
  </div>`;
}

/** Title bar with accent left border */
function titleBar(title: string, subtitle: string | undefined, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="padding:0 0 12px 0;margin-bottom:8px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:4px;height:28px;background:${colors.accent};border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:24px;font-weight:${theme.headingWeight};color:${colors.text};margin:0;line-height:1.3;">${title}</h2>
    </div>
    ${subtitle ? `<p style="font-size:13px;color:${colors.textSecondary};margin:6px 0 0 16px;line-height:1.3;">${subtitle}</p>` : ''}
  </div>`;
}

/** Quote block at bottom */
function quoteBlock(quote: string | undefined, quoteLabel: string | undefined, colors: ColorScheme): string {
  if (!quote) return `<div style="height:${QUOTE_H}px;"></div>`;
  const label = quoteLabel || '核心洞察';
  return `<div style="height:${QUOTE_H}px;display:flex;align-items:center;gap:10px;padding:8px 16px;background:${colors.quoteBg};border-left:3px solid ${colors.accent};border-radius:0 4px 4px 0;margin-top:auto;">
    <span style="font-size:22px;color:${colors.accent};font-family:Georgia,serif;line-height:1;flex-shrink:0;">"</span>
    <div style="flex:1;min-width:0;">
      <span style="font-size:10px;color:${colors.accent};font-weight:600;letter-spacing:0.5px;">${label}</span>
      <p style="font-size:11px;color:${colors.accentLight};margin:2px 0 0;line-height:1.5;font-style:italic;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${quote}</p>
    </div>
    <span style="font-size:22px;color:${colors.accent};font-family:Georgia,serif;line-height:1;flex-shrink:0;">"</span>
  </div>`;
}

/** Footer */
function footer(index: number, total: number, colors: ColorScheme, note?: string): string {
  return `<div style="height:${FOOTER_H}px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${colors.cardBorder};padding-top:6px;">
    ${note ? `<span style="font-size:9px;color:${colors.textSecondary};opacity:0.5;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${note}</span>` : '<span></span>'}
    <span style="font-size:9px;color:${colors.textSecondary};opacity:0.4;">泽思AI · ${index + 1}/${total}</span>
  </div>`;
}

// ============================================================
// Section Renderers (individual blocks)
// ============================================================

/** Render a text_block or bullet_list section */
function renderBulletSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const bullets = section.bullets || [];
  const title = section.title || '';
  const lead = section.leadSentence || '';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
    ${title ? `<div style="font-size:13px;font-weight:700;color:${colors.text};margin-bottom:4px;display:flex;align-items:center;gap:4px;">${title}</div>` : ''}
    ${lead ? `<div style="font-size:10px;color:${colors.textSecondary};margin-bottom:6px;line-height:1.4;">${lead}</div>` : ''}
    <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;gap:4px;">
      ${bullets.map(b => `<div style="display:flex;align-items:flex-start;gap:6px;padding:4px 0;">
        <span style="font-size:13px;flex-shrink:0;line-height:1;">${b.icon || '📌'}</span>
        <div style="flex:1;min-width:0;">
          <span style="font-size:11px;font-weight:600;color:${colors.text};">${b.title}</span>
          <span style="font-size:10px;color:${colors.textSecondary};margin-left:4px;">${b.description}</span>
          ${b.highlight ? `<span style="font-size:11px;font-weight:700;color:${colors.accent};margin-left:4px;">${b.highlight}</span>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

/** Render chart_block or progress_block */
function renderChartSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const cd = section.chartData;
  if (!cd) return '';
  
  const title = section.title || cd.title || '';
  const source = cd.source || '';
  
  if (cd.type === 'progress') {
    // Progress bars
    const items = cd.items.slice(0, 4);
    return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
      ${title ? `<div style="font-size:13px;font-weight:700;color:${colors.text};margin-bottom:8px;">${title}</div>` : ''}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;">
        ${items.map((item, i) => {
          const pct = Math.min(item.value, 100);
          const barColor = i % 2 === 0 ? colors.accent : colors.accentSecondary;
          return `<div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:11px;color:${colors.text};">${item.label}</span>
              <span style="font-size:12px;font-weight:700;color:${barColor};">${item.value}${cd.unit || '%'}</span>
            </div>
            <div style="height:8px;background:${colors.cardBg};border-radius:4px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
      ${source ? `<div style="font-size:8px;color:${colors.textSecondary};opacity:0.4;margin-top:4px;">数据来源：${source}</div>` : ''}
    </div>`;
  }
  
  if (cd.type === 'line') {
    // Vertical bar chart (line-like)
    const maxVal = Math.max(...cd.items.map(d => d.value), 1);
    return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
      ${title ? `<div style="font-size:13px;font-weight:700;color:${colors.text};margin-bottom:8px;">${title}</div>` : ''}
      <div style="flex:1;display:flex;align-items:flex-end;gap:6px;padding-bottom:20px;">
        ${cd.items.map((item, i) => {
          const hPct = Math.round((item.value / maxVal) * 100);
          const barColor = i % 2 === 0 ? colors.accent : colors.accentSecondary;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
            <div style="font-size:10px;font-weight:700;color:${barColor};margin-bottom:4px;">${item.value}${cd.unit || ''}</div>
            <div style="width:70%;height:${hPct}%;background:linear-gradient(180deg,${barColor},${barColor}60);border-radius:3px 3px 0 0;min-height:4px;"></div>
            <div style="font-size:9px;color:${colors.textSecondary};margin-top:4px;text-align:center;">${item.label}</div>
          </div>`;
        }).join('')}
      </div>
      ${source ? `<div style="font-size:8px;color:${colors.textSecondary};opacity:0.4;">${source}</div>` : ''}
    </div>`;
  }
  
  // Bar chart (horizontal)
  const maxVal = Math.max(...cd.items.map(d => d.value), 1);
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
    ${title ? `<div style="font-size:13px;font-weight:700;color:${colors.text};margin-bottom:8px;">${title}</div>` : ''}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:8px;">
      ${cd.items.map((item, i) => {
        const pct = Math.round((item.value / maxVal) * 100);
        const barColor = i % 2 === 0 ? colors.accent : colors.accentSecondary;
        return `<div style="display:flex;align-items:center;gap:8px;">
          <div style="width:70px;font-size:10px;color:${colors.textSecondary};text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.label}</div>
          <div style="flex:1;height:18px;background:${colors.cardBg};border-radius:3px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:${barColor};border-radius:3px;"></div>
          </div>
          <div style="width:50px;font-size:11px;font-weight:700;color:${barColor};flex-shrink:0;">${item.value}${cd.unit || ''}</div>
        </div>`;
      }).join('')}
    </div>
    ${source ? `<div style="font-size:8px;color:${colors.textSecondary};opacity:0.4;margin-top:4px;">${source}</div>` : ''}
  </div>`;
}

/** Render case_block */
function renderCaseSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const cases = section.cases || [];
  if (cases.length === 0) return '';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;gap:8px;justify-content:stretch;">
    ${cases.map(c => {
      return `<div style="flex:1;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-left:3px solid ${colors.accent};border-radius:4px;padding:12px 14px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
          <span style="font-size:16px;">${c.icon || '🏢'}</span>
          <span style="font-size:13px;font-weight:700;color:${colors.text};">${c.company}</span>
          ${c.industry ? `<span style="font-size:9px;color:${colors.accent};background:${colors.accent}15;padding:1px 6px;border-radius:8px;">${c.industry}</span>` : ''}
        </div>
        <div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:4px;">
          <span style="font-size:9px;color:${colors.negative};flex-shrink:0;">⬤</span>
          <span style="font-size:10px;color:${colors.textSecondary};line-height:1.4;">${c.traditional}</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:4px;margin-bottom:4px;">
          <span style="font-size:9px;color:${colors.positive};flex-shrink:0;">⬤</span>
          <span style="font-size:10px;color:${colors.textSecondary};line-height:1.4;">${c.transformed}</span>
        </div>
        <div style="background:${colors.accent}12;padding:4px 8px;border-radius:3px;margin-top:2px;">
          <span style="font-size:10px;font-weight:600;color:${colors.accent};">💡 ${c.valueProposition}</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/** Render insight_block */
function renderInsightSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const label = section.insightLabel || '核心洞察';
  const text = section.insightText || '';
  if (!text) return '';
  
  return `<div style="height:${maxH}px;overflow:hidden;background:${colors.insightBg};border:1px solid ${colors.positive}20;border-radius:6px;padding:12px 14px;display:flex;flex-direction:column;justify-content:center;">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px;">
      <span style="font-size:14px;">💡</span>
      <span style="font-size:12px;font-weight:700;color:${colors.positive};">${label}</span>
    </div>
    <p style="font-size:11px;color:${colors.text};line-height:1.6;margin:0;">${text}</p>
  </div>`;
}

/** Render flow_block */
function renderFlowSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const nodes = section.flowNodes || [];
  if (nodes.length === 0) return '';
  const title = section.title || '';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
    ${title ? `<div style="font-size:13px;font-weight:700;color:${colors.text};margin-bottom:8px;">${title}</div>` : ''}
    <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:4px;flex-wrap:nowrap;">
      ${nodes.map((n, i) => {
        const nodeColor = i % 2 === 0 ? colors.accent : colors.accentSecondary;
        const arrow = i < nodes.length - 1 ? `<div style="color:${colors.accent};font-size:16px;flex-shrink:0;">→</div>` : '';
        return `<div style="display:flex;align-items:center;gap:4px;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:4px;min-width:60px;">
            <div style="width:40px;height:40px;border-radius:50%;background:${nodeColor}18;border:2px solid ${nodeColor};display:flex;align-items:center;justify-content:center;font-size:18px;">${n.icon}</div>
            <div style="font-size:9px;color:${colors.text};font-weight:500;text-align:center;max-width:70px;line-height:1.2;">${n.label}</div>
          </div>
          ${arrow}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/** Render stats_block */
function renderStatsSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const stats = section.stats || [];
  if (stats.length === 0) return '';
  const title = section.title || '';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">
    ${title ? `<div style="font-size:13px;font-weight:700;color:${colors.text};margin-bottom:8px;">${title}</div>` : ''}
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;">
      ${stats.map(s => `<div style="flex:1;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:10px 8px;text-align:center;">
        <div style="font-size:14px;margin-bottom:4px;">${s.icon || '📊'}</div>
        <div style="font-size:20px;font-weight:800;color:${colors.accent};margin-bottom:2px;">${s.number}</div>
        <div style="font-size:9px;color:${colors.textSecondary};line-height:1.3;">${s.label}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

/** Generic section renderer dispatcher */
function renderSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  switch (section.type) {
    case 'text_block':
    case 'bullet_list':
      return renderBulletSection(section, colors, maxH);
    case 'chart_block':
    case 'progress_block':
      return renderChartSection(section, colors, maxH);
    case 'case_block':
      return renderCaseSection(section, colors, maxH);
    case 'insight_block':
      return renderInsightSection(section, colors, maxH);
    case 'flow_block':
      return renderFlowSection(section, colors, maxH);
    case 'stats_block':
      return renderStatsSection(section, colors, maxH);
    default:
      return renderBulletSection(section, colors, maxH);
  }
}

// ============================================================
// Page Layout Renderers
// ============================================================

function renderTitlePage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:80px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h1 style="font-size:40px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 24px;line-height:1.4;letter-spacing:2px;">${slide.title}</h1>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;letter-spacing:1px;font-weight:300;line-height:1.6;">${slide.subtitle}</p>` : ''}
    <div style="width:30px;height:2px;background:${colors.accent};margin-top:48px;opacity:0.4;border-radius:1px;"></div>
    <div style="position:absolute;bottom:40px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

function renderClosingPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:60px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h2 style="font-size:36px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 20px;letter-spacing:3px;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;letter-spacing:1px;font-weight:300;line-height:1.6;">${slide.subtitle}</p>` : ''}
    ${slide.quote ? `<div style="margin-top:40px;max-width:600px;"><p style="font-size:14px;color:${colors.accentLight};font-style:italic;line-height:1.7;">"${slide.quote}"</p></div>` : ''}
    <div style="margin-top:60px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

/** Quad layout: 2x2 grid of 4 different section types */
function renderQuadPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const s = [sections[0], sections[1], sections[2], sections[3]].filter(Boolean);
  const blockH = Math.floor((CONTENT_H - 12) / 2); // 2 rows with gap
  const halfW = `calc(50% - 6px)`;
  
  const renderBlock = (sec: SlideSection | undefined, h: number) => {
    if (!sec) return `<div style="width:${halfW};height:${h}px;"></div>`;
    return `<div style="width:${halfW};height:${h}px;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:10px 12px;overflow:hidden;">
      ${renderSection(sec, colors, h - 24)}
    </div>`;
  };

  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;flex-wrap:wrap;gap:12px;align-content:flex-start;">
      ${renderBlock(s[0], blockH)}
      ${renderBlock(s[1], blockH)}
      ${renderBlock(s[2], blockH)}
      ${renderBlock(s[3], blockH)}
    </div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Two column mixed: left text + right visual */
function renderTwoColMixedPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const leftSec = sections[0];
  const rightSec = sections[1];
  const contentH = CONTENT_H;

  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;gap:16px;">
      <div style="flex:1;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:12px 14px;overflow:hidden;">
        ${leftSec ? renderSection(leftSec, colors, contentH - 28) : ''}
      </div>
      <div style="flex:1;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:12px 14px;overflow:hidden;">
        ${rightSec ? renderSection(rightSec, colors, contentH - 28) : ''}
      </div>
    </div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Case cards: 2-3 case study cards side by side */
function renderCaseCardsPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const caseSections = sections.filter(s => s.type === 'case_block');
  const otherSections = sections.filter(s => s.type !== 'case_block');
  const contentH = CONTENT_H;
  
  // If we have other sections (like insight_block), split layout
  if (otherSections.length > 0 && caseSections.length > 0) {
    const caseH = Math.floor(contentH * 0.65);
    const otherH = contentH - caseH - 12;
    
    return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="display:flex;gap:12px;height:${caseH}px;">
        ${caseSections.map(sec => `<div style="flex:1;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-left:3px solid ${colors.accent};border-radius:6px;padding:10px 12px;overflow:hidden;">
          ${renderSection(sec, colors, caseH - 24)}
        </div>`).join('')}
      </div>
      <div style="display:flex;gap:12px;height:${otherH}px;margin-top:12px;">
        ${otherSections.map(sec => `<div style="flex:1;overflow:hidden;">
          ${renderSection(sec, colors, otherH)}
        </div>`).join('')}
      </div>
      ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
      ${footer(idx, total, colors, slide.footerNote)}
    </div>`;
  }
  
  // All case blocks
  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;gap:12px;">
      ${caseSections.map(sec => `<div style="flex:1;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-left:3px solid ${colors.accent};border-radius:6px;padding:12px 14px;overflow:hidden;">
        ${renderSection(sec, colors, contentH - 28)}
      </div>`).join('')}
    </div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Comparison: A vs B with transition arrow */
function renderComparisonPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const leftSec = sections[0];
  const rightSec = sections[1];
  const insightSec = sections.find(s => s.type === 'insight_block');
  const contentH = insightSec ? Math.floor(CONTENT_H * 0.7) : CONTENT_H;
  const insightH = insightSec ? CONTENT_H - contentH - 12 : 0;
  
  const leftLabel = slide.leftLabel || leftSec?.title || '传统模式';
  const rightLabel = slide.rightLabel || rightSec?.title || '新模式';

  const renderCompCol = (sec: SlideSection | undefined, label: string, borderColor: string, h: number) => {
    const bullets = (sec?.bullets || []).slice(0, 4); // Limit to 4 bullets to prevent overflow
    const fontSize = bullets.length > 3 ? '9px' : '10px';
    const titleSize = bullets.length > 3 ? '10px' : '11px';
    const gap = bullets.length > 3 ? '3px' : '6px';
    return `<div style="flex:1;border:2px solid ${borderColor}40;border-top:3px solid ${borderColor};border-radius:6px;padding:10px 12px;height:${h}px;overflow:hidden;display:flex;flex-direction:column;">
      <div style="font-size:13px;font-weight:700;color:${borderColor};margin-bottom:8px;text-align:center;padding-bottom:6px;border-bottom:1px solid ${colors.cardBorder};">${label}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;gap:${gap};">
      ${bullets.map(b => `<div style="display:flex;align-items:flex-start;gap:5px;">
        <span style="font-size:11px;flex-shrink:0;">${b.icon || '📌'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:${titleSize};font-weight:600;color:${colors.text};margin-bottom:1px;">${b.title}</div>
          <div style="font-size:${fontSize};color:${colors.textSecondary};line-height:1.3;">${b.description}</div>
        </div>
      </div>`).join('')}
    </div>
    </div>`;
  };

  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="display:flex;flex-direction:row;gap:0;height:${contentH}px;align-items:stretch;">
      ${renderCompCol(leftSec, leftLabel, colors.negative, contentH)}
      <div style="display:flex;align-items:center;flex-shrink:0;padding:0 10px;">
        <div style="display:flex;flex-direction:column;align-items:center;gap:4px;">
          <div style="width:2px;height:24px;border-left:2px dashed ${colors.accent};"></div>
          <div style="background:${colors.accent};color:${colors.bg};font-size:10px;font-weight:700;padding:6px 12px;border-radius:16px;white-space:nowrap;">→</div>
          <div style="width:2px;height:24px;border-left:2px dashed ${colors.accent};"></div>
        </div>
      </div>
      ${renderCompCol(rightSec, rightLabel, colors.positive, contentH)}
    </div>
    ${insightSec ? `<div style="height:${insightH}px;margin-top:12px;">${renderSection(insightSec, colors, insightH)}</div>` : ''}
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Key points: enhanced bullet list with optional side block */
function renderKeyPointsPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const bulletSec = sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
  const otherSec = sections.find(s => s.type !== 'bullet_list' && s.type !== 'text_block');
  const contentH = CONTENT_H;

  if (otherSec) {
    // Two column: bullets left, other right
    const leftBullets = bulletSec?.bullets || [];
    return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="flex:1;display:flex;gap:16px;">
        <div style="flex:3;display:flex;flex-direction:column;justify-content:space-evenly;overflow:hidden;">
          ${leftBullets.map(b => `<div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:6px;">
            <span style="font-size:16px;flex-shrink:0;margin-top:2px;">${b.icon || '📌'}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:13px;font-weight:600;color:${colors.text};margin-bottom:3px;">${b.title}${b.highlight ? `<span style="color:${colors.accent};margin-left:6px;font-size:12px;">${b.highlight}</span>` : ''}</div>
              <div style="font-size:11px;color:${colors.textSecondary};line-height:1.5;">${b.description}</div>
            </div>
          </div>`).join('')}
        </div>
        <div style="flex:2;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:12px 14px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">
          ${renderSection(otherSec, colors, contentH - 28)}
        </div>
      </div>
      ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
      ${footer(idx, total, colors, slide.footerNote)}
    </div>`;
  }

  // Full width bullets
  const bullets = bulletSec?.bullets || [];
  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">
      ${bullets.map(b => `<div style="display:flex;align-items:flex-start;gap:12px;padding:10px 14px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:6px;">
        <span style="font-size:16px;flex-shrink:0;margin-top:2px;">${b.icon || '📌'}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:${colors.text};margin-bottom:3px;">${b.title}${b.highlight ? `<span style="color:${colors.accent};margin-left:6px;font-size:12px;">${b.highlight}</span>` : ''}</div>
          <div style="font-size:11px;color:${colors.textSecondary};line-height:1.6;">${b.description}</div>
        </div>
      </div>`).join('')}
    </div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Data dashboard: stats + chart + bullets */
function renderDataDashboardPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const statsSec = sections.find(s => s.type === 'stats_block');
  const chartSec = sections.find(s => s.type === 'chart_block' || s.type === 'progress_block');
  const bulletSec = sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
  
  const topH = statsSec ? 90 : 0;
  const bottomH = CONTENT_H - topH - (topH > 0 ? 12 : 0);

  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    ${statsSec ? `<div style="height:${topH}px;margin-bottom:12px;">${renderSection(statsSec, colors, topH)}</div>` : ''}
    <div style="flex:1;display:flex;gap:16px;height:${bottomH}px;">
      ${chartSec ? `<div style="flex:1;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:12px 14px;overflow:hidden;">${renderSection(chartSec, colors, bottomH - 28)}</div>` : ''}
      ${bulletSec ? `<div style="flex:1;overflow:hidden;">${renderSection(bulletSec, colors, bottomH)}</div>` : ''}
    </div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Timeline: vertical steps */
function renderTimelinePage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const bulletSec = sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
  const bullets = bulletSec?.bullets || slide.points || [];
  
  const stepsHtml = bullets.map((b, i) => `
    <div style="display:flex;align-items:flex-start;gap:14px;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:34px;height:34px;background:${colors.accent}18;border:2px solid ${colors.accent};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0;">${b.icon || (i + 1)}</div>
        ${i < bullets.length - 1 ? `<div style="width:2px;height:16px;background:${colors.accent}40;margin:3px 0;"></div>` : ''}
      </div>
      <div style="padding-top:4px;padding-bottom:${i < bullets.length - 1 ? '4px' : '0'};flex:1;">
        <div style="font-size:13px;font-weight:600;color:${colors.text};margin-bottom:2px;">${b.title}${b.highlight ? `<span style="color:${colors.accent};margin-left:6px;font-size:12px;">${b.highlight}</span>` : ''}</div>
        <div style="font-size:11px;color:${colors.textSecondary};line-height:1.5;">${b.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;padding:0 40px;">${stepsHtml}</div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Fallback: render sections generically */
function renderGenericPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  if (sections.length === 0) {
    // Legacy fallback: use points
    const bullets = slide.points || [];
    return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
        ${bullets.map(b => `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:6px;">
          <span style="font-size:14px;flex-shrink:0;">${b.icon || '📌'}</span>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:${colors.text};margin-bottom:2px;">${b.title}</div>
            <div style="font-size:11px;color:${colors.textSecondary};line-height:1.5;">${b.description}</div>
          </div>
        </div>`).join('')}
      </div>
      ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
      ${footer(idx, total, colors, slide.footerNote)}
    </div>`;
  }
  
  // Render sections in a flex column
  const secH = Math.floor(CONTENT_H / sections.length) - 8;
  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
      ${sections.map(sec => `<div style="background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:10px 12px;overflow:hidden;">
        ${renderSection(sec, colors, secH - 24)}
      </div>`).join('')}
    </div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

// ============================================================
// Main Render
// ============================================================

type PageRenderer = (slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number) => string;

const PAGE_RENDERERS: Record<PageLayout, PageRenderer> = {
  title: (s, c, t) => renderTitlePage(s, c, t),
  closing: (s, c, t) => renderClosingPage(s, c, t),
  quad: renderQuadPage,
  two_col_mixed: renderTwoColMixedPage,
  case_cards: renderCaseCardsPage,
  comparison: renderComparisonPage,
  key_points: renderKeyPointsPage,
  data_dashboard: renderDataDashboardPage,
  timeline: renderTimelinePage,
};

export function renderSlideToHTML(
  slide: SlideOutline,
  colorScheme: string,
  themeStyle: string,
  slideIndex?: number,
  totalSlides?: number,
): string {
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.deep_blue;
  const theme = THEME_STYLES[themeStyle] || THEME_STYLES.business;
  const renderer = PAGE_RENDERERS[slide.layout] || renderGenericPage;
  const innerHtml = renderer(slide, colors, theme, slideIndex ?? 0, totalSlides ?? 1);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:${SLIDE_W}px; height:${SLIDE_H}px; overflow:hidden;
    font-family:${theme.fontFamily};
    background:${colors.bgGradient};
    color:${colors.text};
    position:relative;
    -webkit-font-smoothing:antialiased;
  }
</style>
</head>
<body>
  ${bgDeco(colors)}
  ${innerHtml}
</body>
</html>`;
}

// ============================================================
// Puppeteer Screenshot
// ============================================================

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) return browserInstance;
  browserInstance = await puppeteer.launch({
    headless: true,
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--font-render-hinting=none'],
  });
  return browserInstance;
}

export async function renderSlideToImage(
  slide: SlideOutline,
  colorScheme: string,
  themeStyle: string,
  slideIndex?: number,
  totalSlides?: number,
): Promise<Buffer> {
  const html = renderSlideToHTML(slide, colorScheme, themeStyle, slideIndex, totalSlides);
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: SLIDE_W, height: SLIDE_H, deviceScaleFactor: 1.5 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 300));
    const screenshot = await page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: SLIDE_W, height: SLIDE_H } });
    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

export async function renderAllSlidesToImages(
  slides: SlideOutline[],
  colorScheme: string,
  themeStyle: string,
  onProgress?: (current: number, total: number) => void,
): Promise<Buffer[]> {
  const images: Buffer[] = [];
  for (let i = 0; i < slides.length; i++) {
    if (onProgress) onProgress(i + 1, slides.length);
    const img = await renderSlideToImage(slides[i], colorScheme, themeStyle, i, slides.length);
    images.push(img);
  }
  return images;
}

export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
