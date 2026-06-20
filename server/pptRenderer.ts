/**
 * PPT Slide Renderer V5
 * Key improvements over V4:
 * - Fixed text truncation: word-break, overflow-wrap on all text containers
 * - Right-side "核心洞察" replaced with actual section content (stats/chart/insight)
 * - More layout variation with auto-layout selection
 * - Larger fonts throughout, better spacing
 * - Bullet points displayed as separate lines with short-phrase titles
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
  accent: string;
  accentLight: string;
  accentDark: string;
  accentSecondary: string;
  positive: string;
  negative: string;
  text: string;
  textSecondary: string;
  cardBg: string;
  cardBorder: string;
  blockBg: string;
  quoteBg: string;
  insightBg: string;
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
    quoteBg: 'rgba(200,169,81,0.08)',
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
    quoteBg: 'rgba(240,160,48,0.08)',
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
    quoteBg: 'rgba(139,92,246,0.08)',
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
    quoteBg: 'rgba(240,160,48,0.08)',
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
// Constants & Shared
// ============================================================

const SLIDE_W = 1280;
const SLIDE_H = 720;
const PAD_X = 48;
const PAD_TOP = 28;
const PAD_BOT = 16;
const TITLE_H = 68;
const QUOTE_H = 70;
const FOOTER_H = 26;
const CONTENT_H = SLIDE_H - PAD_TOP - TITLE_H - QUOTE_H - FOOTER_H - PAD_BOT;

const ICON_COLORS = ['#f0a030', '#2ecc71', '#4a90d9', '#e74c3c', '#8b5cf6', '#f59e0b', '#34d399', '#ef4444'];

// Global text style to prevent truncation
const TEXT_WRAP = 'word-break:break-word;overflow-wrap:break-word;';

function coloredIcon(emoji: string, idx: number, size: number = 36): string {
  const bgColor = ICON_COLORS[idx % ICON_COLORS.length];
  return `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bgColor};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
    <span style="font-size:${Math.round(size * 0.5)}px;line-height:1;filter:brightness(0) invert(1);">${emoji}</span>
  </div>`;
}

function bgDeco(colors: ColorScheme): string {
  return `<div style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;">
    <div style="position:absolute;top:-80px;right:-80px;width:400px;height:400px;background:radial-gradient(circle,${colors.accent}08,transparent 70%);"></div>
    <div style="position:absolute;bottom:-60px;left:-60px;width:300px;height:300px;background:radial-gradient(circle,${colors.accentSecondary}06,transparent 70%);"></div>
  </div>`;
}

function titleBar(title: string, subtitle: string | undefined, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="padding:0 0 10px 0;margin-bottom:6px;">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:4px;height:32px;background:${colors.accent};border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:26px;font-weight:${theme.headingWeight};color:${colors.text};margin:0;line-height:1.3;${TEXT_WRAP}">${title}</h2>
    </div>
    ${subtitle ? `<p style="font-size:14px;color:${colors.textSecondary};margin:5px 0 0 16px;line-height:1.3;${TEXT_WRAP}">${subtitle}</p>` : ''}
  </div>`;
}

function quoteBlock(quote: string | undefined, quoteLabel: string | undefined, colors: ColorScheme): string {
  if (!quote) return `<div style="height:${QUOTE_H}px;"></div>`;
  const label = quoteLabel || '核心洞察';
  return `<div style="height:${QUOTE_H}px;display:flex;align-items:center;gap:12px;padding:10px 18px;background:${colors.quoteBg};border-left:3px solid ${colors.accent};border-radius:0 6px 6px 0;margin-top:auto;">
    <span style="font-size:28px;color:${colors.accent};font-family:Georgia,serif;line-height:1;flex-shrink:0;">"</span>
    <div style="flex:1;min-width:0;">
      <span style="font-size:11px;color:${colors.accent};font-weight:700;letter-spacing:0.5px;">${label}</span>
      <p style="font-size:13px;color:${colors.accentLight};margin:3px 0 0;line-height:1.5;font-style:italic;${TEXT_WRAP}overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;">${quote}</p>
    </div>
    <span style="font-size:28px;color:${colors.accent};font-family:Georgia,serif;line-height:1;flex-shrink:0;">"</span>
  </div>`;
}

function footer(index: number, total: number, colors: ColorScheme, note?: string): string {
  return `<div style="height:${FOOTER_H}px;display:flex;justify-content:space-between;align-items:center;border-top:1px solid ${colors.cardBorder};padding-top:5px;">
    ${note ? `<span style="font-size:9px;color:${colors.textSecondary};opacity:0.5;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${note}</span>` : '<span></span>'}
    <span style="font-size:9px;color:${colors.textSecondary};opacity:0.4;">泽思AI · ${index + 1}/${total}</span>
  </div>`;
}

// ============================================================
// Section Renderers - V5 Enhanced
// ============================================================

/** Bullet list with separate title/description lines, larger fonts */
function renderBulletSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const bullets = section.bullets || [];
  const title = section.title || '';
  const lead = section.leadSentence || '';
  
  const bulletCount = bullets.length;
  // Dynamic sizing based on available height and bullet count
  const isLarge = maxH > 250;
  const isMedium = maxH > 150;
  const titleFontSize = isLarge ? '17px' : (isMedium ? '15px' : '13px');
  const leadFontSize = isLarge ? '13px' : '11px';
  const bulletTitleSize = isLarge ? (bulletCount > 5 ? '13px' : '14px') : '12px';
  const bulletDescSize = isLarge ? (bulletCount > 5 ? '11px' : '12px') : '10px';
  const iconSize = isLarge ? (bulletCount > 5 ? 28 : 32) : 24;
  const bulletPad = bulletCount > 5 ? '2px 0' : '4px 0';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
    ${title ? `<div style="font-size:${titleFontSize};font-weight:700;color:${colors.text};margin-bottom:4px;${TEXT_WRAP}white-space:normal;">${title}</div>` : ''}
    ${lead ? `<div style="font-size:${leadFontSize};color:${colors.textSecondary};margin-bottom:6px;line-height:1.4;${TEXT_WRAP}white-space:normal;">${lead}</div>` : ''}
    <div style="flex:1;overflow:hidden;display:flex;flex-direction:column;justify-content:space-evenly;">
      ${bullets.map((b, i) => `<div style="display:flex;align-items:flex-start;gap:8px;padding:${bulletPad};">
        ${coloredIcon(b.icon || '📌', i, iconSize)}
        <div style="flex:1;min-width:0;padding-top:1px;">
          <div style="font-size:${bulletTitleSize};font-weight:700;color:${colors.text};line-height:1.3;margin-bottom:1px;${TEXT_WRAP}">${b.title}${b.highlight ? `<span style="color:${colors.accent};margin-left:6px;font-weight:800;">${b.highlight}</span>` : ''}</div>
          ${b.description ? `<div style="font-size:${bulletDescSize};color:${colors.textSecondary};line-height:1.4;${TEXT_WRAP}white-space:normal;">${b.description}</div>` : ''}
        </div>
      </div>`).join('')}
    </div>
  </div>`;
}

/** Chart/progress rendering */
function renderChartSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const cd = section.chartData;
  if (!cd) return '';
  
  const title = section.title || cd.title || '';
  const source = cd.source || '';
  
  if (cd.type === 'progress') {
    const items = cd.items.slice(0, 6);
    return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
      ${title ? `<div style="font-size:15px;font-weight:700;color:${colors.text};margin-bottom:8px;${TEXT_WRAP}">${title}</div>` : ''}
      <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:12px;">
        ${items.map((item, i) => {
          const pct = Math.min(item.value, 100);
          const barColor = i % 2 === 0 ? colors.accent : colors.accentSecondary;
          return `<div>
            <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:13px;font-weight:600;color:${colors.text};${TEXT_WRAP}">${item.label}</span>
              <span style="font-size:15px;font-weight:800;color:${barColor};flex-shrink:0;">${item.value}${cd.unit || '%'}</span>
            </div>
            <div style="height:14px;background:${colors.cardBg};border-radius:7px;overflow:hidden;">
              <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${barColor},${barColor}cc);border-radius:7px;"></div>
            </div>
          </div>`;
        }).join('')}
      </div>
      ${source ? `<div style="font-size:9px;color:${colors.textSecondary};opacity:0.5;margin-top:4px;">数据来源：${source}</div>` : ''}
    </div>`;
  }
  
  if (cd.type === 'line') {
    const maxVal = Math.max(...cd.items.map(d => d.value), 1);
    return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
      ${title ? `<div style="font-size:15px;font-weight:700;color:${colors.text};margin-bottom:8px;${TEXT_WRAP}">${title}</div>` : ''}
      <div style="flex:1;display:flex;align-items:flex-end;gap:8px;padding-bottom:24px;">
        ${cd.items.map((item, i) => {
          const hPct = Math.round((item.value / maxVal) * 100);
          const barColor = i % 2 === 0 ? colors.accent : colors.accentSecondary;
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;">
            <div style="font-size:12px;font-weight:800;color:${barColor};margin-bottom:4px;">${item.value}${cd.unit || ''}</div>
            <div style="width:70%;height:${hPct}%;background:linear-gradient(180deg,${barColor},${barColor}60);border-radius:4px 4px 0 0;min-height:4px;"></div>
            <div style="font-size:10px;color:${colors.textSecondary};margin-top:6px;text-align:center;${TEXT_WRAP}">${item.label}</div>
          </div>`;
        }).join('')}
      </div>
      ${source ? `<div style="font-size:9px;color:${colors.textSecondary};opacity:0.5;">${source}</div>` : ''}
    </div>`;
  }
  
  // Bar chart (horizontal)
  const maxVal = Math.max(...cd.items.map(d => d.value), 1);
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
    ${title ? `<div style="font-size:15px;font-weight:700;color:${colors.text};margin-bottom:8px;${TEXT_WRAP}">${title}</div>` : ''}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;gap:10px;">
      ${cd.items.map((item, i) => {
        const pct = Math.round((item.value / maxVal) * 100);
        const barColor = i % 2 === 0 ? colors.accent : colors.accentSecondary;
        return `<div style="display:flex;align-items:center;gap:10px;">
          <div style="width:80px;font-size:12px;color:${colors.textSecondary};text-align:right;flex-shrink:0;${TEXT_WRAP}">${item.label}</div>
          <div style="flex:1;height:22px;background:${colors.cardBg};border-radius:4px;overflow:hidden;">
            <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${barColor},${barColor}cc);border-radius:4px;"></div>
          </div>
          <div style="width:60px;font-size:14px;font-weight:800;color:${barColor};flex-shrink:0;">${item.value}${cd.unit || ''}</div>
        </div>`;
      }).join('')}
    </div>
    ${source ? `<div style="font-size:9px;color:${colors.textSecondary};opacity:0.5;margin-top:4px;">${source}</div>` : ''}
  </div>`;
}

/** Case block */
function renderCaseSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const cases = section.cases || [];
  if (cases.length === 0) return '';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;gap:8px;justify-content:stretch;">
    ${cases.map((c, ci) => {
      return `<div style="flex:1;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-left:3px solid ${colors.accent};border-radius:6px;padding:12px 14px;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          ${coloredIcon(c.icon || '🏢', ci, 32)}
          <span style="font-size:15px;font-weight:700;color:${colors.text};${TEXT_WRAP}">${c.company}</span>
          ${c.industry ? `<span style="font-size:10px;color:${colors.accent};background:${colors.accent}15;padding:2px 8px;border-radius:8px;">${c.industry}</span>` : ''}
        </div>
        <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;">
          <span style="font-size:10px;color:${colors.negative};flex-shrink:0;margin-top:2px;">⬤</span>
          <span style="font-size:12px;color:${colors.textSecondary};line-height:1.4;${TEXT_WRAP}">${c.traditional}</span>
        </div>
        <div style="display:flex;align-items:flex-start;gap:6px;margin-bottom:4px;">
          <span style="font-size:10px;color:${colors.positive};flex-shrink:0;margin-top:2px;">⬤</span>
          <span style="font-size:12px;color:${colors.textSecondary};line-height:1.4;${TEXT_WRAP}">${c.transformed}</span>
        </div>
        <div style="background:${colors.accent}12;padding:5px 10px;border-radius:4px;margin-top:2px;">
          <span style="font-size:11px;font-weight:600;color:${colors.accent};${TEXT_WRAP}">💡 ${c.valueProposition}</span>
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

/** Insight block */
function renderInsightSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const label = section.insightLabel || '核心洞察';
  const text = section.insightText || '';
  if (!text) return '';
  
  return `<div style="height:${maxH}px;overflow:hidden;background:${colors.insightBg};border:1px solid ${colors.positive}20;border-radius:6px;padding:14px 16px;display:flex;flex-direction:column;justify-content:center;">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
      ${coloredIcon('💡', 1, 32)}
      <span style="font-size:14px;font-weight:700;color:${colors.positive};">${label}</span>
    </div>
    <p style="font-size:13px;color:${colors.text};line-height:1.7;margin:0;${TEXT_WRAP}">${text}</p>
  </div>`;
}

/** Flow block */
function renderFlowSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const nodes = section.flowNodes || [];
  if (nodes.length === 0) return '';
  const title = section.title || '';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;">
    ${title ? `<div style="font-size:15px;font-weight:700;color:${colors.text};margin-bottom:10px;${TEXT_WRAP}">${title}</div>` : ''}
    <div style="flex:1;display:flex;align-items:center;justify-content:center;gap:6px;flex-wrap:nowrap;">
      ${nodes.map((n, i) => {
        const arrow = i < nodes.length - 1 ? `<div style="color:${colors.accent};font-size:18px;flex-shrink:0;">→</div>` : '';
        return `<div style="display:flex;align-items:center;gap:6px;">
          <div style="display:flex;flex-direction:column;align-items:center;gap:5px;min-width:65px;">
            ${coloredIcon(n.icon, i, 44)}
            <div style="font-size:11px;color:${colors.text};font-weight:600;text-align:center;max-width:75px;line-height:1.3;${TEXT_WRAP}">${n.label}</div>
          </div>
          ${arrow}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

/** Stats block */
function renderStatsSection(section: SlideSection, colors: ColorScheme, maxH: number): string {
  const stats = section.stats || [];
  if (stats.length === 0) return '';
  const title = section.title || '';
  
  return `<div style="height:${maxH}px;overflow:hidden;display:flex;flex-direction:column;justify-content:center;">
    ${title ? `<div style="font-size:15px;font-weight:700;color:${colors.text};margin-bottom:10px;${TEXT_WRAP}">${title}</div>` : ''}
    <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:center;">
      ${stats.map((s, i) => `<div style="flex:1;min-width:100px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:8px;padding:14px 10px;text-align:center;">
        <div style="margin-bottom:6px;display:flex;justify-content:center;">${coloredIcon(s.icon || '📊', i, 36)}</div>
        <div style="font-size:24px;font-weight:800;color:${colors.accent};margin-bottom:4px;${TEXT_WRAP}">${s.number}</div>
        <div style="font-size:11px;color:${colors.textSecondary};line-height:1.3;${TEXT_WRAP}">${s.label}</div>
      </div>`).join('')}
    </div>
  </div>`;
}

/** Section dispatcher */
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
// Page Layout Renderers - V5
// ============================================================

function renderTitlePage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:80px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h1 style="font-size:40px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 24px;line-height:1.4;letter-spacing:2px;${TEXT_WRAP}">${slide.title}</h1>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;letter-spacing:1px;font-weight:300;line-height:1.6;${TEXT_WRAP}">${slide.subtitle}</p>` : ''}
    <div style="width:30px;height:2px;background:${colors.accent};margin-top:48px;opacity:0.4;border-radius:1px;"></div>
    <div style="position:absolute;bottom:40px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

function renderClosingPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:60px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h2 style="font-size:36px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 20px;letter-spacing:3px;${TEXT_WRAP}">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;letter-spacing:1px;font-weight:300;line-height:1.6;${TEXT_WRAP}">${slide.subtitle}</p>` : ''}
    ${slide.quote ? `<div style="margin-top:40px;max-width:600px;"><p style="font-size:14px;color:${colors.accentLight};font-style:italic;line-height:1.7;${TEXT_WRAP}">"${slide.quote}"</p></div>` : ''}
    <div style="margin-top:60px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

/** Quad: 2x2 grid */
function renderQuadPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const s = [sections[0], sections[1], sections[2], sections[3]].filter(Boolean);
  const blockH = Math.floor((CONTENT_H - 12) / 2);
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

/** Two column mixed: left + right, each renders its own section type */
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

/** Case cards: side-by-side case studies */
function renderCaseCardsPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const caseSections = sections.filter(s => s.type === 'case_block');
  const otherSections = sections.filter(s => s.type !== 'case_block');
  const contentH = CONTENT_H;
  
  if (otherSections.length > 0 && caseSections.length > 0) {
    const caseH = Math.floor(contentH * 0.65);
    const otherH = contentH - caseH - 12;
    
    return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="display:flex;gap:12px;height:${caseH}px;">
        ${caseSections.map(sec => `<div style="flex:1;overflow:hidden;">${renderSection(sec, colors, caseH)}</div>`).join('')}
      </div>
      <div style="display:flex;gap:12px;height:${otherH}px;margin-top:12px;">
        ${otherSections.map(sec => `<div style="flex:1;overflow:hidden;">${renderSection(sec, colors, otherH)}</div>`).join('')}
      </div>
      ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
      ${footer(idx, total, colors, slide.footerNote)}
    </div>`;
  }
  
  // Fallback: if no case_block sections, render otherSections (bullets/stats) instead
  const renderSections = caseSections.length > 0 ? caseSections : otherSections;
  return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;gap:12px;">
      ${renderSections.map(sec => `<div style="flex:1;overflow:hidden;">${renderSection(sec, colors, contentH)}</div>`).join('')}
    </div>
    ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
    ${footer(idx, total, colors, slide.footerNote)}
  </div>`;
}

/** Comparison: A vs B */
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
    const bullets = (sec?.bullets || []).slice(0, 5);
    const bulletTitleSize = bullets.length > 4 ? '12px' : '13px';
    const bulletDescSize = bullets.length > 4 ? '10px' : '11px';
    // Fallback if no bullets at all
    const bulletsHtml = bullets.length > 0
      ? bullets.map((b, i) => `<div style="display:flex;align-items:flex-start;gap:6px;">
        ${coloredIcon(b.icon || '📌', borderColor === colors.negative ? i + 4 : i, 26)}
        <div style="flex:1;min-width:0;padding-top:2px;">
          <div style="font-size:${bulletTitleSize};font-weight:700;color:${colors.text};margin-bottom:1px;${TEXT_WRAP}">${b.title}</div>
          ${b.description ? `<div style="font-size:${bulletDescSize};color:${colors.textSecondary};line-height:1.3;${TEXT_WRAP}">${b.description}</div>` : ''}
        </div>
      </div>`).join('')
      : `<div style="flex:1;display:flex;align-items:center;justify-content:center;">
          <div style="font-size:14px;color:${colors.textSecondary};text-align:center;${TEXT_WRAP}">${label}</div>
        </div>`;
    return `<div style="flex:1;border:2px solid ${borderColor}40;border-top:3px solid ${borderColor};border-radius:6px;padding:10px 12px;height:${h}px;overflow:hidden;display:flex;flex-direction:column;">
      <div style="font-size:15px;font-weight:700;color:${borderColor};margin-bottom:10px;text-align:center;padding-bottom:6px;border-bottom:1px solid ${colors.cardBorder};${TEXT_WRAP}">${label}</div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:space-evenly;">
      ${bulletsHtml}
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
          <div style="background:${colors.accent};color:${colors.bg};font-size:12px;font-weight:700;padding:8px 14px;border-radius:16px;white-space:nowrap;">→</div>
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

/** Key points: bullets + side panel (stats/chart/insight) */
function renderKeyPointsPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  const bulletSec = sections.find(s => s.type === 'bullet_list' || s.type === 'text_block');
  const otherSec = sections.find(s => s.type !== 'bullet_list' && s.type !== 'text_block');
  const contentH = CONTENT_H;

  if (otherSec) {
    const leftBullets = bulletSec?.bullets || [];
    return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="flex:1;display:flex;gap:16px;">
        <div style="flex:3;display:flex;flex-direction:column;justify-content:space-evenly;overflow:hidden;">
          ${leftBullets.map((b, i) => `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 14px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:6px;">
            ${coloredIcon(b.icon || '📌', i, 34)}
            <div style="flex:1;min-width:0;padding-top:2px;">
              <div style="font-size:14px;font-weight:700;color:${colors.text};margin-bottom:2px;${TEXT_WRAP}">${b.title}${b.highlight ? `<span style="color:${colors.accent};margin-left:6px;font-weight:800;">${b.highlight}</span>` : ''}</div>
              <div style="font-size:12px;color:${colors.textSecondary};line-height:1.5;${TEXT_WRAP}">${b.description}</div>
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
      ${bullets.map((b, i) => `<div style="display:flex;align-items:flex-start;gap:14px;padding:10px 16px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:6px;">
        ${coloredIcon(b.icon || '📌', i, 38)}
        <div style="flex:1;min-width:0;padding-top:4px;">
          <div style="font-size:15px;font-weight:700;color:${colors.text};margin-bottom:3px;${TEXT_WRAP}">${b.title}${b.highlight ? `<span style="color:${colors.accent};margin-left:8px;font-weight:800;">${b.highlight}</span>` : ''}</div>
          <div style="font-size:13px;color:${colors.textSecondary};line-height:1.6;${TEXT_WRAP}">${b.description}</div>
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
  
  const topH = statsSec ? 110 : 0;
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
        ${coloredIcon(b.icon || String(i + 1), i, 38)}
        ${i < bullets.length - 1 ? `<div style="width:2px;height:16px;background:${colors.accent}40;margin:4px 0;"></div>` : ''}
      </div>
      <div style="flex:1;min-width:0;padding-top:4px;">
        <div style="font-size:15px;font-weight:700;color:${colors.text};margin-bottom:3px;${TEXT_WRAP}">${b.title}${b.highlight ? `<span style="color:${colors.accent};margin-left:6px;font-size:14px;font-weight:800;">${b.highlight}</span>` : ''}</div>
        <div style="font-size:12px;color:${colors.textSecondary};line-height:1.5;${TEXT_WRAP}">${b.description}</div>
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

/** Fallback: generic section rendering */
function renderGenericPage(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, idx: number, total: number): string {
  const sections = slide.sections || [];
  if (sections.length === 0) {
    const bullets = slide.points || [];
    // If completely empty, show title-only page with centered text
    if (bullets.length === 0) {
      return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
        ${titleBar(slide.title, slide.subtitle, colors, theme)}
        <div style="flex:1;display:flex;align-items:center;justify-content:center;">
          <div style="text-align:center;max-width:600px;">
            <div style="font-size:20px;font-weight:700;color:${colors.text};margin-bottom:12px;${TEXT_WRAP}">${slide.title}</div>
            ${slide.subtitle ? `<div style="font-size:14px;color:${colors.textSecondary};line-height:1.6;${TEXT_WRAP}">${slide.subtitle}</div>` : ''}
          </div>
        </div>
        ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
        ${footer(idx, total, colors, slide.footerNote)}
      </div>`;
    }
    return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="flex:1;display:flex;flex-direction:column;gap:8px;">
        ${bullets.map((b, i) => `<div style="display:flex;align-items:flex-start;gap:10px;padding:8px 12px;background:${colors.cardBg};border:1px solid ${colors.cardBorder};border-radius:6px;">
          ${coloredIcon(b.icon || '📌', i, 32)}
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:700;color:${colors.text};margin-bottom:2px;${TEXT_WRAP}">${b.title}</div>
            ${b.description ? `<div style="font-size:12px;color:${colors.textSecondary};line-height:1.5;${TEXT_WRAP}">${b.description}</div>` : ''}
          </div>
        </div>`).join('')}
      </div>
      ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
      ${footer(idx, total, colors, slide.footerNote)}
    </div>`;
  }
  
  // Render sections in columns if 2-3, otherwise stack
  if (sections.length >= 2 && sections.length <= 3) {
    return `<div style="display:flex;flex-direction:column;padding:${PAD_TOP}px ${PAD_X}px ${PAD_BOT}px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="flex:1;display:flex;gap:12px;">
        ${sections.map(sec => `<div style="flex:1;background:${colors.blockBg};border:1px solid ${colors.cardBorder};border-radius:6px;padding:10px 12px;overflow:hidden;">
          ${renderSection(sec, colors, CONTENT_H - 24)}
        </div>`).join('')}
      </div>
      ${quoteBlock(slide.quote, slide.quoteLabel, colors)}
      ${footer(idx, total, colors, slide.footerNote)}
    </div>`;
  }
  
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

  // ★ FINAL SAFETY NET: if content page has no substantial content, force key_points with fallback
  if (slide.layout !== 'title' && slide.layout !== 'closing') {
    const hasBullets = slide.sections?.some(sec =>
      sec.bullets && sec.bullets.length >= 1 && sec.bullets.some(b => b.title && b.title.trim().length > 0)
    );
    const hasRich = slide.sections?.some(sec =>
      (sec.cases && sec.cases.length > 0) ||
      (sec.chartData && sec.chartData.items && sec.chartData.items.length > 0) ||
      (sec.stats && sec.stats.length > 0) ||
      (sec.flowNodes && sec.flowNodes.length > 0)
    );
    const hasPoints = slide.points && slide.points.length > 0;
    if (!hasBullets && !hasRich && !hasPoints) {
      console.log(`[PPT Renderer] Slide "${slide.title}" has no renderable content, injecting fallback`);
      const titleParts = (slide.title || '').replace(/[，。；：！？、]/g, '|').split('|').filter(w => w.trim().length > 2);
      const fallbackBullets: BulletPoint[] = titleParts.length >= 3
        ? titleParts.slice(0, 5).map((w, i) => ({
            icon: ['📌', '💡', '🔑', '📊', '🎯'][i % 5],
            title: w.trim().slice(0, 15),
            description: slide.subtitle?.slice(0, 80) || slide.quote?.slice(0, 80) || '深入分析与核心洞察',
          }))
        : [
            { icon: '📌', title: '核心观点', description: (slide.title || '').slice(0, 80) || '深入分析与核心洞察' },
            { icon: '💡', title: '关键洞察', description: (slide.subtitle || slide.quote || '').slice(0, 80) || '基于行业研究和数据分析的核心发现' },
            { icon: '🔑', title: '趋势判断', description: (slide.quote || slide.title || '').slice(0, 80) || '行业发展方向与未来展望' },
            { icon: '🎯', title: '实践建议', description: '基于以上分析提出具体可执行的行动方案' },
          ];
      // Preserve any existing insight_block
      const existingInsight = slide.sections?.find(s => s.type === 'insight_block');
      slide.sections = [
        { type: 'bullet_list', title: '📌 核心要点', leadSentence: slide.title || '', bullets: fallbackBullets },
        existingInsight || { type: 'insight_block', insightText: slide.quote || slide.title || '深度洞察，驱动决策', insightLabel: '核心洞察' },
      ];
      slide.layout = 'key_points';
    }
  }


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
