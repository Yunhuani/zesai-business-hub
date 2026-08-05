export const BUSINESS_PLAN_SAMPLE = {
  project_overview: {
    company_name: "深圳智造云科技有限公司",
    founded: "2022年3月",
    bp_title: "智造云商业计划书",
    business_summary: "面向中小制造企业的工业设备联网与数据分析SaaS",
    one_liner: "让中小工厂用得起的工业互联网",
    team_scale: "46人,研发28、市场销售12、职能6",
    slogan: "设备联网、数据驱动、让制造更聪明",
  },
  demand: {
    target_customer: "年产值2000万到5亿的中小制造企业,主要是注塑、五金、机械加工、电子组装这些离散制造。这类企业设备多,自动化基础弱,基本没有IT团队。",
    pain_points: [
      {
        description: "现在设备运行状态、故障、能耗全靠人工巡检记录,管理者看不到实时数据,决策靠经验拍脑袋。",
        why_rigid_demand: "决策没有依据",
      },
      {
        description: "设备坏了才修,一次非计划停机动辄损失数万元,而且影响交期。",
        why_rigid_demand: "直接经济损失",
      },
      {
        description: "不知道哪台设备是瓶颈、产能利用率多少、良率卡在哪,优化无从下手。",
        why_rigid_demand: "产能浪费",
      },
    ],
  },
  product_model: {
    solutions: [
      {
        pain_point: "设备数据依赖人工巡检,管理者无法实时掌握生产状态",
        solution: "通过即插即用的工业网关采集设备运行、故障与能耗数据,在云端看板中实时呈现并自动生成经营分析。",
      },
      {
        pain_point: "设备故障后才维修,非计划停机损失高",
        solution: "基于设备历史与实时数据建立预测性维护模型,提前预警异常并给出检修建议。",
      },
      {
        pain_point: "产能瓶颈、利用率和良率问题缺少量化依据",
        solution: "自动计算OEE、产能利用率与良率损失,定位瓶颈设备和关键工序并提供优化建议。",
      },
    ],
    core_values: [
      "低门槛接入,无需自建IT团队即可完成设备联网",
      "实时透明生产数据,帮助管理者用数据决策",
      "预测故障并定位产能瓶颈,直接降低停机与浪费",
    ],
    revenue_sources: [
      { source: "SaaS订阅", share: "75%" },
      { source: "硬件网关", share: "20%" },
      { source: "增值分析", share: "5%" },
    ],
    gross_margin: "68%",
    net_margin: "",
    sales_model: "直销团队加区域制造业协会渠道,还有两家设备厂商预装合作",
  },
  market: {
    market_size: {
      tam: "中国工业软件市场2025年约2800亿元",
      sam: "中小制造数字化细分约600亿元",
      som: "离散制造+华南华东,3年可触达约40亿元",
    },
    growth_forecast: [
      { year: "2026", market_size: "600亿", growth_rate: "-" },
      { year: "2027", market_size: "720亿", growth_rate: "20%" },
      { year: "2028", market_size: "860亿", growth_rate: "19%" },
      { year: "2029", market_size: "1030亿", growth_rate: "20%" },
      { year: "2030", market_size: "1230亿", growth_rate: "19%" },
    ],
    basis: "中小制造数字化是工业软件里渗透率最低、增速最快的一块,政策加成本压力双重驱动",
  },
  competition: {
    competitors: [
      {
        name: "传统工业互联网大厂",
        dimensions: {
          产品定位: "面向大型集团客户的一体化平台",
          部署周期: "通常6至18个月",
          实施成本: "高,中小企业难以承担",
          行业适配: "功能全面但定制复杂",
        },
      },
      {
        name: "通用IoT平台",
        dimensions: {
          产品定位: "提供通用设备连接与数据底座",
          部署周期: "通常3至9个月",
          实施成本: "需要客户自行二次开发",
          行业适配: "制造场景应用能力较弱",
        },
      },
      {
        name: "本地集成商方案",
        dimensions: {
          产品定位: "按项目交付定制系统",
          部署周期: "通常2至6个月",
          实施成本: "前期可控但持续维护成本高",
          行业适配: "本地服务强,产品标准化和迭代能力弱",
        },
      },
    ],
    differentiations: [
      "专为中小离散制造设计,标准化产品两周内即可上线",
      "兼容主流新旧设备协议,无需替换现有设备和产线",
      "SaaS订阅降低初始投入,行业模型持续迭代并直接输出优化建议",
    ],
  },
  current_state: {
    product_status: "核心产品已规模化商用,完成工业网关、设备管理、实时看板、故障预警和经营分析模块",
    customer_count: "1200家",
    device_count: "3.8万台",
    financials: { ARR: "4600万", 月环比增长: "18%" },
    team_size: "46人",
    coverage: "华南60%、华东30%、其他10%",
    endorsements: "入选国家级专精特新培育库,获深圳市工业互联网创新应用示范项目,客户续费率92%",
  },
  plan: {
    roadmap: [
      {
        period: "2026年",
        objective: "夯实产品标准化与华南市场领先地位",
        deliverables: "接入设备突破8万台,上线AI故障诊断2.0,客户达到2200家",
      },
      {
        period: "2027-2028年",
        objective: "复制至华东及重点离散制造产业带",
        deliverables: "建立六个区域服务中心,覆盖十个细分行业,客户突破6000家",
      },
      {
        period: "2029-2030年",
        objective: "形成中小制造工业数据平台生态",
        deliverables: "开放行业应用市场与数据服务平台,探索东南亚市场,客户突破1.5万家",
      },
    ],
    financial_projection: [
      { year: "2026", revenue: "6500万", net_profit: "-800万" },
      { year: "2027", revenue: "1.1亿", net_profit: "200万" },
      { year: "2028", revenue: "1.9亿", net_profit: "2800万" },
      { year: "2029", revenue: "3.0亿", net_profit: "6000万" },
      { year: "2030", revenue: "4.5亿", net_profit: "1.1亿" },
    ],
  },
  funding: {
    funding_amount: "3000万元",
    dilution_range: "10%-15%",
    use_of_funds: [
      { purpose: "研发", percentage: "40%", description: "投入AI故障诊断、行业模型和边缘网关产品迭代" },
      { purpose: "市场", percentage: "35%", description: "拓展华东市场、区域渠道和重点行业标杆客户" },
      { purpose: "团队", percentage: "20%", description: "补充算法、工业软件产品和区域销售骨干" },
      { purpose: "其他", percentage: "5%", description: "用于流动资金及知识产权、合规等支出" },
    ],
  },
  team: {
    members: [
      { name: "张明", role: "CEO", background: "前华为工业数字化业务负责人,15年制造业数字化与企业服务经验,负责公司战略、融资与商业化。" },
      { name: "李伟", role: "CTO", background: "前腾讯云IoT技术专家,清华大学自动化硕士,拥有12年工业物联网平台与边缘计算研发经验。" },
      { name: "王芳", role: "COO", background: "前富士康精益生产负责人,10年工厂运营与数字化落地经验,负责交付、客户成功与组织运营。" },
    ],
  },
};
