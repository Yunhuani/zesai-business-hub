import { describe, it, expect, vi } from 'vitest';

// Test pptStructurer module
describe('PPT Structurer', () => {
  it('should export structureTextToPPTOutline function', async () => {
    const mod = await import('../pptStructurer');
    expect(typeof mod.structureTextToPPTOutline).toBe('function');
  });
});

// Test pptRenderer module V4
describe('PPT Renderer V4', () => {
  it('should export COLOR_SCHEMES with expected keys', async () => {
    const { COLOR_SCHEMES } = await import('../pptRenderer');
    expect(COLOR_SCHEMES).toHaveProperty('forest_gold');
    expect(COLOR_SCHEMES).toHaveProperty('deep_blue');
    expect(COLOR_SCHEMES).toHaveProperty('zenith_purple');
    expect(COLOR_SCHEMES).toHaveProperty('classic_dark');
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

  it('should render key_points with V4 colored icons', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'key_points' as const,
      title: '关键要点',
      sections: [
        {
          type: 'bullet_list' as const,
          title: '📊 核心数据',
          leadSentence: '以下是关键数据指标',
          bullets: [
            { icon: '📈', title: '增长率', description: '同比增长45%' },
            { icon: '💰', title: '营收规模', description: '年营收突破10亿' },
            { icon: '🎯', title: '市场份额', description: '占据30%市场' },
            { icon: '🚀', title: '用户增长', description: '月活用户500万' },
          ],
        },
        {
          type: 'stats_block' as const,
          stats: [
            { icon: '📊', number: '45%', label: '增长率' },
            { icon: '💰', number: '10亿', label: '营收' },
          ],
        },
      ],
      points: [],
    };
    const html = renderSlideToHTML(slide, 'forest_gold', 'tech');
    expect(html).toContain('关键要点');
    expect(html).toContain('增长率');
    expect(html).toContain('同比增长45%');
    // V4: should have colored circle icons (border-radius:50%)
    expect(html).toContain('border-radius:50%');
    // V4: should have larger font sizes (14px for bullet titles)
    expect(html).toContain('font-size:14px');
  });

  it('should render comparison layout with colored icons', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'comparison' as const,
      title: '新旧对比',
      leftLabel: '传统方式',
      rightLabel: '新方式',
      sections: [
        {
          type: 'bullet_list' as const,
          title: '传统方式',
          bullets: [
            { icon: '📋', title: '手工操作', description: '效率低下' },
            { icon: '⏰', title: '耗时长', description: '需要3-5天' },
          ],
        },
        {
          type: 'bullet_list' as const,
          title: '新方式',
          bullets: [
            { icon: '🤖', title: 'AI自动化', description: '效率提升10倍' },
            { icon: '⚡', title: '实时处理', description: '秒级响应' },
          ],
        },
      ],
      points: [],
    };
    const html = renderSlideToHTML(slide, 'deep_blue', 'business');
    expect(html).toContain('新旧对比');
    expect(html).toContain('传统方式');
    expect(html).toContain('新方式');
    expect(html).toContain('手工操作');
    expect(html).toContain('AI自动化');
    // V4: colored circle icons
    expect(html).toContain('border-radius:50%');
  });

  it('should render data_dashboard with enhanced progress bars', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'data_dashboard' as const,
      title: '数据看板',
      sections: [
        {
          type: 'stats_block' as const,
          stats: [
            { icon: '📊', number: '1000W', label: '用户数' },
            { icon: '📈', number: '47%', label: '增长率' },
            { icon: '💰', number: '$5B', label: '估值' },
          ],
        },
        {
          type: 'progress_block' as const,
          chartData: {
            type: 'progress' as const,
            title: '关键指标',
            items: [
              { label: '市场渗透率', value: 65 },
              { label: '用户满意度', value: 92 },
              { label: '技术成熟度', value: 78 },
            ],
            source: '内部数据',
          },
        },
      ],
      points: [],
    };
    const html = renderSlideToHTML(slide, 'zenith_purple', 'business');
    expect(html).toContain('数据看板');
    expect(html).toContain('1000W');
    expect(html).toContain('47%');
    // V4: larger progress bars (14px height)
    expect(html).toContain('height:14px');
    // V4: larger stat numbers (24px)
    expect(html).toContain('font-size:24px');
  });

  it('should render closing slide to HTML', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'closing' as const,
      title: '谢谢',
      subtitle: '联系方式',
      points: [],
    };
    const html = renderSlideToHTML(slide, 'classic_dark', 'creative');
    expect(html).toContain('谢谢');
    expect(html).toContain('泽思 Zenith AI');
  });

  it('should render V4 quote block with larger height', async () => {
    const { renderSlideToHTML } = await import('../pptRenderer');
    const slide = {
      layout: 'key_points' as const,
      title: '测试金句',
      quote: '未来已来，唯变不变',
      quoteLabel: '核心洞察',
      sections: [
        {
          type: 'bullet_list' as const,
          bullets: [
            { icon: '📌', title: '要点', description: '测试' },
          ],
        },
      ],
      points: [],
    };
    const html = renderSlideToHTML(slide, 'deep_blue', 'business');
    expect(html).toContain('未来已来');
    expect(html).toContain('核心洞察');
    // V4: quote block is 70px tall
    expect(html).toContain('height:70px');
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
