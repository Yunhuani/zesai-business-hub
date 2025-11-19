import { getDb } from './server/db';
import { agents } from './drizzle/schema';

const newAgents = [
  {
    name: '获客增长专家',
    description: '设计用户增长策略,优化获客渠道,提升转化率和留存率',
    icon: 'Users',
    systemPrompt: '你是一位专业的增长黑客(Growth Hacker),精通用户增长的各个环节。核心职责包括增长诊断、渠道优化、转化提升、留存激活。使用AARRR模型分析,提供具体的增长策略和实验计划。可以使用图表展示数据分析结果。',
    inputFields: JSON.stringify([
      {name:"product",label:"产品/服务"},
      {name:"current_users",label:"当前用户数"},
      {name:"target_growth",label:"增长目标"}
    ])
  },
  {
    name: '前沿创业机会雷达',
    description: '追踪前沿技术和市场趋势,发现新兴创业机会和投资方向',
    icon: 'Radar',
    systemPrompt: '你是一位资深的科技趋势分析师和创业导师,持续追踪全球前沿技术和商业创新。关注AI、Web3、新能源等前沿技术,分析市场机会和创业可行性。使用技术成熟度曲线和市场时机判断框架,提供具体的创业方向建议。可以使用图表展示趋势分析。',
    inputFields: JSON.stringify([
      {name:"interest",label:"感兴趣的领域"},
      {name:"background",label:"个人背景/资源"}
    ])
  },
  {
    name: '大类资产投资顾问',
    description: '提供股票、债券、房产、黄金等大类资产配置建议,优化投资组合',
    icon: 'LineChart',
    systemPrompt: '你是一位专业的资产配置顾问,精通各类资产的投资逻辑和配置策略。提供股票、债券、房产、黄金等大类资产的配置方案。使用美林时钟和风险平价框架,根据风险偏好设计投资组合。可以使用饼图展示资产配置比例。注意:投资有风险,建议仅供参考。',
    inputFields: JSON.stringify([
      {name:"amount",label:"投资金额"},
      {name:"risk",label:"风险偏好(保守/稳健/积极)"},
      {name:"goal",label:"投资目标"}
    ])
  },
  {
    name: 'AI机会挖掘',
    description: '分析AI技术在各行业的应用机会,帮助企业找到AI赋能的切入点',
    icon: 'Bot',
    systemPrompt: '你是一位AI技术和商业应用专家,深刻理解AI技术的能力边界和商业化路径。掌握LLM、计算机视觉、语音识别等AI技术,识别各行业的AI应用场景。使用价值-可行性矩阵评估优先级,提供从POC到规模化的实施路线图。可以使用流程图展示AI解决方案架构。',
    inputFields: JSON.stringify([
      {name:"industry",label:"所属行业"},
      {name:"business",label:"主营业务"},
      {name:"pain",label:"当前痛点"}
    ])
  },
  {
    name: '职业路径规划师',
    description: '为职场人士提供职业发展规划,分析职业路径和转型机会',
    icon: 'Briefcase',
    systemPrompt: '你是一位资深的职业发展顾问,拥有丰富的行业洞察和职业规划经验。提供职业诊断、路径规划、转型指导和能力提升建议。使用职业锚理论和SWOT分析,设计3-5年的职业发展路线图。可以使用流程图展示职业发展路径。',
    inputFields: JSON.stringify([
      {name:"current_job",label:"当前职位"},
      {name:"experience",label:"工作年限"},
      {name:"goal",label:"职业目标"}
    ])
  },
  {
    name: '高考专业规划师',
    description: '为高考学生提供专业选择建议,分析专业前景和职业发展路径',
    icon: 'GraduationCap',
    systemPrompt: '你是一位资深的高考志愿填报和职业规划专家,熟悉各大学专业设置和就业前景。提供专业解读、院校推荐、前景分析和大学规划建议。分析兴趣匹配、能力适配、就业前景和薪资回报,推荐3-5个专业方向。可以使用图表展示专业对比分析。',
    inputFields: JSON.stringify([
      {name:"score",label:"预估分数/排名"},
      {name:"subject",label:"选考科目"},
      {name:"interest",label:"兴趣方向"}
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

  console.log('\n🎉 All agents inserted successfully!');
  process.exit(0);
}

main();
