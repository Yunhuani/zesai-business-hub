/**
 * Diagnose blank page issue by testing postProcessOutline with various edge cases
 */
import { postProcessOutline } from './server/pptStructurer.ts';

// Simulate different scenarios that could cause blank pages
const testCases = [
  {
    name: "Case 1: sections is empty array",
    slide: { slideIndex: 2, layout: 'key_points', title: '传统与AI时代领导风格的范式转变', subtitle: '', quote: 'AI驱动的成功案例表明，将AI嵌入核心业务流程，能够显著提升组织效率', quoteLabel: '核心启示', sections: [] }
  },
  {
    name: "Case 2: sections is undefined",
    slide: { slideIndex: 2, layout: 'comparison', title: '成功案例：AI赋能下的组织效率飞跃', subtitle: '', quote: '核心启示', sections: undefined }
  },
  {
    name: "Case 3: sections has bullet_list but bullets is empty",
    slide: { slideIndex: 2, layout: 'key_points', title: '传统与AI时代领导风格的范式转变', subtitle: '', quote: '核心启示', sections: [{ type: 'bullet_list', title: '核心要点', bullets: [] }] }
  },
  {
    name: "Case 4: sections has bullet_list with bullets but all titles empty",
    slide: { slideIndex: 2, layout: 'key_points', title: '传统与AI时代领导风格的范式转变', subtitle: '', quote: '核心启示', sections: [{ type: 'bullet_list', title: '核心要点', bullets: [{ icon: '📌', title: '', description: '' }] }] }
  },
  {
    name: "Case 5: sections has only insight_block (no bullet_list)",
    slide: { slideIndex: 2, layout: 'key_points', title: '传统与AI时代领导风格的范式转变', subtitle: '', quote: '核心启示', sections: [{ type: 'insight_block', insightText: '核心洞察', insightLabel: '洞察' }] }
  },
  {
    name: "Case 6: sections has text_block with content string but no bullets",
    slide: { slideIndex: 2, layout: 'key_points', title: '传统与AI时代领导风格的范式转变', subtitle: '', quote: '核心启示', sections: [{ type: 'text_block', title: '要点', content: '这是一段很长的文本内容，包含了多个要点。第一个要点是关于领导力转型；第二个要点是关于AI赋能；第三个要点是关于组织变革。' }] }
  },
  {
    name: "Case 7: sections has bullet_list with undefined bullets",
    slide: { slideIndex: 2, layout: 'key_points', title: '传统与AI时代领导风格的范式转变', subtitle: '', quote: '核心启示', sections: [{ type: 'bullet_list', title: '核心要点' }] }
  },
];

for (const tc of testCases) {
  const outline = {
    presentationTitle: 'Test',
    presentationSubtitle: 'Test',
    slides: [
      { slideIndex: 0, layout: 'title', title: '封面', sections: [] },
      tc.slide,
      { slideIndex: 3, layout: 'closing', title: '结尾', sections: [] },
    ],
  };

  console.log(`\n=== ${tc.name} ===`);
  console.log(`Before: sections=${JSON.stringify(tc.slide.sections?.length)}, layout=${tc.slide.layout}`);
  
  const result = postProcessOutline(outline);
  const processed = result.slides[1];
  
  console.log(`After: layout=${processed.layout}, sections=${processed.sections?.length}`);
  processed.sections?.forEach((sec, i) => {
    console.log(`  Section ${i}: type=${sec.type}, bullets=${sec.bullets?.length || 0}, titles=[${sec.bullets?.map(b => b.title).join(', ') || 'none'}]`);
    if (sec.insightText) console.log(`  Section ${i}: insightText="${sec.insightText.slice(0, 50)}"`);
  });
  console.log(`  points=${processed.points?.length || 0}`);
}
