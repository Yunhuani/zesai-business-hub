/**
 * PPT Slide Renderer V2
 * Renders structured slide data to HTML with charts, quotes, process flows
 */
import puppeteer, { Browser } from 'puppeteer';
import type { SlideOutline, SlideLayout, SlidePoint, ChartData, ProcessNode } from './pptStructurer';

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
  accentSecondary: string;  // Second accent for variety
  text: string;
  textSecondary: string;
  cardBg: string;
  cardBgHover: string;
  border: string;
  glow: string;
  titleBarBg: string;
  quoteBg: string;
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
    text: '#f0ede4',
    textSecondary: '#a8b5a0',
    cardBg: 'rgba(200,169,81,0.08)',
    cardBgHover: 'rgba(200,169,81,0.14)',
    border: 'rgba(200,169,81,0.18)',
    glow: 'rgba(200,169,81,0.08)',
    titleBarBg: 'linear-gradient(90deg, rgba(200,169,81,0.15), rgba(200,169,81,0.05))',
    quoteBg: 'rgba(200,169,81,0.06)',
  },
  deep_blue: {
    name: '深海蓝',
    bg: '#080c1a',
    bgGradient: 'linear-gradient(135deg, #080c1a 0%, #0d1530 40%, #0a1025 100%)',
    accent: '#4a90d9',
    accentLight: '#7ab5f5',
    accentDark: '#2d5a8a',
    accentSecondary: '#f0a030',
    text: '#e8ecf4',
    textSecondary: '#8899b5',
    cardBg: 'rgba(74,144,217,0.08)',
    cardBgHover: 'rgba(74,144,217,0.14)',
    border: 'rgba(74,144,217,0.18)',
    glow: 'rgba(74,144,217,0.08)',
    titleBarBg: 'linear-gradient(90deg, rgba(74,144,217,0.15), rgba(74,144,217,0.05))',
    quoteBg: 'rgba(74,144,217,0.06)',
  },
  zenith_purple: {
    name: '泽思紫',
    bg: '#0c081a',
    bgGradient: 'linear-gradient(135deg, #0c081a 0%, #150d30 40%, #100a25 100%)',
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
    accentDark: '#5b3aaa',
    accentSecondary: '#f59e0b',
    text: '#ede8f5',
    textSecondary: '#9b8ab5',
    cardBg: 'rgba(139,92,246,0.08)',
    cardBgHover: 'rgba(139,92,246,0.14)',
    border: 'rgba(139,92,246,0.18)',
    glow: 'rgba(139,92,246,0.08)',
    titleBarBg: 'linear-gradient(90deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',
    quoteBg: 'rgba(139,92,246,0.06)',
  },
  classic_black: {
    name: '经典黑',
    bg: '#0d0d0d',
    bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #161616 40%, #111111 100%)',
    accent: '#e0e0e0',
    accentLight: '#ffffff',
    accentDark: '#999999',
    accentSecondary: '#f0a030',
    text: '#f5f5f5',
    textSecondary: '#888888',
    cardBg: 'rgba(255,255,255,0.05)',
    cardBgHover: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.12)',
    glow: 'rgba(255,255,255,0.05)',
    titleBarBg: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
    quoteBg: 'rgba(255,255,255,0.04)',
  },
};

// ============================================================
// Theme Styles
// ============================================================
export interface ThemeStyle {
  name: string;
  fontFamily: string;
  headingWeight: number;
  decorStyle: 'geometric' | 'gradient' | 'minimal' | 'bold';
}

export const THEME_STYLES: Record<string, ThemeStyle> = {
  business: { name: '商务专业', fontFamily: '"Noto Sans CJK SC", "Noto Sans SC", sans-serif', headingWeight: 700, decorStyle: 'geometric' },
  tech: { name: '科技未来', fontFamily: '"Noto Sans CJK SC", "Noto Sans SC", sans-serif', headingWeight: 600, decorStyle: 'gradient' },
  simple: { name: '简约素雅', fontFamily: '"Noto Serif CJK SC", "Noto Serif SC", serif', headingWeight: 500, decorStyle: 'minimal' },
  creative: { name: '创意活力', fontFamily: '"Noto Sans CJK SC", "Noto Sans SC", sans-serif', headingWeight: 800, decorStyle: 'bold' },
};

// ============================================================
// Shared Components
// ============================================================

function bgDecorations(theme: ThemeStyle, colors: ColorScheme): string {
  const base = `<div style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;">`;
  const end = `</div>`;
  
  switch (theme.decorStyle) {
    case 'geometric':
      return `${base}
        <div style="position:absolute;top:-60px;right:-60px;width:250px;height:250px;border:2px solid ${colors.accent};opacity:0.06;transform:rotate(45deg);"></div>
        <div style="position:absolute;bottom:-30px;left:-30px;width:180px;height:180px;border:2px solid ${colors.accent};opacity:0.05;border-radius:50%;"></div>
      ${end}`;
    case 'gradient':
      return `${base}
        <div style="position:absolute;top:-120px;right:-120px;width:500px;height:500px;background:radial-gradient(circle,${colors.accent}0a,transparent 70%);"></div>
        <div style="position:absolute;bottom:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,${colors.accent}08,transparent 70%);"></div>
      ${end}`;
    case 'minimal':
      return `${base}
        <div style="position:absolute;top:40px;left:60px;width:40px;height:2px;background:${colors.accent};opacity:0.2;"></div>
      ${end}`;
    case 'bold':
      return `${base}
        <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:${colors.accent};opacity:0.04;border-radius:50%;"></div>
        <div style="position:absolute;top:0;right:0;width:5px;height:100%;background:linear-gradient(180deg,${colors.accent}25,transparent);"></div>
      ${end}`;
  }
}

function titleBar(title: string, subtitle: string | undefined, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="padding:0 0 20px 0;margin-bottom:16px;border-bottom:1px solid ${colors.border};">
    <div style="display:flex;align-items:center;gap:12px;">
      <div style="width:4px;height:32px;background:${colors.accent};border-radius:2px;flex-shrink:0;"></div>
      <h2 style="font-size:26px;font-weight:${theme.headingWeight};color:${colors.text};margin:0;line-height:1.3;letter-spacing:0.5px;">${title}</h2>
    </div>
    ${subtitle ? `<p style="font-size:15px;color:${colors.textSecondary};margin:8px 0 0 16px;line-height:1.4;">${subtitle}</p>` : ''}
  </div>`;
}

function quoteBlock(quote: string | undefined, colors: ColorScheme): string {
  if (!quote) return '';
  return `<div style="background:${colors.quoteBg};border-left:3px solid ${colors.accent};padding:14px 20px;margin-top:auto;border-radius:0 6px 6px 0;display:flex;align-items:flex-start;gap:8px;">
    <span style="font-size:24px;color:${colors.accent};line-height:1;font-family:Georgia,serif;flex-shrink:0;">"</span>
    <p style="font-size:13px;color:${colors.accentLight};margin:0;line-height:1.7;font-style:italic;">${quote}</p>
  </div>`;
}

function slideFooter(index: number, total: number, colors: ColorScheme, footerNote?: string): string {
  return `<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 0 0;border-top:1px solid ${colors.border};margin-top:12px;">
    ${footerNote ? `<span style="font-size:10px;color:${colors.textSecondary};opacity:0.4;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${footerNote}</span>` : '<span></span>'}
    <span style="font-size:10px;color:${colors.textSecondary};opacity:0.35;letter-spacing:1px;">泽思AI · ${index + 1}/${total}</span>
  </div>`;
}

function iconBadge(icon: string, colors: ColorScheme, size = 34): string {
  return `<div style="min-width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.55)}px;flex-shrink:0;">${icon || '📌'}</div>`;
}

// ============================================================
// Chart Renderer (inline SVG-like HTML for Puppeteer)
// ============================================================

function renderBarChart(chartData: ChartData, colors: ColorScheme): string {
  const maxVal = Math.max(...chartData.items.map(d => d.value), 1);
  const barColors = [colors.accent, colors.accentSecondary, colors.accentLight, colors.accentDark, '#e74c3c', '#2ecc71'];
  
  const barsHtml = chartData.items.map((item, i) => {
    const pct = Math.round((item.value / maxVal) * 100);
    const barColor = item.color || barColors[i % barColors.length];
    return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:10px;">
      <div style="width:100px;font-size:12px;color:${colors.textSecondary};text-align:right;flex-shrink:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.label}</div>
      <div style="flex:1;height:24px;background:${colors.cardBg};border-radius:4px;overflow:hidden;position:relative;">
        <div style="height:100%;width:${pct}%;background:${barColor};border-radius:4px;"></div>
      </div>
      <div style="width:60px;font-size:13px;font-weight:600;color:${colors.text};flex-shrink:0;">${item.value}${chartData.unit || ''}</div>
    </div>`;
  }).join('');

  return `<div style="padding:16px 0;">
    ${chartData.title ? `<div style="font-size:14px;font-weight:600;color:${colors.text};margin-bottom:14px;">${chartData.title}</div>` : ''}
    ${barsHtml}
  </div>`;
}

function renderProgressChart(chartData: ChartData, colors: ColorScheme): string {
  const barColors = [colors.accent, colors.accentSecondary, colors.accentLight, '#e74c3c', '#2ecc71'];
  
  const items = chartData.items.map((item, i) => {
    const pct = Math.min(item.value, 100);
    const barColor = item.color || barColors[i % barColors.length];
    return `<div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
        <span style="font-size:13px;color:${colors.text};">${item.label}</span>
        <span style="font-size:14px;font-weight:700;color:${barColor};">${item.value}${chartData.unit || '%'}</span>
      </div>
      <div style="height:10px;background:${colors.cardBg};border-radius:5px;overflow:hidden;">
        <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,${barColor},${barColor}cc);border-radius:5px;"></div>
      </div>
    </div>`;
  }).join('');

  return `<div style="padding:16px 0;">
    ${chartData.title ? `<div style="font-size:14px;font-weight:600;color:${colors.text};margin-bottom:14px;">${chartData.title}</div>` : ''}
    ${items}
  </div>`;
}

function renderLineChart(chartData: ChartData, colors: ColorScheme): string {
  // Render as a simplified visual using bars with connecting line effect
  const maxVal = Math.max(...chartData.items.map(d => d.value), 1);
  const barColors = [colors.accent, colors.accentSecondary];
  
  const colWidth = Math.floor(100 / chartData.items.length);
  const pointsHtml = chartData.items.map((item, i) => {
    const heightPct = Math.round((item.value / maxVal) * 100);
    const barColor = item.color || barColors[i % barColors.length];
    return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:160px;">
      <div style="font-size:13px;font-weight:700;color:${barColor};margin-bottom:6px;">${item.value}${chartData.unit || ''}</div>
      <div style="width:40px;height:${heightPct}%;background:linear-gradient(180deg,${barColor},${barColor}60);border-radius:4px 4px 0 0;"></div>
      <div style="font-size:11px;color:${colors.textSecondary};margin-top:8px;text-align:center;">${item.label}</div>
    </div>`;
  }).join('');

  return `<div style="padding:16px 0;">
    ${chartData.title ? `<div style="font-size:14px;font-weight:600;color:${colors.text};margin-bottom:14px;">${chartData.title}</div>` : ''}
    <div style="display:flex;align-items:flex-end;gap:8px;border-bottom:1px solid ${colors.border};padding-bottom:0;">${pointsHtml}</div>
  </div>`;
}

function renderChart(chartData: ChartData, colors: ColorScheme): string {
  switch (chartData.type) {
    case 'bar': return renderBarChart(chartData, colors);
    case 'progress': return renderProgressChart(chartData, colors);
    case 'line': return renderLineChart(chartData, colors);
    default: return renderBarChart(chartData, colors);
  }
}

// ============================================================
// Layout Renderers
// ============================================================

function renderTitleSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:80px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h1 style="font-size:42px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 24px;line-height:1.4;letter-spacing:2px;">${slide.title}</h1>
    ${slide.subtitle ? `<p style="font-size:20px;color:${colors.textSecondary};margin:0;letter-spacing:2px;font-weight:300;line-height:1.6;">${slide.subtitle}</p>` : ''}
    <div style="width:30px;height:2px;background:${colors.accent};margin-top:48px;opacity:0.4;border-radius:1px;"></div>
    <div style="position:absolute;bottom:40px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

function renderKeyPointsSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const pointsHtml = points.map((p) => `
    <div style="display:flex;align-items:flex-start;gap:14px;padding:14px 18px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:8px;">
      ${iconBadge(p.icon, colors, 32)}
      <div style="flex:1;min-width:0;">
        <div style="font-size:15px;font-weight:600;color:${colors.text};margin-bottom:4px;">${p.title}</div>
        <div style="font-size:12px;color:${colors.textSecondary};line-height:1.65;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="display:flex;flex-direction:column;gap:10px;flex:1;">
      ${pointsHtml}
    </div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderGridCardsSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const cols = points.length <= 4 ? 2 : 3;
  
  const cardsHtml = points.map((p) => `
    <div style="padding:20px 18px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:10px;display:flex;flex-direction:column;align-items:center;text-align:center;">
      <div style="font-size:28px;margin-bottom:10px;">${p.icon || '📌'}</div>
      <div style="font-size:15px;font-weight:600;color:${colors.text};margin-bottom:6px;">${p.title}</div>
      <div style="font-size:11px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:14px;flex:1;align-content:center;">
      ${cardsHtml}
    </div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderTextOnlySlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const contentHtml = points.map(p => `
    <div style="margin-bottom:20px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        ${iconBadge(p.icon, colors, 26)}
        <div style="font-size:17px;font-weight:600;color:${colors.accent};">${p.title}</div>
      </div>
      <div style="font-size:13px;color:${colors.textSecondary};line-height:1.8;padding-left:36px;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${contentHtml}</div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderTwoColumnSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const left = slide.leftColumn || slide.points?.slice(0, Math.ceil((slide.points?.length || 0) / 2)) || [];
  const right = slide.rightColumn || slide.points?.slice(Math.ceil((slide.points?.length || 0) / 2)) || [];

  const renderCol = (items: SlidePoint[], label?: string) => `
    <div style="flex:1;">
      ${label ? `<div style="font-size:14px;font-weight:600;color:${colors.accent};margin-bottom:14px;padding-bottom:8px;border-bottom:2px solid ${colors.accent}30;">${label}</div>` : ''}
      ${items.map(p => `
        <div style="padding:12px 14px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:8px;margin-bottom:8px;display:flex;align-items:flex-start;gap:10px;">
          ${iconBadge(p.icon, colors, 26)}
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:600;color:${colors.text};margin-bottom:3px;">${p.title}</div>
            <div style="font-size:11px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const leftLabel = slide.leftLabel || (slide.subtitle?.includes('vs') ? slide.subtitle.split('vs')[0]?.trim() : undefined);
  const rightLabel = slide.rightLabel || (slide.subtitle?.includes('vs') ? slide.subtitle.split('vs')[1]?.trim() : undefined);

  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="display:flex;gap:20px;flex:1;align-items:flex-start;">
      ${renderCol(left, leftLabel)}
      <div style="width:1px;align-self:stretch;background:${colors.border};flex-shrink:0;margin:0 4px;"></div>
      ${renderCol(right, rightLabel)}
    </div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderComparisonSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const left = slide.leftColumn || [];
  const right = slide.rightColumn || [];
  const leftLabel = slide.leftLabel || '方案A';
  const rightLabel = slide.rightLabel || '方案B';

  // Use distinct border colors for comparison
  const leftBorderColor = '#e74c3c';  // Red for "before/old"
  const rightBorderColor = '#2ecc71'; // Green for "after/new"

  const renderCol = (items: SlidePoint[], label: string, borderColor: string) => `
    <div style="flex:1;padding:18px;background:${colors.cardBg};border:2px solid ${borderColor}40;border-top:3px solid ${borderColor};border-radius:8px;">
      <div style="font-size:16px;font-weight:700;color:${borderColor};margin-bottom:16px;text-align:center;padding-bottom:10px;border-bottom:1px solid ${colors.border};">${label}</div>
      ${items.map(p => `
        <div style="margin-bottom:12px;display:flex;align-items:flex-start;gap:10px;">
          ${iconBadge(p.icon, colors, 24)}
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;font-weight:600;color:${colors.text};margin-bottom:2px;">${p.title}</div>
            <div style="font-size:11px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="display:flex;gap:16px;flex:1;align-items:flex-start;">
      ${renderCol(left, leftLabel, leftBorderColor)}
      <div style="display:flex;align-items:center;flex-shrink:0;padding:0 4px;">
        <div style="background:${colors.accent};color:${colors.bg};font-size:12px;font-weight:700;padding:8px 12px;border-radius:20px;white-space:nowrap;">→ 转变</div>
      </div>
      ${renderCol(right, rightLabel, rightBorderColor)}
    </div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderTimelineSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const stepsHtml = points.map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:16px;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,${colors.accent},${colors.accentDark});color:${colors.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">${p.icon || (i + 1)}</div>
        ${i < points.length - 1 ? `<div style="width:2px;height:24px;background:linear-gradient(180deg,${colors.accent}50,${colors.accent}10);margin:4px 0;"></div>` : ''}
      </div>
      <div style="padding-top:5px;padding-bottom:${i < points.length - 1 ? '6px' : '0'};">
        <div style="font-size:15px;font-weight:600;color:${colors.text};margin-bottom:3px;">${p.title}</div>
        <div style="font-size:12px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${stepsHtml}</div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderDataHighlightSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      ${slide.highlightNumber ? `
        <div style="font-size:68px;font-weight:800;background:linear-gradient(135deg,${colors.accent},${colors.accentLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;letter-spacing:2px;">${slide.highlightNumber}</div>
        <div style="font-size:15px;color:${colors.textSecondary};margin-bottom:28px;letter-spacing:1px;">${slide.highlightLabel || ''}</div>
      ` : ''}
      <div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap;width:100%;">
        ${points.map(p => `
          <div style="padding:16px 20px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:10px;min-width:160px;flex:1;max-width:260px;">
            <div style="font-size:13px;margin-bottom:6px;">${p.icon || '📊'}</div>
            <div style="font-size:20px;font-weight:700;background:linear-gradient(135deg,${colors.accent},${colors.accentLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:4px;">${p.title}</div>
            <div style="font-size:11px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderProcessFlowSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const nodes = slide.processFlow || [];
  const nodeColors = [colors.accent, colors.accentSecondary, '#2ecc71', '#3498db', '#e74c3c', '#f39c12'];
  
  const nodesHtml = nodes.map((node, i) => {
    const nodeColor = nodeColors[i % nodeColors.length];
    const arrow = i < nodes.length - 1 ? `<div style="font-size:20px;color:${colors.accent};flex-shrink:0;margin:0 4px;">→</div>` : '';
    return `<div style="display:flex;align-items:center;gap:0;">
      <div style="display:flex;flex-direction:column;align-items:center;gap:8px;min-width:90px;">
        <div style="width:52px;height:52px;border-radius:50%;background:${nodeColor}20;border:2px solid ${nodeColor};display:flex;align-items:center;justify-content:center;font-size:24px;">${node.icon}</div>
        <div style="font-size:12px;color:${colors.text};font-weight:500;text-align:center;max-width:100px;">${node.label}</div>
      </div>
      ${arrow}
    </div>`;
  }).join('');

  // Also render points if available (below the flow)
  const pointsHtml = (slide.points || []).map(p => `
    <div style="display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:8px;flex:1;min-width:200px;">
      ${iconBadge(p.icon, colors, 24)}
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:600;color:${colors.text};margin-bottom:2px;">${p.title}</div>
        <div style="font-size:11px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="display:flex;justify-content:center;align-items:center;gap:8px;padding:24px 0;flex-wrap:wrap;">
      ${nodesHtml}
    </div>
    ${pointsHtml ? `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;">${pointsHtml}</div>` : ''}
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderChartSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const chartHtml = slide.chartData ? renderChart(slide.chartData, colors) : '';
  const points = slide.points || [];
  
  // If we have both chart and points, use two-column layout
  if (points.length > 0 && chartHtml) {
    const pointsHtml = points.map(p => `
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;">
        ${iconBadge(p.icon, colors, 24)}
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;font-weight:600;color:${colors.text};margin-bottom:2px;">${p.title}</div>
          <div style="font-size:11px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
        </div>
      </div>
    `).join('');

    return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
      ${titleBar(slide.title, slide.subtitle, colors, theme)}
      <div style="display:flex;gap:24px;flex:1;align-items:flex-start;">
        <div style="flex:1;">${pointsHtml}</div>
        <div style="flex:1;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:8px;padding:12px 16px;">${chartHtml}</div>
      </div>
      ${quoteBlock(slide.quote, colors)}
      ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
    </div>`;
  }

  // Chart only
  return `<div style="display:flex;flex-direction:column;padding:36px 48px 24px;height:100%;position:relative;">
    ${titleBar(slide.title, slide.subtitle, colors, theme)}
    <div style="flex:1;display:flex;justify-content:center;align-items:center;">
      <div style="width:80%;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:8px;padding:20px 24px;">${chartHtml}</div>
    </div>
    ${quoteBlock(slide.quote, colors)}
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderClosingSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:60px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h2 style="font-size:36px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 20px;letter-spacing:3px;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;letter-spacing:1px;font-weight:300;line-height:1.6;">${slide.subtitle}</p>` : ''}
    ${slide.quote ? `<div style="margin-top:40px;max-width:600px;"><p style="font-size:14px;color:${colors.accentLight};font-style:italic;line-height:1.7;">"${slide.quote}"</p></div>` : ''}
    <div style="margin-top:60px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

// ============================================================
// Main render function
// ============================================================

type LayoutRenderer = (slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number) => string;

const LAYOUT_RENDERERS: Record<SlideLayout, LayoutRenderer> = {
  title: (s, c, t) => renderTitleSlide(s, c, t),
  key_points: renderKeyPointsSlide,
  grid_cards: renderGridCardsSlide,
  text_only: renderTextOnlySlide,
  two_column: renderTwoColumnSlide,
  comparison: renderComparisonSlide,
  timeline: renderTimelineSlide,
  data_highlight: renderDataHighlightSlide,
  process_flow: renderProcessFlowSlide,
  chart: renderChartSlide,
  closing: (s, c, t) => renderClosingSlide(s, c, t),
};

export function renderSlideToHTML(
  slide: SlideOutline, 
  colorScheme: string, 
  themeStyle: string,
  slideIndex?: number,
  totalSlides?: number
): string {
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.forest_gold;
  const theme = THEME_STYLES[themeStyle] || THEME_STYLES.business;
  const renderer = LAYOUT_RENDERERS[slide.layout] || renderTextOnlySlide;
  const innerHtml = renderer(slide, colors, theme, slideIndex ?? 0, totalSlides ?? 1);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1280px; height:720px; overflow:hidden;
    font-family:${theme.fontFamily};
    background:${colors.bgGradient};
    color:${colors.text};
    position:relative;
    -webkit-font-smoothing:antialiased;
    -moz-osx-font-smoothing:grayscale;
  }
</style>
</head>
<body>
  ${bgDecorations(theme, colors)}
  ${innerHtml}
</body>
</html>`;
}

// ============================================================
// Puppeteer Screenshot
// ============================================================

let browserInstance: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (browserInstance && browserInstance.connected) {
    return browserInstance;
  }
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
  totalSlides?: number
): Promise<Buffer> {
  const html = renderSlideToHTML(slide, colorScheme, themeStyle, slideIndex, totalSlides);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1.5 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.evaluate(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const screenshot = await page.screenshot({ 
      type: 'png',
      clip: { x: 0, y: 0, width: 1280, height: 720 }
    });
    return Buffer.from(screenshot);
  } finally {
    await page.close();
  }
}

/**
 * Render all slides to images
 */
export async function renderAllSlidesToImages(
  slides: SlideOutline[], 
  colorScheme: string, 
  themeStyle: string,
  onProgress?: (current: number, total: number) => void
): Promise<Buffer[]> {
  const images: Buffer[] = [];
  for (let i = 0; i < slides.length; i++) {
    if (onProgress) onProgress(i + 1, slides.length);
    const img = await renderSlideToImage(slides[i], colorScheme, themeStyle, i, slides.length);
    images.push(img);
  }
  return images;
}

/**
 * Close browser instance (cleanup)
 */
export async function closeBrowser(): Promise<void> {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}
