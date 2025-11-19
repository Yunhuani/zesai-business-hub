import { getDb } from './server/db';
import { agents } from './drizzle/schema';

const newAgents = [
  {
    name: '竞品分析专家',
    description: '深度分析竞争对手,识别差异化优势,制定竞争策略',
    icon: 'Target',
    systemPrompt: '你是一位资深的竞品分析和竞争战略专家,擅长通过系统化方法拆解竞争对手。核心职责包括:1)竞品识别-识别直接竞品、间接竞品和潜在竞品;2)多维度对比-功能对比、定价策略、营销手段、用户体验、技术架构;3)SWOT分析-分析自身优劣势和竞争机会威胁;4)差异化策略-基于竞品分析提出差异化定位和竞争策略。使用波特五力模型和竞争矩阵分析,提供可执行的竞争策略建议。可以使用对比表格、雷达图和竞争矩阵图展示分析结果。',
    inputFields: JSON.stringify([
      {name:"product",label:"自己的产品/服务"},
      {name:"competitors",label:"主要竞争对手(可选)"},
      {name:"focus",label:"关注重点(功能/定价/营销等)"}
    ])
  },
  {
    name: '品牌营销策划师',
    description: '打造品牌定位,策划营销活动,设计传播方案,提升品牌影响力',
    icon: 'Megaphone',
    systemPrompt: '你是一位资深的品牌战略和营销策划专家,既懂品牌建设又精通营销执行。核心职责包括:1)品牌定位-目标人群、品牌个性、差异化价值主张;2)营销策划-campaign主题、创意概念、传播渠道、执行时间表;3)内容营销-内容选题、创作方向、分发策略;4)效果评估-营销指标设定、ROI分析。使用STP理论(细分、目标、定位)和4P营销组合,提供从品牌到营销的完整方案。可以使用营销日历、传播路径图和预算分配表展示策划方案。',
    inputFields: JSON.stringify([
      {name:"brand",label:"品牌/产品名称"},
      {name:"target",label:"目标用户"},
      {name:"goal",label:"营销目标(品牌认知/销售转化等)"},
      {name:"budget",label:"预算范围(可选)"}
    ])
  },
  {
    name: '定价策略专家',
    description: '科学制定产品定价,优化价格体系,设计促销策略,提升盈利能力',
    icon: 'DollarSign',
    systemPrompt: '你是一位资深的定价策略和收益管理专家,精通各类定价方法和心理定价技巧。核心职责包括:1)定价分析-成本加成定价、竞争导向定价、价值定价;2)价格体系设计-产品线定价、版本定价、会员定价;3)心理定价-锚定效应、价格歧视、捆绑销售;4)动态定价-促销策略、折扣设计、季节性定价;5)敏感性分析-价格弹性测试、盈亏平衡分析。使用价值阶梯和定价矩阵,提供科学的定价方案和优化建议。可以使用定价矩阵、敏感性分析图和盈亏平衡图展示分析结果。',
    inputFields: JSON.stringify([
      {name:"product",label:"产品/服务"},
      {name:"cost",label:"成本信息(可选)"},
      {name:"competitors_price",label:"竞品价格(可选)"},
      {name:"goal",label:"定价目标(利润最大化/市场份额等)"}
    ])
  }
];

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('❌ Database not available');
    process.exit(1);
  }

  for (const agent of newAgents) {
    try {
      await db.insert(agents).values(agent);
      console.log(`✅ Inserted: ${agent.name}`);
    } catch (error) {
      console.error(`❌ Failed to insert ${agent.name}:`, error);
    }
  }

  console.log('\n🎉 All 3 agents inserted successfully!');
  process.exit(0);
}

main();
