
import { renderSlideToHTML, renderSlideToImage, closeBrowser, COLOR_SCHEMES, THEME_STYLES } from './server/pptRenderer';
import { assemblePPT, generatePreviewBase64 } from './server/pptAssembler';
import type { SlideOutline, PPTOutline } from './server/pptStructurer';
import fs from 'fs';
import path from 'path';

// Mock PPT outline (simulating LLM output)
const mockOutline: PPTOutline = {
  presentationTitle: "理财专家一人公司商业模型方案",
  presentationSubtitle: "专业理财咨询 · 个性化资产配置",
  slides: [
    {
      slideIndex: 0,
      layout: "title",
      title: "理财专家一人公司商业模型方案",
      subtitle: "专业理财咨询 · 个性化资产配置"
    },
    {
      slideIndex: 1,
      layout: "section",
      title: "商业定位",
      subtitle: "专注中产家庭的理财咨询服务"
    },
    {
      slideIndex: 2,
      layout: "key_points",
      title: "核心服务体系",
      points: [
        { title: "个人财务规划", description: "收支分析、储蓄目标设定、债务管理" },
        { title: "投资组合配置", description: "根据风险偏好设计多元化投资组合" },
        { title: "保险与退休规划", description: "保障需求分析与长期退休策略" },
        { title: "税务优化", description: "合法节税方案设计" }
      ]
    },
    {
      slideIndex: 3,
      layout: "data_highlight",
      title: "盈利预期",
      highlightNumber: "60%-80%",
      highlightLabel: "预计利润率",
      points: [
        { title: "15,000-50,000元", description: "月收入预期" },
        { title: "3,000-8,000元", description: "月运营成本" }
      ]
    },
    {
      slideIndex: 4,
      layout: "two_column",
      title: "获客渠道",
      leftColumn: [
        { title: "线上渠道", description: "微信公众号、小红书、抖音内容营销" },
        { title: "社群运营", description: "建立理财交流社群，持续输出价值" }
      ],
      rightColumn: [
        { title: "线下活动", description: "定期举办理财沙龙和讲座" },
        { title: "合作引流", description: "与银行、保险公司等金融机构合作" }
      ]
    },
    {
      slideIndex: 5,
      layout: "timeline",
      title: "发展规划",
      points: [
        { title: "第一阶段（1-6个月）", description: "建立个人品牌，积累首批客户" },
        { title: "第二阶段（6-12个月）", description: "优化服务流程，提升客单价" },
        { title: "第三阶段（1-2年）", description: "扩展服务范围，考虑团队化运营" }
      ]
    },
    {
      slideIndex: 6,
      layout: "closing",
      title: "谢谢观看",
      subtitle: "泽思 Zenith AI · 智能文档生成"
    }
  ]
};

async function test() {
  const outputDir = '/home/ubuntu/ppt-test-output';
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  console.log('=== PPT Core Engine Direct Test ===\n');

  // Test 1: HTML rendering
  console.log('Test 1: Rendering HTML for each slide...');
  for (const slide of mockOutline.slides) {
    try {
      const html = renderSlideToHTML(slide, 'zenith_purple', 'business');
      const htmlPath = path.join(outputDir, `slide_${slide.slideIndex}.html`);
      fs.writeFileSync(htmlPath, html);
      console.log(`  ✅ Slide ${slide.slideIndex} (${slide.layout}): HTML saved`);
    } catch (e: any) {
      console.error(`  ❌ Slide ${slide.slideIndex} (${slide.layout}): ${e.message}`);
    }
  }

  // Test 2: Puppeteer screenshot
  console.log('\nTest 2: Rendering slides to PNG images...');
  const slideImages: Buffer[] = [];
  for (const slide of mockOutline.slides) {
    try {
      const img = await renderSlideToImage(slide, 'zenith_purple', 'business');
      slideImages.push(img);
      const imgPath = path.join(outputDir, `slide_${slide.slideIndex}.png`);
      fs.writeFileSync(imgPath, img);
      console.log(`  ✅ Slide ${slide.slideIndex}: PNG saved (${(img.length / 1024).toFixed(1)} KB)`);
    } catch (e: any) {
      console.error(`  ❌ Slide ${slide.slideIndex}: ${e.message}`);
    }
  }
  await closeBrowser();

  // Test 3: Preview base64
  console.log('\nTest 3: Generating preview base64...');
  if (slideImages.length > 0) {
    const previews = generatePreviewBase64(slideImages);
    console.log(`  ✅ Generated ${previews.length} preview images`);
    console.log(`  First preview length: ${previews[0].length} chars`);
  }

  // Test 4: PPT assembly (skip S3 upload, just test local generation)
  console.log('\nTest 4: Assembling PPT file (local only, skip S3)...');
  try {
    // We can't test S3 upload directly, but we can test pptxgenjs assembly
    const PptxGenJS = (await import('pptxgenjs')).default;
    const pptx = new PptxGenJS();
    pptx.layout = 'LAYOUT_16x9';
    pptx.title = mockOutline.presentationTitle;
    pptx.author = '泽思 Zenith AI';
    
    for (const imgBuffer of slideImages) {
      const slide = pptx.addSlide();
      const base64 = imgBuffer.toString('base64');
      slide.addImage({
        data: `image/png;base64,${base64}`,
        x: 0, y: 0, w: '100%', h: '100%',
      });
    }
    
    const pptPath = path.join(outputDir, 'test_output.pptx');
    await pptx.writeFile({ fileName: pptPath });
    const stats = fs.statSync(pptPath);
    console.log(`  ✅ PPT file saved: ${pptPath} (${(stats.size / 1024).toFixed(1)} KB)`);
  } catch (e: any) {
    console.error(`  ❌ PPT assembly failed: ${e.message}`);
  }

  console.log('\n=== All Tests Complete ===');
  console.log(`Output directory: ${outputDir}`);
}

test().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
