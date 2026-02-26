/**
 * E2E test: Generate PPT outline from sample text, then render each slide to HTML,
 * and save screenshots for visual inspection.
 * 
 * This bypasses the API auth layer and directly tests the pipeline.
 */
import { execSync } from 'child_process';

// We'll write a simpler approach: call postProcessOutline directly on a mock outline
// to verify the fix, then render each slide.

async function main() {
  // Import modules
  const { renderSlideToHTML, COLOR_SCHEMES } = await import('./server/pptRenderer.ts');
  
  // Simulate a realistic outline that would trigger the bugs:
  // 1. A comparison slide with empty bullets (空白页)
  // 2. A key_points slide with long descriptions
  // 3. Multiple slides with same layout (布局单一)
  const mockOutline = {
    presentationTitle: 'AI时代领导力变革',
    presentationSubtitle: '从传统管理到智能领导',
    slides: [
      {
        slideIndex: 0,
        layout: 'title',
        title: 'AI时代领导力变革',
        subtitle: '从传统管理到智能领导',
        sections: [],
      },
      {
        slideIndex: 1,
        layout: 'key_points',
        title: '领导风格是组织执行力的核心驱动力',
        subtitle: 'AI时代领导力的新范式',
        sections: [
          {
            type: 'bullet_list',
            title: '🔑 核心要点',
            leadSentence: 'AI时代领导力需要全面转型',
            bullets: [
              { icon: '📌', title: '领导风格直接塑造组织文化', description: '和员工士气。研究表明，积极的领导风格能提升员工工作效率20%以上，从而间接提高执行效率。这是一个非常重要的发现，需要管理者高度重视。' },
              { icon: '💡', title: '决策方式的透明度和参与度', description: '影响决策的落地速度与质量。扁型管理通过鼓励员工参与，使决策更具包容性，减少执行阻力。这种方式在现代企业中越来越受欢迎。' },
              { icon: '🔑', title: '互动文化决定信息流动的效率', description: '率和团队协作的紧密程度。开放、支持性的互动促进跨部门协作，减少沟通壁垒，提升协同效率。' },
              { icon: '📊', title: 'AI时代，领导者需从传统的指令下达转型为赋能者和教练', description: '引导团队利用数据进行决策，而非仅凭经验和直觉。' },
              { icon: '🎯', title: '数据驱动的决策能力成为新的领导力核心素质', description: '要求领导者善于理解并运用AI工具辅助决策，提高决策的精准性和前瞻性，避免主观偏见。' },
            ],
          },
          {
            type: 'stats_block',
            stats: [
              { icon: '📊', number: '30%', label: '麦肯锡研究显示，领导力是最驱动组织绩效提升' },
              { icon: '📈', number: '21%', label: '盖洛普报告指出，拥有优秀领导者的团队，其' },
              { icon: '🌐', number: '50%', label: 'Gartner预测，到2025年，的领导' },
            ],
          },
        ],
        quote: 'AI时代，领导风格从指令到赋能，从经验到数据，是驱动组织执行力与创新力的核心引擎。',
        quoteLabel: '核心启示',
      },
      {
        slideIndex: 2,
        layout: 'comparison',
        title: '传统与AI时代领导风格的范式转变',
        subtitle: '',
        leftLabel: '传统领导模式',
        rightLabel: 'AI时代领导模式',
        sections: [
          // BUG: empty bullets - this should trigger the blank page
          { type: 'bullet_list', title: '传统领导模式', bullets: [] },
          { type: 'bullet_list', title: 'AI时代领导模式', bullets: [] },
        ],
        quote: 'AI时代领导风格从集权指令转向赋能共创，是组织适应变化、激发创新、实现持续增长的必然选择。',
        quoteLabel: '核心启示',
      },
      {
        slideIndex: 3,
        layout: 'key_points',
        title: '数据驱动决策的领导力框架',
        sections: [
          {
            type: 'bullet_list',
            title: '📊 决策框架',
            bullets: [
              { icon: '📌', title: '数据采集', description: '建立全面的数据采集体系' },
              { icon: '💡', title: '分析洞察', description: '利用AI进行深度数据分析' },
              { icon: '🔑', title: '决策执行', description: '基于数据洞察快速决策' },
              { icon: '🎯', title: '反馈迭代', description: '持续优化决策模型' },
            ],
          },
          {
            type: 'insight_block',
            insightText: '数据驱动决策是AI时代领导力的核心能力',
            insightLabel: '核心洞察',
          },
        ],
        quote: '数据不会说谎，但需要领导者的智慧来解读。',
        quoteLabel: '启示',
      },
      {
        slideIndex: 4,
        layout: 'comparison',
        title: '组织架构的演进对比',
        sections: [
          // Another comparison with empty bullets
          { type: 'bullet_list', title: '层级制组织', bullets: [] },
          { type: 'bullet_list', title: '网络化组织', bullets: [] },
          { type: 'insight_block', insightText: '组织架构从层级制向网络化演进是必然趋势', insightLabel: '趋势' },
        ],
        quote: '扁平化不是目的，高效协作才是。',
        quoteLabel: '核心启示',
      },
      {
        slideIndex: 5,
        layout: 'closing',
        title: '感谢观看',
        subtitle: '泽思AI商业智库',
        sections: [],
      },
    ],
  };

  // First, run postProcessOutline to fix issues
  const { postProcessOutline } = await import('./server/pptStructurer.ts');
  
  console.log('=== Before postProcessOutline ===');
  console.log(`Slide 2 (comparison) bullets: left=${mockOutline.slides[2].sections[0].bullets.length}, right=${mockOutline.slides[2].sections[1].bullets.length}`);
  console.log(`Slide 4 (comparison) bullets: left=${mockOutline.slides[4].sections[0].bullets.length}, right=${mockOutline.slides[4].sections[1].bullets.length}`);
  console.log(`Slide 1 bullet[0] desc length: ${mockOutline.slides[1].sections[0].bullets[0].description.length}`);
  
  postProcessOutline(mockOutline);
  
  console.log('\n=== After postProcessOutline ===');
  for (let i = 0; i < mockOutline.slides.length; i++) {
    const s = mockOutline.slides[i];
    console.log(`Slide ${i} [${s.layout}] "${s.title}"`);
    s.sections?.forEach((sec, j) => {
      if (sec.bullets) {
        console.log(`  Section ${j} [${sec.type}]: ${sec.bullets.length} bullets`);
        sec.bullets.forEach((b, k) => {
          console.log(`    [${k}] title="${b.title}" (${b.title.length}ch) desc="${b.description}" (${b.description?.length || 0}ch)`);
        });
      } else if (sec.stats) {
        console.log(`  Section ${j} [${sec.type}]: ${sec.stats.length} stats`);
      } else if (sec.insightText) {
        console.log(`  Section ${j} [${sec.type}]: "${sec.insightText.slice(0, 40)}..."`);
      }
    });
  }

  // Now render each slide to HTML and save
  console.log('\n=== Rendering slides to HTML ===');
  const fs = await import('fs');
  const outputDir = '/home/ubuntu/ppt-test-output';
  fs.mkdirSync(outputDir, { recursive: true });
  
  for (let i = 0; i < mockOutline.slides.length; i++) {
    const slide = mockOutline.slides[i];
    const html = renderSlideToHTML(slide, 'forest_gold', 'business', i, mockOutline.slides.length);
    const filePath = `${outputDir}/slide_${i}.html`;
    fs.writeFileSync(filePath, html);
    console.log(`Saved ${filePath} (${html.length} chars)`);
  }
  
  console.log('\n=== Test complete ===');
  console.log(`Output files in ${outputDir}/`);
}

main().catch(e => { console.error(e); process.exit(1); });
