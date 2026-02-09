import { describe, it, expect, vi } from 'vitest';

// Test pptStructurer module
describe('PPT Structurer', () => {
  it('should export structureTextToPPTOutline function', async () => {
    const mod = await import('../pptStructurer');
    expect(typeof mod.structureTextToPPTOutline).toBe('function');
  });
});

// Test pptRenderer module
describe('PPT Renderer', () => {
  it('should export COLOR_SCHEMES with expected keys', async () => {
    const { COLOR_SCHEMES } = await import('../pptRenderer');
    expect(COLOR_SCHEMES).toHaveProperty('forest_gold');
    expect(COLOR_SCHEMES).toHaveProperty('deep_blue');
    expect(COLOR_SCHEMES).toHaveProperty('zenith_purple');
    expect(COLOR_SCHEMES).toHaveProperty('classic_black');
  });

  it('should export THEME_STYLES with expected keys', async () => {
    const { THEME_STYLES } = await import('../pptRenderer');
    expect(THEME_STYLES).toHaveProperty('business');
    expect(THEME_STYLES).toHaveProperty('tech');
    expect(THEME_STYLES).toHaveProperty('simple');
    expect(THEME_STYLES).toHaveProperty('creative');
  });

  it('should render a title slide to HTML', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'title' as const,
      title: '测试标题',
      subtitle: '测试副标题',
      points: [],
    };
    const html = renderSlideToHTML(slide, 'zenith_purple', 'business');
    expect(html).toContain('测试标题');
    expect(html).toContain('测试副标题');
    expect(html).toContain('1280px');
    expect(html).toContain('720px');
  });

  it('should render a key_points slide to HTML', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'key_points' as const,
      title: '关键要点',
      points: [
        { title: '要点1', description: '描述1' },
        { title: '要点2', description: '描述2' },
      ],
    };
    const html = renderSlideToHTML(slide, 'forest_gold', 'tech');
    expect(html).toContain('关键要点');
    expect(html).toContain('要点1');
    expect(html).toContain('描述1');
  });

  it('should render a two_column slide to HTML', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'two_column' as const,
      title: '双栏布局',
      points: [
        { title: '左侧', description: '左侧内容' },
        { title: '右侧', description: '右侧内容' },
      ],
    };
    const html = renderSlideToHTML(slide, 'deep_blue', 'simple');
    expect(html).toContain('双栏布局');
    expect(html).toContain('左侧');
    expect(html).toContain('右侧');
  });

  it('should render a closing slide to HTML', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'closing' as const,
      title: '谢谢',
      subtitle: '联系方式',
      points: [],
    };
    const html = renderSlideToHTML(slide, 'classic_black', 'creative');
    expect(html).toContain('谢谢');
    expect(html).toContain('泽思 Zenith AI');
  });

  it('should apply correct color scheme', async () => {
    const { renderSlideToHTML, COLOR_SCHEMES } = await import('../pptRenderer');
    const slide = {
      layout: 'title' as const,
      title: 'Test',
      points: [],
    };
    const html = renderSlideToHTML(slide, 'forest_gold', 'business');
    expect(html).toContain(COLOR_SCHEMES.forest_gold.bg);
  });
});

// Test pptAssembler module
describe('PPT Assembler', () => {
  it('should export assemblePPT and generatePreviewBase64 functions', async () => {
    const mod = await import('../pptAssembler');
    expect(typeof mod.assemblePPT).toBe('function');
    expect(typeof mod.generatePreviewBase64).toBe('function');
  });

  it('should generate base64 previews from buffers', async () => {
    const { generatePreviewBase64 } = await import('../pptAssembler');
    const testBuffers = [
      Buffer.from('test-image-1'),
      Buffer.from('test-image-2'),
    ];
    const previews = generatePreviewBase64(testBuffers);
    expect(previews).toHaveLength(2);
    expect(previews[0]).toMatch(/^data:image\/png;base64,/);
    expect(previews[1]).toMatch(/^data:image\/png;base64,/);
  });
});
