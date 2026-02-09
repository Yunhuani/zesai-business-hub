/**
 * PPT Slide Renderer
 * Renders structured slide data to HTML, then captures as PNG using Puppeteer
 */
import puppeteer, { Browser } from 'puppeteer';
import type { SlideOutline, SlideLayout, SlidePoint } from './pptStructurer';

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
  text: string;
  textSecondary: string;
  cardBg: string;
  cardBgHover: string;
  border: string;
  glow: string;
  titleBarBg: string;
}

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  forest_gold: {
    name: '森林金',
    bg: '#0a1a0f',
    bgGradient: 'linear-gradient(135deg, #0a1a0f 0%, #0f2518 40%, #0d1f14 100%)',
    accent: '#c8a951',
    accentLight: '#e8d48b',
    accentDark: '#8a7235',
    text: '#f0ede4',
    textSecondary: '#a8b5a0',
    cardBg: 'rgba(200,169,81,0.08)',
    cardBgHover: 'rgba(200,169,81,0.14)',
    border: 'rgba(200,169,81,0.18)',
    glow: 'rgba(200,169,81,0.08)',
    titleBarBg: 'linear-gradient(90deg, rgba(200,169,81,0.15), rgba(200,169,81,0.05))',
  },
  deep_blue: {
    name: '深海蓝',
    bg: '#080c1a',
    bgGradient: 'linear-gradient(135deg, #080c1a 0%, #0d1530 40%, #0a1025 100%)',
    accent: '#4a90d9',
    accentLight: '#7ab5f5',
    accentDark: '#2d5a8a',
    text: '#e8ecf4',
    textSecondary: '#8899b5',
    cardBg: 'rgba(74,144,217,0.08)',
    cardBgHover: 'rgba(74,144,217,0.14)',
    border: 'rgba(74,144,217,0.18)',
    glow: 'rgba(74,144,217,0.08)',
    titleBarBg: 'linear-gradient(90deg, rgba(74,144,217,0.15), rgba(74,144,217,0.05))',
  },
  zenith_purple: {
    name: '泽思紫',
    bg: '#0c081a',
    bgGradient: 'linear-gradient(135deg, #0c081a 0%, #150d30 40%, #100a25 100%)',
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
    accentDark: '#5b3aaa',
    text: '#ede8f5',
    textSecondary: '#9b8ab5',
    cardBg: 'rgba(139,92,246,0.08)',
    cardBgHover: 'rgba(139,92,246,0.14)',
    border: 'rgba(139,92,246,0.18)',
    glow: 'rgba(139,92,246,0.08)',
    titleBarBg: 'linear-gradient(90deg, rgba(139,92,246,0.15), rgba(139,92,246,0.05))',
  },
  classic_black: {
    name: '经典黑',
    bg: '#0d0d0d',
    bgGradient: 'linear-gradient(135deg, #0d0d0d 0%, #161616 40%, #111111 100%)',
    accent: '#e0e0e0',
    accentLight: '#ffffff',
    accentDark: '#999999',
    text: '#f5f5f5',
    textSecondary: '#888888',
    cardBg: 'rgba(255,255,255,0.05)',
    cardBgHover: 'rgba(255,255,255,0.10)',
    border: 'rgba(255,255,255,0.12)',
    glow: 'rgba(255,255,255,0.05)',
    titleBarBg: 'linear-gradient(90deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))',
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
// Shared decorative elements
// ============================================================

function bgDecorations(theme: ThemeStyle, colors: ColorScheme): string {
  const base = `<div style="position:absolute;top:0;left:0;right:0;bottom:0;pointer-events:none;overflow:hidden;">`;
  const end = `</div>`;
  
  switch (theme.decorStyle) {
    case 'geometric':
      return `${base}
        <div style="position:absolute;top:-60px;right:-60px;width:250px;height:250px;border:2px solid ${colors.accent};opacity:0.06;transform:rotate(45deg);"></div>
        <div style="position:absolute;bottom:-30px;left:-30px;width:180px;height:180px;border:2px solid ${colors.accent};opacity:0.05;border-radius:50%;"></div>
        <div style="position:absolute;top:50%;right:60px;width:8px;height:8px;background:${colors.accent};opacity:0.12;border-radius:50%;"></div>
        <div style="position:absolute;top:25%;left:80px;width:5px;height:5px;background:${colors.accent};opacity:0.08;border-radius:50%;"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${colors.accent}30,transparent);"></div>
      ${end}`;
    case 'gradient':
      return `${base}
        <div style="position:absolute;top:-120px;right:-120px;width:500px;height:500px;background:radial-gradient(circle,${colors.accent}0a,transparent 70%);"></div>
        <div style="position:absolute;bottom:-100px;left:-100px;width:400px;height:400px;background:radial-gradient(circle,${colors.accent}08,transparent 70%);"></div>
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${colors.accent}25,transparent);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${colors.accent}18,transparent);"></div>
      ${end}`;
    case 'minimal':
      return `${base}
        <div style="position:absolute;top:40px;left:60px;width:40px;height:2px;background:${colors.accent};opacity:0.2;"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,${colors.accent}10,transparent);"></div>
      ${end}`;
    case 'bold':
      return `${base}
        <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:${colors.accent};opacity:0.04;border-radius:50%;"></div>
        <div style="position:absolute;bottom:-60px;left:-60px;width:250px;height:250px;background:${colors.accent};opacity:0.03;border-radius:50%;"></div>
        <div style="position:absolute;top:0;right:0;width:5px;height:100%;background:linear-gradient(180deg,${colors.accent}25,transparent);"></div>
      ${end}`;
  }
}

function titleBar(title: string, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;align-items:center;gap:16px;padding:14px 24px;background:${colors.titleBarBg};border-left:4px solid ${colors.accent};margin-bottom:28px;border-radius:0 8px 8px 0;">
    <h2 style="font-size:26px;font-weight:${theme.headingWeight};color:${colors.text};margin:0;letter-spacing:1px;line-height:1.3;">${title}</h2>
  </div>`;
}

function slideFooter(index: number, total: number, colors: ColorScheme, footerNote?: string): string {
  return `<div style="position:absolute;bottom:0;left:0;right:0;display:flex;justify-content:space-between;align-items:center;padding:12px 40px;border-top:1px solid ${colors.border};">
    ${footerNote ? `<span style="font-size:11px;color:${colors.textSecondary};opacity:0.5;max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${footerNote}</span>` : '<span></span>'}
    <span style="font-size:11px;color:${colors.textSecondary};opacity:0.4;letter-spacing:1px;">${index + 1} / ${total}</span>
  </div>`;
}

function iconBadge(icon: string, colors: ColorScheme, size = 36): string {
  return `<div style="min-width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.55)}px;flex-shrink:0;">${icon || '📌'}</div>`;
}

// ============================================================
// Layout Renderers
// ============================================================

function renderTitleSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:80px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h1 style="font-size:44px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 24px;line-height:1.4;letter-spacing:2px;">${slide.title}</h1>
    ${slide.subtitle ? `<p style="font-size:20px;color:${colors.textSecondary};margin:0;letter-spacing:2px;font-weight:300;line-height:1.6;">${slide.subtitle}</p>` : ''}
    <div style="width:30px;height:2px;background:${colors.accent};margin-top:48px;opacity:0.4;border-radius:1px;"></div>
    <div style="position:absolute;bottom:40px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

function renderSectionSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;padding:80px 100px;height:100%;position:relative;">
    <div style="width:50px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:36px;border-radius:2px;"></div>
    <h2 style="font-size:40px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 16px;line-height:1.3;letter-spacing:2px;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;max-width:700px;line-height:1.7;font-weight:300;">${slide.subtitle}</p>` : ''}
  </div>`;
}

function renderKeyPointsSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const pointsHtml = points.map((p) => `
    <div style="display:flex;align-items:flex-start;gap:16px;padding:16px 20px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:10px;">
      ${iconBadge(p.icon, colors, 34)}
      <div style="flex:1;">
        <div style="font-size:16px;font-weight:600;color:${colors.text};margin-bottom:4px;">${p.title}</div>
        <div style="font-size:13px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:40px 50px 48px;height:100%;position:relative;">
    ${titleBar(slide.title, colors, theme)}
    <div style="display:flex;flex-direction:column;gap:12px;flex:1;justify-content:center;">
      ${pointsHtml}
    </div>
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderGridCardsSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const cols = points.length <= 4 ? 2 : 3;
  
  const cardsHtml = points.map((p) => `
    <div style="padding:24px 20px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:12px;display:flex;flex-direction:column;align-items:center;text-align:center;">
      <div style="font-size:32px;margin-bottom:12px;">${p.icon || '📌'}</div>
      <div style="font-size:16px;font-weight:600;color:${colors.text};margin-bottom:8px;">${p.title}</div>
      <div style="font-size:12px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:40px 50px 48px;height:100%;position:relative;">
    ${titleBar(slide.title, colors, theme)}
    <div style="display:grid;grid-template-columns:repeat(${cols}, 1fr);gap:16px;flex:1;align-content:center;">
      ${cardsHtml}
    </div>
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderTextOnlySlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const contentHtml = points.map(p => `
    <div style="margin-bottom:22px;">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
        ${iconBadge(p.icon, colors, 24)}
        <div style="font-size:18px;font-weight:600;color:${colors.accent};">${p.title}</div>
      </div>
      <div style="font-size:14px;color:${colors.textSecondary};line-height:1.8;padding-left:34px;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:40px 50px 48px;height:100%;position:relative;">
    ${titleBar(slide.title, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${contentHtml}</div>
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderTwoColumnSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const left = slide.leftColumn || slide.points?.slice(0, Math.ceil((slide.points?.length || 0) / 2)) || [];
  const right = slide.rightColumn || slide.points?.slice(Math.ceil((slide.points?.length || 0) / 2)) || [];

  const renderCol = (items: SlidePoint[], label?: string) => `
    <div style="flex:1;">
      ${label ? `<div style="font-size:14px;font-weight:600;color:${colors.accent};margin-bottom:16px;padding-bottom:8px;border-bottom:1px solid ${colors.border};">${label}</div>` : ''}
      ${items.map(p => `
        <div style="padding:14px 16px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:10px;margin-bottom:10px;display:flex;align-items:flex-start;gap:12px;">
          ${iconBadge(p.icon, colors, 28)}
          <div style="flex:1;">
            <div style="font-size:15px;font-weight:600;color:${colors.text};margin-bottom:4px;">${p.title}</div>
            <div style="font-size:12px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  const labels = slide.subtitle?.split(' vs ') || slide.subtitle?.split('VS') || undefined;

  return `<div style="display:flex;flex-direction:column;padding:40px 50px 48px;height:100%;position:relative;">
    ${titleBar(slide.title, colors, theme)}
    <div style="display:flex;gap:20px;flex:1;align-items:center;">
      ${renderCol(left, labels?.[0])}
      <div style="width:1px;height:60%;background:${colors.border};flex-shrink:0;"></div>
      ${renderCol(right, labels?.[1])}
    </div>
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderComparisonSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const left = slide.leftColumn || [];
  const right = slide.rightColumn || [];
  const labels = slide.subtitle?.split(' vs ') || slide.subtitle?.split('VS') || ['方案A', '方案B'];

  const renderCol = (items: SlidePoint[], label: string, isLeft: boolean) => `
    <div style="flex:1;padding:20px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:12px;">
      <div style="font-size:16px;font-weight:700;color:${isLeft ? colors.accent : colors.accentLight};margin-bottom:18px;text-align:center;padding-bottom:10px;border-bottom:2px solid ${isLeft ? colors.accent : colors.accentLight}30;">${label}</div>
      ${items.map(p => `
        <div style="margin-bottom:14px;display:flex;align-items:flex-start;gap:10px;">
          ${iconBadge(p.icon, colors, 24)}
          <div>
            <div style="font-size:14px;font-weight:600;color:${colors.text};margin-bottom:3px;">${p.title}</div>
            <div style="font-size:12px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;

  return `<div style="display:flex;flex-direction:column;padding:40px 50px 48px;height:100%;position:relative;">
    ${titleBar(slide.title, colors, theme)}
    <div style="display:flex;gap:20px;flex:1;align-items:center;">
      ${renderCol(left, labels[0] || 'A', true)}
      <div style="font-size:20px;color:${colors.accent};font-weight:700;flex-shrink:0;">VS</div>
      ${renderCol(right, labels[1] || 'B', false)}
    </div>
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderTimelineSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  const stepsHtml = points.map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:18px;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:38px;height:38px;background:linear-gradient(135deg,${colors.accent},${colors.accentDark});color:${colors.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">${p.icon || (i + 1)}</div>
        ${i < points.length - 1 ? `<div style="width:2px;height:28px;background:linear-gradient(180deg,${colors.accent}50,${colors.accent}10);margin:4px 0;"></div>` : ''}
      </div>
      <div style="padding-top:6px;padding-bottom:${i < points.length - 1 ? '8px' : '0'};">
        <div style="font-size:16px;font-weight:600;color:${colors.text};margin-bottom:4px;">${p.title}</div>
        <div style="font-size:13px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:40px 50px 48px;height:100%;position:relative;">
    ${titleBar(slide.title, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${stepsHtml}</div>
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderDataHighlightSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number): string {
  const points = slide.points || [];
  return `<div style="display:flex;flex-direction:column;padding:40px 50px 48px;height:100%;position:relative;">
    ${titleBar(slide.title, colors, theme)}
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;">
      ${slide.highlightNumber ? `
        <div style="font-size:72px;font-weight:800;background:linear-gradient(135deg,${colors.accent},${colors.accentLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;letter-spacing:2px;">${slide.highlightNumber}</div>
        <div style="font-size:16px;color:${colors.textSecondary};margin-bottom:36px;letter-spacing:1px;">${slide.highlightLabel || ''}</div>
      ` : ''}
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;width:100%;">
        ${points.map(p => `
          <div style="padding:18px 24px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:12px;min-width:180px;flex:1;max-width:280px;">
            <div style="font-size:14px;margin-bottom:8px;">${p.icon || '📊'}</div>
            <div style="font-size:22px;font-weight:700;background:linear-gradient(135deg,${colors.accent},${colors.accentLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;">${p.title}</div>
            <div style="font-size:12px;color:${colors.textSecondary};letter-spacing:0.5px;line-height:1.5;">${p.description}</div>
          </div>
        `).join('')}
      </div>
    </div>
    ${slideFooter(slideIndex, totalSlides, colors, slide.footerNote)}
  </div>`;
}

function renderClosingSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 100px;position:relative;">
    <div style="width:60px;height:4px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h2 style="font-size:38px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 20px;letter-spacing:3px;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;letter-spacing:1px;font-weight:300;line-height:1.6;">${slide.subtitle}</p>` : ''}
    <div style="margin-top:60px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

// ============================================================
// Main render function
// ============================================================

type LayoutRenderer = (slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle, slideIndex: number, totalSlides: number) => string;

const LAYOUT_RENDERERS: Record<SlideLayout, LayoutRenderer> = {
  title: (s, c, t) => renderTitleSlide(s, c, t),
  section: (s, c, t) => renderSectionSlide(s, c, t),
  key_points: renderKeyPointsSlide,
  grid_cards: renderGridCardsSlide,
  text_only: renderTextOnlySlide,
  two_column: renderTwoColumnSlide,
  comparison: renderComparisonSlide,
  timeline: renderTimelineSlide,
  data_highlight: renderDataHighlightSlide,
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
