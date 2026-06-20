import { renderSlideToHTML } from './server/pptRenderer.ts';

// Test 1: completely empty slide
const slide1 = {
  layout: 'unknown_layout',
  slideIndex: 5,
  title: '完全空白测试',
  subtitle: '没有任何内容',
  sections: [],
  points: [],
};
const html1 = renderSlideToHTML(slide1, 'forest_gold', 'business');
console.log('Test1 contains 核心要点:', html1.includes('核心要点'));
console.log('Test1 layout check triggered:', html1.includes('key_points') || html1.includes('核心要点'));
console.log('Test1 length:', html1.length);

// Test 2: comparison with empty bullets
const slide2 = {
  layout: 'comparison',
  title: '对比分析空内容',
  leftLabel: '旧模式',
  rightLabel: '新模式',
  sections: [
    { type: 'bullet_list', title: '旧模式', bullets: [] },
    { type: 'bullet_list', title: '新模式', bullets: [] },
  ],
  points: [],
};
const html2 = renderSlideToHTML(slide2, 'deep_blue', 'business');
console.log('\nTest2 contains 核心要点:', html2.includes('核心要点'));
console.log('Test2 contains 旧模式:', html2.includes('旧模式'));
console.log('Test2 length:', html2.length);

// Check body content
const body1 = html1.match(/<body>(.*)<\/body>/s)?.[1] || '';
console.log('\nTest1 body length:', body1.length);
console.log('Test1 body snippet:', body1.substring(0, 1500));

const body2 = html2.match(/<body>(.*)<\/body>/s)?.[1] || '';
console.log('\nTest2 body length:', body2.length);
console.log('Test2 body snippet:', body2.substring(0, 1500));
