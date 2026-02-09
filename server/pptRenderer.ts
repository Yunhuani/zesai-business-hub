/**
 * PPT Slide Renderer
 * Renders structured slide data to HTML, then captures as PNG using Puppeteer
 */
import puppeteer, { Browser } from 'puppeteer';
import type { SlideOutline, SlideLayout } from './pptStructurer';

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
    cardBg: 'rgba(200,169,81,0.06)',
    cardBgHover: 'rgba(200,169,81,0.12)',
    border: 'rgba(200,169,81,0.15)',
    glow: 'rgba(200,169,81,0.08)',
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
    cardBg: 'rgba(74,144,217,0.06)',
    cardBgHover: 'rgba(74,144,217,0.12)',
    border: 'rgba(74,144,217,0.15)',
    glow: 'rgba(74,144,217,0.08)',
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
    cardBg: 'rgba(139,92,246,0.06)',
    cardBgHover: 'rgba(139,92,246,0.12)',
    border: 'rgba(139,92,246,0.15)',
    glow: 'rgba(139,92,246,0.08)',
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
    cardBg: 'rgba(255,255,255,0.04)',
    cardBgHover: 'rgba(255,255,255,0.08)',
    border: 'rgba(255,255,255,0.1)',
    glow: 'rgba(255,255,255,0.05)',
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
        <div style="position:absolute;top:-40px;right:-40px;width:200px;height:200px;border:1.5px solid ${colors.accent};opacity:0.08;transform:rotate(45deg);"></div>
        <div style="position:absolute;bottom:-20px;left:-20px;width:140px;height:140px;border:1.5px solid ${colors.accent};opacity:0.06;border-radius:50%;"></div>
        <div style="position:absolute;top:50%;right:60px;width:6px;height:6px;background:${colors.accent};opacity:0.15;border-radius:50%;"></div>
        <div style="position:absolute;top:30%;left:80px;width:4px;height:4px;background:${colors.accent};opacity:0.1;border-radius:50%;"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${colors.accent}30,transparent);"></div>
      ${end}`;
    case 'gradient':
      return `${base}
        <div style="position:absolute;top:-100px;right:-100px;width:400px;height:400px;background:radial-gradient(circle,${colors.accent}08,transparent 70%);"></div>
        <div style="position:absolute;bottom:-80px;left:-80px;width:300px;height:300px;background:radial-gradient(circle,${colors.accent}06,transparent 70%);"></div>
        <div style="position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${colors.accent}20,transparent);"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,${colors.accent}15,transparent);"></div>
      ${end}`;
    case 'minimal':
      return `${base}
        <div style="position:absolute;top:40px;left:60px;width:40px;height:2px;background:${colors.accent};opacity:0.2;"></div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:1px;background:linear-gradient(90deg,${colors.accent}10,transparent);"></div>
      ${end}`;
    case 'bold':
      return `${base}
        <div style="position:absolute;top:-80px;right:-80px;width:300px;height:300px;background:${colors.accent};opacity:0.04;border-radius:50%;"></div>
        <div style="position:absolute;bottom:-50px;left:-50px;width:200px;height:200px;background:${colors.accent};opacity:0.03;border-radius:50%;"></div>
        <div style="position:absolute;top:0;right:0;width:4px;height:100%;background:linear-gradient(180deg,${colors.accent}20,transparent);"></div>
      ${end}`;
  }
}

function accentBar(colors: ColorScheme, width = '50px'): string {
  return `<div style="width:${width};height:3px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:20px;border-radius:2px;"></div>`;
}

function slideNumber(index: number, total: number, colors: ColorScheme): string {
  return `<div style="position:absolute;bottom:24px;right:40px;font-size:11px;color:${colors.textSecondary};opacity:0.4;letter-spacing:1px;">${index + 1} / ${total}</div>`;
}

// ============================================================
// Layout Renderers
// ============================================================

function renderTitleSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 80px;position:relative;">
    <div style="width:60px;height:3px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h1 style="font-size:48px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 24px;line-height:1.4;letter-spacing:3px;">${slide.title}</h1>
    ${slide.subtitle ? `<p style="font-size:20px;color:${colors.textSecondary};margin:0;letter-spacing:2px;font-weight:300;">${slide.subtitle}</p>` : ''}
    <div style="width:30px;height:2px;background:${colors.accent};margin-top:48px;opacity:0.4;border-radius:1px;"></div>
    <div style="position:absolute;bottom:40px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

function renderSectionSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;padding:80px 100px;height:100%;position:relative;">
    <div style="width:40px;height:3px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:32px;border-radius:2px;"></div>
    <h2 style="font-size:42px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 16px;line-height:1.3;letter-spacing:2px;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;max-width:600px;line-height:1.6;font-weight:300;">${slide.subtitle}</p>` : ''}
  </div>`;
}

function renderKeyPointsSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  const pointsHtml = points.map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:20px;padding:18px 24px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:10px;backdrop-filter:blur(4px);">
      <div style="min-width:34px;height:34px;background:linear-gradient(135deg,${colors.accent},${colors.accentDark});color:${colors.bg};border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:15px;flex-shrink:0;">${i + 1}</div>
      <div style="flex:1;">
        <div style="font-size:17px;font-weight:600;color:${colors.text};margin-bottom:5px;">${p.title}</div>
        <div style="font-size:13px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:48px 60px;height:100%;position:relative;">
    ${accentBar(colors)}
    <h2 style="font-size:30px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 28px;letter-spacing:1px;">${slide.title}</h2>
    <div style="display:flex;flex-direction:column;gap:14px;flex:1;justify-content:center;">
      ${pointsHtml}
    </div>
    ${slide.footerNote ? `<p style="font-size:11px;color:${colors.textSecondary};margin-top:16px;opacity:0.5;">${slide.footerNote}</p>` : ''}
  </div>`;
}

function renderTextOnlySlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  const contentHtml = points.map(p => `
    <div style="margin-bottom:20px;">
      <div style="font-size:18px;font-weight:600;color:${colors.accent};margin-bottom:8px;">${p.title}</div>
      <div style="font-size:14px;color:${colors.textSecondary};line-height:1.8;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:48px 60px;height:100%;position:relative;">
    ${accentBar(colors)}
    <h2 style="font-size:30px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 28px;letter-spacing:1px;">${slide.title}</h2>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${contentHtml}</div>
    ${slide.footerNote ? `<p style="font-size:11px;color:${colors.textSecondary};margin-top:16px;opacity:0.5;">${slide.footerNote}</p>` : ''}
  </div>`;
}

function renderTwoColumnSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const left = slide.leftColumn || slide.points?.slice(0, Math.ceil((slide.points?.length || 0) / 2)) || [];
  const right = slide.rightColumn || slide.points?.slice(Math.ceil((slide.points?.length || 0) / 2)) || [];

  const renderCol = (items: { title: string; description: string }[]) => items.map(p => `
    <div style="padding:18px 20px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:10px;margin-bottom:12px;">
      <div style="font-size:16px;font-weight:600;color:${colors.text};margin-bottom:6px;">${p.title}</div>
      <div style="font-size:13px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:48px 60px;height:100%;position:relative;">
    ${accentBar(colors)}
    <h2 style="font-size:30px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 28px;letter-spacing:1px;">${slide.title}</h2>
    <div style="display:flex;gap:24px;flex:1;align-items:center;">
      <div style="flex:1;">${renderCol(left)}</div>
      <div style="flex:1;">${renderCol(right)}</div>
    </div>
  </div>`;
}

function renderComparisonSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const left = slide.leftColumn || [];
  const right = slide.rightColumn || [];
  const labels = slide.subtitle?.split(' vs ') || slide.subtitle?.split('VS') || ['方案A', '方案B'];

  const renderCol = (items: { title: string; description: string }[], label: string) => `
    <div style="flex:1;padding:24px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:12px;">
      <div style="font-size:16px;font-weight:700;color:${colors.accent};margin-bottom:20px;text-align:center;padding-bottom:12px;border-bottom:1px solid ${colors.border};">${label}</div>
      ${items.map(p => `
        <div style="margin-bottom:14px;">
          <div style="font-size:15px;font-weight:600;color:${colors.text};margin-bottom:4px;">${p.title}</div>
          <div style="font-size:12px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
        </div>
      `).join('')}
    </div>
  `;

  return `<div style="display:flex;flex-direction:column;padding:48px 60px;height:100%;position:relative;">
    ${accentBar(colors)}
    <h2 style="font-size:30px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 28px;letter-spacing:1px;">${slide.title}</h2>
    <div style="display:flex;gap:20px;flex:1;align-items:center;">
      ${renderCol(left, labels[0] || 'A')}
      ${renderCol(right, labels[1] || 'B')}
    </div>
  </div>`;
}

function renderTimelineSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  const stepsHtml = points.map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:20px;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,${colors.accent},${colors.accentDark});color:${colors.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${i + 1}</div>
        ${i < points.length - 1 ? `<div style="width:2px;height:32px;background:linear-gradient(180deg,${colors.accent}40,${colors.accent}10);margin:6px 0;"></div>` : ''}
      </div>
      <div style="padding-top:4px;padding-bottom:${i < points.length - 1 ? '12px' : '0'};">
        <div style="font-size:17px;font-weight:600;color:${colors.text};margin-bottom:5px;">${p.title}</div>
        <div style="font-size:13px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:48px 60px;height:100%;position:relative;">
    ${accentBar(colors)}
    <h2 style="font-size:30px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 28px;letter-spacing:1px;">${slide.title}</h2>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center;">${stepsHtml}</div>
  </div>`;
}

function renderDataHighlightSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;padding:48px 60px;height:100%;text-align:center;position:relative;">
    ${accentBar(colors, '40px')}
    <h2 style="font-size:26px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 36px;letter-spacing:1px;">${slide.title}</h2>
    ${slide.highlightNumber ? `
      <div style="font-size:68px;font-weight:800;background:linear-gradient(135deg,${colors.accent},${colors.accentLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:8px;letter-spacing:2px;">${slide.highlightNumber}</div>
      <div style="font-size:16px;color:${colors.textSecondary};margin-bottom:36px;letter-spacing:1px;">${slide.highlightLabel || ''}</div>
    ` : ''}
    <div style="display:flex;gap:20px;justify-content:center;flex-wrap:wrap;">
      ${points.map(p => `
        <div style="padding:20px 28px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:12px;min-width:160px;">
          <div style="font-size:26px;font-weight:700;background:linear-gradient(135deg,${colors.accent},${colors.accentLight});-webkit-background-clip:text;-webkit-text-fill-color:transparent;margin-bottom:6px;">${p.title}</div>
          <div style="font-size:12px;color:${colors.textSecondary};letter-spacing:0.5px;">${p.description}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderClosingSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px 80px;position:relative;">
    <div style="width:50px;height:3px;background:linear-gradient(90deg,${colors.accent},${colors.accentLight});margin-bottom:48px;border-radius:2px;"></div>
    <h2 style="font-size:40px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 20px;letter-spacing:3px;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:18px;color:${colors.textSecondary};margin:0;letter-spacing:1px;font-weight:300;">${slide.subtitle}</p>` : ''}
    <div style="margin-top:60px;font-size:12px;color:${colors.textSecondary};opacity:0.3;letter-spacing:1px;">泽思 Zenith AI · 智能文档生成</div>
  </div>`;
}

// ============================================================
// Main render function
// ============================================================

const LAYOUT_RENDERERS: Record<SlideLayout, (slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle) => string> = {
  title: renderTitleSlide,
  section: renderSectionSlide,
  key_points: renderKeyPointsSlide,
  text_only: renderTextOnlySlide,
  two_column: renderTwoColumnSlide,
  comparison: renderComparisonSlide,
  timeline: renderTimelineSlide,
  data_highlight: renderDataHighlightSlide,
  closing: renderClosingSlide,
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
  const innerHtml = renderer(slide, colors, theme);
  const showNumber = slide.layout !== 'title' && slide.layout !== 'closing' && slideIndex !== undefined && totalSlides !== undefined;

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
  ${showNumber ? slideNumber(slideIndex!, totalSlides!, colors) : ''}
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
