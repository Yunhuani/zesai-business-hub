export type TextQuestion = {
  id: string;
  field: string;
  label: string;
  type: "text" | "textarea" | "number";
  placeholder: string;
  unit?: string;
  optional?: boolean;
  helperText?: string;
};

export type ChoiceQuestion = {
  id: string;
  field: string;
  label: string;
  type: "single" | "multi";
  options: string[];
  customPlaceholder: string;
};

export type MatrixQuestion = {
  id: string;
  label: string;
  type: "matrix";
  items: Array<{ label: string; field: string }>;
  options: string[];
  customPlaceholder: string;
};

export type DiagnosisQuestion = TextQuestion | ChoiceQuestion | MatrixQuestion;

export type DiagnosisStep = {
  id: string;
  dimension: string;
  title: string;
  questions: DiagnosisQuestion[];
  showFinanceUpload?: boolean;
};

export const DIAGNOSIS_STEPS: DiagnosisStep[] = [
  {
    id: "company-basics",
    dimension: "Company identity",
    title: "先认识你的公司",
    questions: [
      {
        id: "company-name",
        field: "company.name",
        label: "公司名称",
        type: "text",
        placeholder: "请输入公司全称或常用名称",
      },
      {
        id: "industry-sub",
        field: "company.industry_sub",
        label: "你的业务是什么？",
        type: "text",
        placeholder: '请具体填写，如“卫浴五金出口”，而非“外贸”',
      },
    ],
  },
  {
    id: "company-scale",
    dimension: "Scale & markets",
    title: "公司目前的规模",
    questions: [
      {
        id: "revenue-band",
        field: "company.revenue_band",
        label: "去年大致营收区间？",
        type: "single",
        options: ["1000万以下", "1000万–5000万", "5000万–1亿", "1亿–3亿", "3亿以上"],
        customPlaceholder: "其他区间 / 自行填写",
      },
      {
        id: "region",
        field: "company.region",
        label: "你的业务覆盖哪些市场？",
        type: "multi",
        options: ["全国", "华东", "华南", "华北", "华中", "西南", "西北", "海外市场"],
        customPlaceholder: "其他市场 / 请具体填写",
      },
    ],
  },
  {
    id: "company-trend",
    dimension: "Growth & organization",
    title: "增长趋势与团队规模",
    questions: [
      {
        id: "revenue-trend",
        field: "company.revenue_trend",
        label: "近 2–3 年营收是涨、平，还是跌？",
        type: "single",
        options: ["持续增长", "基本持平", "有所下滑"],
        customPlaceholder: "其他趋势 / 补充具体变化",
      },
      {
        id: "headcount-band",
        field: "company.headcount_band",
        label: "员工规模？",
        type: "single",
        options: ["20人以下", "20–50人", "50–100人", "100–200人", "200–500人", "500人以上"],
        customPlaceholder: "其他人数 / 自行填写",
      },
    ],
  },
  {
    id: "company-channel-anxiety",
    dimension: "Sales & priorities",
    title: "销售渠道与当前重点",
    questions: [
      {
        id: "channels",
        field: "company.channels",
        label: "主要销售渠道？",
        type: "multi",
        options: ["渠道销售", "直营", "平台电商", "跨境电商", "B端工程"],
        customPlaceholder: "其他渠道 / 自行填写",
      },
      {
        id: "top-anxiety",
        field: "company.top_anxiety",
        label: "当前你最焦虑、最想解决的一件事是什么？",
        type: "textarea",
        placeholder: "只写眼下最重要的一件事，越具体越好",
      },
    ],
  },
  {
    id: "market",
    dimension: "Market / Opportunity",
    title: "现有的市场，和希望拓展的新市场或业务方向",
    questions: [
      {
        id: "home-market",
        field: "market.home_market",
        label: "现在的主力市场是哪里？",
        type: "text",
        placeholder: "例如：北美工程渠道、国内一二线城市",
      },
      {
        id: "expansion-intent",
        field: "market.expansion_intent",
        label: "有没有想拓展的方向？",
        type: "text",
        placeholder: "例如：欧洲、东南亚，或新的客户群体",
      },
    ],
  },
  {
    id: "competition",
    dimension: "Competition",
    title: "客户如何在你和对手之间做选择",
    questions: [
      {
        id: "competitors",
        field: "competition.competitors",
        label: "主要竞争对手有哪些？",
        type: "textarea",
        placeholder: "填写 2–3 个名字或对手类型均可",
      },
      {
        id: "customer-values",
        field: "competition.customer_values",
        label: "客户最看重什么？（可多选）",
        type: "multi",
        options: ["价格", "交期", "服务", "品质", "品牌", "认证"],
        customPlaceholder: "其他客户看重的因素 / 自行填写",
      },
    ],
  },
  {
    id: "competitive-assets",
    dimension: "Competitive assets",
    title: "你的独有优势",
    questions: [
      {
        id: "unique-assets",
        field: "competition.unique_assets",
        label: "你有哪些别人没有的资质、认证或独有能力？",
        type: "textarea",
        placeholder: "可填写多项，如行业认证、专利、独家渠道、特殊工艺或长期客户关系",
      },
    ],
  },
  {
    id: "business-model",
    dimension: "Business model",
    title: "你的主要产品或服务，以及你的盈利方式",
    questions: [
      {
        id: "revenue-sources",
        field: "business_model.revenue_sources",
        label: "收入主要来自哪些产品或服务？",
        type: "textarea",
        placeholder: "写出最主要的产品、服务或项目类型",
      },
      {
        id: "earn-retain",
        field: "business_model.how_earn_retain",
        label: "你主要靠什么赚钱、靠什么留住客户？",
        type: "textarea",
        placeholder: "例如：靠规模和交期拿单，靠长期合作关系留客",
      },
    ],
  },
  {
    id: "capability",
    dimension: "Capability",
    title: "支撑业务的团队与能力",
    questions: [
      {
        id: "team-structure",
        label: "团队大致构成如何？",
        type: "matrix",
        items: [
          { label: "研发", field: "capability.team_structure.研发" },
          { label: "生产", field: "capability.team_structure.生产" },
          { label: "销售", field: "capability.team_structure.销售" },
          { label: "职能", field: "capability.team_structure.职能" },
        ],
        options: ["弱", "中", "强"],
        customPlaceholder: "其他团队情况 / 补充说明",
      },
      {
        id: "function-strength",
        label: "以下职能分别处于什么水平？",
        type: "matrix",
        items: [
          { label: "产品开发", field: "capability.function_strength.product" },
          { label: "供应链", field: "capability.function_strength.supply_chain" },
          { label: "渠道", field: "capability.function_strength.channel" },
          { label: "营销", field: "capability.function_strength.marketing" },
          { label: "财务管理", field: "capability.function_strength.finance" },
        ],
        options: ["弱", "中", "强"],
        customPlaceholder: "其他能力情况 / 补充说明",
      },
    ],
  },
  {
    id: "finance-model",
    dimension: "Financial health",
    title: "利润与成本情况",
    questions: [
      {
        id: "net-margin",
        field: "finance_basic.net_margin_band",
        label: "大致净利率区间？",
        type: "single",
        options: ["亏损", "0%–5%", "5%–10%", "10%–15%", "15%以上"],
        customPlaceholder: "其他区间 / 自行填写",
      },
      {
        id: "cost-structure",
        field: "finance_basic.cost_structure",
        label: "你的成本主要花在哪些地方？（如原材料、人工、房租、推广等）",
        type: "textarea",
        placeholder: "请填写主要成本项目，也可以补充大致占比",
      },
    ],
  },
  {
    id: "finance-cash",
    dimension: "Financial health",
    title: "现金安全边界",
    showFinanceUpload: true,
    questions: [
      {
        id: "cash",
        field: "finance_basic.cash",
        label: "账上现金大约有多少？",
        type: "number",
        placeholder: "请输入金额",
        unit: "万元",
        optional: true,
        helperText: "填写后可精确测算你的现金安全边界；不填我们仍会给出完整诊断。",
      },
      {
        id: "monthly-fixed",
        field: "finance_basic.monthly_fixed",
        label: "每月刚性支出大约有多少？",
        type: "number",
        placeholder: "请输入金额",
        unit: "万元 / 月",
        optional: true,
        helperText: "填写后可更准确估算公司的现金跑道；不填我们仍会给出完整诊断。",
      },
    ],
  },
];
