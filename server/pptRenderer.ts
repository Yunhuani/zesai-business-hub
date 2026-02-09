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
  bgSecondary: string;
  accent: string;
  accentLight: string;
  text: string;
  textSecondary: string;
  cardBg: string;
  border: string;
}

export const COLOR_SCHEMES: Record<string, ColorScheme> = {
  forest_gold: {
    name: '森林金',
    bg: '#0a1a0f',
    bgSecondary: '#122218',
    accent: '#c8a951',
    accentLight: '#e8d48b',
    text: '#f0ede4',
    textSecondary: '#a8b5a0',
    cardBg: 'rgba(200,169,81,0.08)',
    border: 'rgba(200,169,81,0.2)',
  },
  deep_blue: {
    name: '深海蓝',
    bg: '#0a0e1a',
    bgSecondary: '#0f1528',
    accent: '#4a90d9',
    accentLight: '#7ab5f5',
    text: '#e8ecf4',
    textSecondary: '#8899b5',
    cardBg: 'rgba(74,144,217,0.08)',
    border: 'rgba(74,144,217,0.2)',
  },
  zenith_purple: {
    name: '泽思紫',
    bg: '#0e0a1a',
    bgSecondary: '#150f28',
    accent: '#8b5cf6',
    accentLight: '#a78bfa',
    text: '#ede8f5',
    textSecondary: '#9b8ab5',
    cardBg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.2)',
  },
  classic_black: {
    name: '经典黑',
    bg: '#111111',
    bgSecondary: '#1a1a1a',
    accent: '#ffffff',
    accentLight: '#e0e0e0',
    text: '#f5f5f5',
    textSecondary: '#999999',
    cardBg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.15)',
  },
};

// ============================================================
// Theme Styles (font + decorative elements)
// ============================================================
export interface ThemeStyle {
  name: string;
  fontFamily: string;
  headingWeight: number;
  decorStyle: 'geometric' | 'gradient' | 'minimal' | 'bold';
}

export const THEME_STYLES: Record<string, ThemeStyle> = {
  business: { name: '商务专业', fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif', headingWeight: 700, decorStyle: 'geometric' },
  tech: { name: '科技未来', fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif', headingWeight: 600, decorStyle: 'gradient' },
  simple: { name: '简约素雅', fontFamily: '"Noto Serif SC", "SimSun", serif', headingWeight: 500, decorStyle: 'minimal' },
  creative: { name: '创意活力', fontFamily: '"Noto Sans SC", "Microsoft YaHei", sans-serif', headingWeight: 800, decorStyle: 'bold' },
};

// ============================================================
// HTML Generation for each layout
// ============================================================

function decorElement(theme: ThemeStyle, colors: ColorScheme): string {
  switch (theme.decorStyle) {
    case 'geometric':
      return `<div style="position:absolute;top:40px;right:40px;width:120px;height:120px;border:2px solid ${colors.accent};opacity:0.15;transform:rotate(45deg);"></div>
        <div style="position:absolute;bottom:60px;left:40px;width:80px;height:80px;border:2px solid ${colors.accent};opacity:0.1;border-radius:50%;"></div>`;
    case 'gradient':
      return `<div style="position:absolute;top:0;right:0;width:300px;height:300px;background:radial-gradient(circle,${colors.accent}15,transparent 70%);"></div>
        <div style="position:absolute;bottom:0;left:0;width:200px;height:200px;background:radial-gradient(circle,${colors.accent}10,transparent 70%);"></div>`;
    case 'minimal':
      return `<div style="position:absolute;top:40px;left:40px;width:60px;height:3px;background:${colors.accent};opacity:0.3;"></div>`;
    case 'bold':
      return `<div style="position:absolute;top:-50px;right:-50px;width:250px;height:250px;background:${colors.accent};opacity:0.06;border-radius:50%;"></div>
        <div style="position:absolute;bottom:-30px;left:-30px;width:180px;height:180px;background:${colors.accent};opacity:0.04;border-radius:50%;"></div>`;
  }
}

function accentBar(colors: ColorScheme): string {
  return `<div style="width:60px;height:4px;background:${colors.accent};margin-bottom:24px;border-radius:2px;"></div>`;
}

function renderTitleSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px;">
    ${decorElement(theme, colors)}
    <div style="width:80px;height:4px;background:${colors.accent};margin-bottom:40px;border-radius:2px;"></div>
    <h1 style="font-size:52px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 20px;line-height:1.3;letter-spacing:2px;">${slide.title}</h1>
    ${slide.subtitle ? `<p style="font-size:22px;color:${colors.textSecondary};margin:0;letter-spacing:1px;">${slide.subtitle}</p>` : ''}
    <div style="width:40px;height:2px;background:${colors.accent};margin-top:40px;opacity:0.5;"></div>
  </div>`;
}

function renderSectionSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;padding:80px;height:100%;">
    ${decorElement(theme, colors)}
    <div style="width:50px;height:4px;background:${colors.accent};margin-bottom:30px;border-radius:2px;"></div>
    <h2 style="font-size:44px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 16px;line-height:1.3;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:20px;color:${colors.textSecondary};margin:0;max-width:600px;">${slide.subtitle}</p>` : ''}
  </div>`;
}

function renderKeyPointsSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  const pointsHtml = points.map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:20px;padding:20px 24px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:8px;">
      <div style="min-width:36px;height:36px;background:${colors.accent};color:${colors.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;">${i + 1}</div>
      <div>
        <div style="font-size:18px;font-weight:600;color:${colors.text};margin-bottom:6px;">${p.title}</div>
        <div style="font-size:14px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:50px 60px;height:100%;">
    ${decorElement(theme, colors)}
    ${accentBar(colors)}
    <h2 style="font-size:32px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 32px;">${slide.title}</h2>
    <div style="display:flex;flex-direction:column;gap:16px;flex:1;">
      ${pointsHtml}
    </div>
    ${slide.footerNote ? `<p style="font-size:12px;color:${colors.textSecondary};margin-top:20px;opacity:0.6;">${slide.footerNote}</p>` : ''}
  </div>`;
}

function renderTextOnlySlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  const contentHtml = points.map(p => `
    <div style="margin-bottom:24px;">
      <div style="font-size:20px;font-weight:600;color:${colors.accent};margin-bottom:8px;">${p.title}</div>
      <div style="font-size:15px;color:${colors.textSecondary};line-height:1.8;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:50px 60px;height:100%;">
    ${decorElement(theme, colors)}
    ${accentBar(colors)}
    <h2 style="font-size:32px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 32px;">${slide.title}</h2>
    <div style="flex:1;">${contentHtml}</div>
    ${slide.footerNote ? `<p style="font-size:12px;color:${colors.textSecondary};margin-top:20px;opacity:0.6;">${slide.footerNote}</p>` : ''}
  </div>`;
}

function renderTwoColumnSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const left = slide.leftColumn || slide.points?.slice(0, Math.ceil((slide.points?.length || 0) / 2)) || [];
  const right = slide.rightColumn || slide.points?.slice(Math.ceil((slide.points?.length || 0) / 2)) || [];

  const renderCol = (items: { title: string; description: string }[]) => items.map(p => `
    <div style="margin-bottom:20px;padding:16px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:8px;">
      <div style="font-size:17px;font-weight:600;color:${colors.text};margin-bottom:6px;">${p.title}</div>
      <div style="font-size:13px;color:${colors.textSecondary};line-height:1.6;">${p.description}</div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:50px 60px;height:100%;">
    ${decorElement(theme, colors)}
    ${accentBar(colors)}
    <h2 style="font-size:32px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 32px;">${slide.title}</h2>
    <div style="display:flex;gap:30px;flex:1;">
      <div style="flex:1;">${renderCol(left)}</div>
      <div style="flex:1;">${renderCol(right)}</div>
    </div>
  </div>`;
}

function renderComparisonSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const left = slide.leftColumn || [];
  const right = slide.rightColumn || [];

  const renderCol = (items: { title: string; description: string }[], label: string) => `
    <div style="flex:1;padding:24px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:12px;">
      <div style="font-size:18px;font-weight:700;color:${colors.accent};margin-bottom:20px;text-align:center;">${label}</div>
      ${items.map(p => `
        <div style="margin-bottom:16px;">
          <div style="font-size:16px;font-weight:600;color:${colors.text};margin-bottom:4px;">${p.title}</div>
          <div style="font-size:13px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
        </div>
      `).join('')}
    </div>
  `;

  return `<div style="display:flex;flex-direction:column;padding:50px 60px;height:100%;">
    ${decorElement(theme, colors)}
    ${accentBar(colors)}
    <h2 style="font-size:32px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 32px;">${slide.title}</h2>
    <div style="display:flex;gap:24px;flex:1;">
      ${renderCol(left, slide.subtitle?.split(' vs ')[0] || 'A')}
      <div style="width:2px;background:${colors.border};"></div>
      ${renderCol(right, slide.subtitle?.split(' vs ')[1] || 'B')}
    </div>
  </div>`;
}

function renderTimelineSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  const stepsHtml = points.map((p, i) => `
    <div style="display:flex;align-items:flex-start;gap:16px;">
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:32px;height:32px;background:${colors.accent};color:${colors.bg};border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex-shrink:0;">${i + 1}</div>
        ${i < points.length - 1 ? `<div style="width:2px;height:40px;background:${colors.border};margin:4px 0;"></div>` : ''}
      </div>
      <div style="padding-bottom:${i < points.length - 1 ? '16px' : '0'};">
        <div style="font-size:17px;font-weight:600;color:${colors.text};margin-bottom:4px;">${p.title}</div>
        <div style="font-size:13px;color:${colors.textSecondary};line-height:1.5;">${p.description}</div>
      </div>
    </div>
  `).join('');

  return `<div style="display:flex;flex-direction:column;padding:50px 60px;height:100%;">
    ${decorElement(theme, colors)}
    ${accentBar(colors)}
    <h2 style="font-size:32px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 32px;">${slide.title}</h2>
    <div style="flex:1;">${stepsHtml}</div>
  </div>`;
}

function renderDataHighlightSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  const points = slide.points || [];
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;padding:50px 60px;height:100%;text-align:center;">
    ${decorElement(theme, colors)}
    ${accentBar(colors)}
    <h2 style="font-size:28px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 40px;">${slide.title}</h2>
    ${slide.highlightNumber ? `
      <div style="font-size:72px;font-weight:800;color:${colors.accent};margin-bottom:8px;letter-spacing:2px;">${slide.highlightNumber}</div>
      <div style="font-size:18px;color:${colors.textSecondary};margin-bottom:40px;">${slide.highlightLabel || ''}</div>
    ` : ''}
    <div style="display:flex;gap:24px;justify-content:center;flex-wrap:wrap;">
      ${points.map(p => `
        <div style="padding:20px;background:${colors.cardBg};border:1px solid ${colors.border};border-radius:10px;min-width:160px;">
          <div style="font-size:28px;font-weight:700;color:${colors.accent};margin-bottom:6px;">${p.title}</div>
          <div style="font-size:13px;color:${colors.textSecondary};">${p.description}</div>
        </div>
      `).join('')}
    </div>
  </div>`;
}

function renderClosingSlide(slide: SlideOutline, colors: ColorScheme, theme: ThemeStyle): string {
  return `<div style="display:flex;flex-direction:column;justify-content:center;align-items:center;height:100%;text-align:center;padding:60px;">
    ${decorElement(theme, colors)}
    <div style="width:60px;height:4px;background:${colors.accent};margin-bottom:40px;border-radius:2px;"></div>
    <h2 style="font-size:44px;font-weight:${theme.headingWeight};color:${colors.text};margin:0 0 20px;">${slide.title}</h2>
    ${slide.subtitle ? `<p style="font-size:20px;color:${colors.textSecondary};margin:0;">${slide.subtitle}</p>` : ''}
    <div style="margin-top:50px;font-size:14px;color:${colors.textSecondary};opacity:0.5;">泽思 Zenith AI · 智能文档生成</div>
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

export function renderSlideToHTML(slide: SlideOutline, colorScheme: string, themeStyle: string): string {
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.forest_gold;
  const theme = THEME_STYLES[themeStyle] || THEME_STYLES.business;
  const renderer = LAYOUT_RENDERERS[slide.layout] || renderTextOnlySlide;
  const innerHtml = renderer(slide, colors, theme);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;600;700;800;900&family=Noto+Serif+SC:wght@400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    width:1280px; height:720px; overflow:hidden;
    font-family:${theme.fontFamily};
    background:${colors.bg};
    color:${colors.text};
    position:relative;
  }
</style>
</head>
<body>${innerHtml}</body>
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
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
  return browserInstance;
}

export async function renderSlideToImage(slide: SlideOutline, colorScheme: string, themeStyle: string): Promise<Buffer> {
  const html = renderSlideToHTML(slide, colorScheme, themeStyle);
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setViewport({ width: 1280, height: 720 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(resolve => setTimeout(resolve, 500));
    
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
    const img = await renderSlideToImage(slides[i], colorScheme, themeStyle);
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
