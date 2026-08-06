export type BPSectionId =
  | "cover" | "demand" | "product" | "market" | "competition"
  | "traction" | "plan" | "funding" | "team";

export type BPInputType = "text" | "textarea" | "number";

export type BPField = {
  id: string;
  label: string;
  type: BPInputType;
  placeholder?: string;
  unit?: string;
  optional?: boolean;
  readonly?: boolean;
};

type BPQuestionBase = {
  id: string;
  section: BPSectionId;
  label: string;
  optional?: boolean;
  helperText?: string;
  labelByAnswer?: { field: string; values: Record<string, string> };
};

export type BPTextQuestion = BPQuestionBase & {
  type: BPInputType;
  field?: string;
  fields?: BPField[];
  placeholder?: string;
  unit?: string;
};

export type BPSingleQuestion = BPQuestionBase & {
  field: string;
  type: "single";
  options: string[];
};

export type BPCardListQuestion = BPQuestionBase & {
  field: string;
  type: "card-list";
  fields: BPField[];
  minCards?: number;
  maxCards?: number;
  addable?: boolean;
  echoFrom?: { field: string; itemField: string; targetField: string };
};

export type BPScoreMatrixQuestion = BPQuestionBase & {
  field: string;
  type: "score-matrix";
  rows: Array<{ id: string; label: string }>;
  companyName: string;
  minColumns?: number;
  maxColumns?: number;
};

export type BPTableQuestion = BPQuestionBase & {
  field: string;
  type: "table";
  columns: BPField[];
  fixedRows?: Array<Record<string, string>>;
  initialRows?: Array<Record<string, string>>;
  minRows?: number;
  maxRows?: number;
  addable?: boolean;
};

export type BPQuestion = BPTextQuestion | BPSingleQuestion | BPCardListQuestion | BPScoreMatrixQuestion | BPTableQuestion;

export type BPSection = {
  id: BPSectionId;
  title: string;
  intro: string;
  questions: BPQuestion[];
};

const years = Array.from({ length: 5 }, (_, index) => String(new Date().getFullYear() + index));
const yearlyRows = () => years.map(year => ({ year }));

export const BUSINESS_PLAN_SECTIONS: BPSection[] = [
  {
    id: "cover", title: "封面信息", intro: "先从几个基本信息开始。",
    questions: [
      { id: "company_name", section: "cover", type: "text", field: "project_overview.company_name", label: "请问您的公司或项目叫什么名字？" },
      { id: "founded", section: "cover", type: "text", field: "project_overview.founded", label: "什么时候成立的？" },
      { id: "bp_title", section: "cover", type: "text", field: "project_overview.bp_title", label: "这份计划书想叫什么标题？", placeholder: "{公司名}商业计划书" },
    ],
  },
  {
    id: "demand", title: "需求", intro: "接下来聊聊您的客户。投资人最先想弄清楚的是：您在为谁解决问题。",
    questions: [
      { id: "customer_type", section: "demand", type: "single", field: "_meta.customer_type", label: "您的产品主要卖给企业，还是卖给个人？", options: ["主要是企业客户", "主要是个人消费者", "两者都有"] },
      { id: "target_customer", section: "demand", type: "textarea", field: "demand.target_customer", label: "说说您的目标客户。", labelByAnswer: { field: "_meta.customer_type", values: { "主要是企业客户": "说说您的目标客户——什么行业、多大规模、什么阶段？", "主要是个人消费者": "说说您的目标客户——什么年龄、什么职业、什么偏好？", "两者都有": "您有两类客户，一类一类说。第一类是谁、有什么特征？第二类呢？" } } },
      { id: "pain_points", section: "demand", type: "card-list", field: "demand.pain_points", label: "您的客户在什么场景下，遇到了什么问题？最多可以说三个。", minCards: 1, maxCards: 3, fields: [
        { id: "description", label: "客户在什么场景下，遇到了什么问题？", type: "textarea" },
        { id: "why_rigid_demand", label: "这个问题他们现在是怎么解决的？为什么解决得不够好？", type: "textarea" },
      ] },
    ],
  },
  {
    id: "product", title: "产品与商业模式", intro: "好，客户的问题说清楚了。下面聊聊您是怎么解决的。",
    questions: [
      { id: "solutions", section: "product", type: "card-list", field: "product_model.solutions", label: "刚才这些痛点，您分别是怎么解决的？", minCards: 1, addable: false, echoFrom: { field: "demand.pain_points", itemField: "description", targetField: "pain_point" }, fields: [
        { id: "pain_point", label: "客户痛点", type: "textarea", readonly: true },
        { id: "solution", label: "您是怎么解决的？", type: "textarea" },
      ] },
      { id: "business_summary", section: "product", type: "textarea", field: "project_overview.business_summary", label: "您的产品和业务，主要卖什么、卖给谁、做到什么规模？" },
      { id: "core_values", section: "product", type: "card-list", field: "product_model.core_values", label: "您给客户最核心的价值是什么？最多列三项。", minCards: 1, maxCards: 3, fields: [{ id: "value", label: "核心价值", type: "text" }] },
      { id: "one_liner", section: "product", type: "text", field: "project_overview.one_liner", label: "用一句话概括您的产品业务和核心价值。" },
      { id: "slogan", section: "product", type: "text", field: "project_overview.slogan", label: "有没有一句对外的口号？", optional: true },
      { id: "revenue_sources", section: "product", type: "table", field: "product_model.revenue_sources", label: "您的收入主要来自哪几部分？各占多少？", minRows: 2, maxRows: 4, addable: true, columns: [{ id: "source", label: "收入来源", type: "text" }, { id: "share", label: "占比", type: "number", unit: "%" }] },
      { id: "gross_margin", section: "product", type: "text", field: "product_model.gross_margin", label: "毛利率大概多少？有几块业务的话可以分别说。" },
      { id: "net_margin", section: "product", type: "text", field: "product_model.net_margin", label: "净利率呢？" },
      { id: "sales_model", section: "product", type: "textarea", field: "product_model.sales_model", label: "您通过什么方式把产品卖出去？主要走哪些渠道？" },
    ],
  },
  {
    id: "market", title: "市场规模", intro: "接下来看看这块市场有多大。",
    questions: [
      { id: "tam", section: "market", type: "text", field: "market.market_size.tam", label: "您所在的行业，整体市场规模大概多大？", helperText: "不清楚确切数字的话，可以用「客户总数 × 客单价」粗略推算。" },
      { id: "growth_forecast", section: "market", type: "table", field: "market.growth_forecast", label: "未来五年这个市场的规模和增速大概什么走势？", fixedRows: yearlyRows(), columns: [{ id: "year", label: "年份", type: "text", readonly: true }, { id: "market_size", label: "市场规模", type: "text" }, { id: "growth_rate", label: "增长率", type: "text" }] },
      { id: "market_focus", section: "market", type: "text", label: "您目前主要做哪一块？这块的规模大概多少？", fields: [{ id: "_meta.market_focus", label: "主要市场", type: "text", placeholder: "比如华东地区的中小制造企业" }, { id: "market.market_size.sam", label: "市场规模", type: "text", placeholder: "这块的市场规模" }] },
      { id: "market_basis", section: "market", type: "textarea", field: "market.basis", label: "上面这两个数字，您是怎么估出来的？" },
    ],
  },
  {
    id: "competition", title: "竞争", intro: "下面聊聊您的对手。投资人一定会问：凭什么是您能做成。",
    questions: [
      { id: "competitors", section: "competition", type: "score-matrix", field: "competition.competitors", label: "主要的竞争对手有哪几家？我们和您做个横向打分对比。", helperText: "5分 = 行业领先　4分 = 明显强于同行　3分 = 行业平均水平\n2分 = 弱于同行　1分 = 明显落后", companyName: "您的公司", minColumns: 3, maxColumns: 4, rows: [{ id: "product_capability", label: "产品能力" }, { id: "technical_strength", label: "技术实力" }, { id: "team", label: "团队" }, { id: "channel", label: "渠道" }] },
      { id: "differentiations", section: "competition", type: "card-list", field: "competition.differentiations", label: "和他们比，您最核心的优势是什么？最多说三点。", minCards: 1, maxCards: 3, fields: [{ id: "value", label: "核心优势", type: "text" }] },
    ],
  },
  {
    id: "traction", title: "目前状况", intro: "接下来看看目前做到什么程度了。这块的数字越实，投资人越买账。",
    questions: [
      { id: "product_status", section: "traction", type: "textarea", field: "current_state.product_status", label: "产品现在做到什么程度了？" },
      { id: "customer_count", section: "traction", type: "text", field: "current_state.customer_count", label: "目前有多少客户或用户？" },
      { id: "device_count", section: "traction", type: "text", field: "current_state.device_count", label: "还有什么可以量化的经营数据？比如设备台数、门店数、累计订单量？" },
      { id: "revenue", section: "traction", type: "text", field: "current_state.financials.revenue", label: "目前的年营收大概多少？" },
      { id: "profit", section: "traction", type: "text", field: "current_state.financials.profit", label: "年净利润呢？" },
      { id: "coverage", section: "traction", type: "table", field: "current_state.coverage", label: "业务主要覆盖哪些地区或行业？各占多少？", minRows: 2, maxRows: 4, addable: true, columns: [{ id: "name", label: "地区或行业", type: "text" }, { id: "share", label: "占比", type: "number", unit: "%" }] },
      { id: "team_size", section: "traction", type: "text", field: "current_state.team_size", label: "团队现在多少人？" },
      { id: "endorsements", section: "traction", type: "textarea", field: "current_state.endorsements", label: "有没有媒体报道、重要合作、客户认可、获奖之类的？" },
    ],
  },
  {
    id: "plan", title: "未来规划", intro: "说完现在，我们看看未来。",
    questions: [
      { id: "roadmap", section: "plan", type: "card-list", field: "plan.roadmap", label: "接下来的发展分三个阶段说：时间、目标、要做出什么？\n可以从业务、产品、团队、地域几方面来讲。", minCards: 3, maxCards: 3, addable: false, fields: [{ id: "period", label: "时间范围", type: "text" }, { id: "objective", label: "阶段目标", type: "textarea" }, { id: "deliverables", label: "要做出什么", type: "textarea" }] },
      { id: "financial_projection", section: "plan", type: "table", field: "plan.financial_projection", label: "未来五年的营收和净利润大概多少？", fixedRows: yearlyRows(), columns: [{ id: "year", label: "年份", type: "text", readonly: true }, { id: "revenue", label: "营收", type: "text" }, { id: "net_profit", label: "净利润", type: "text" }] },
    ],
  },
  {
    id: "funding", title: "融资计划", intro: "接下来是投资人最关心的：您要融多少钱，这笔钱怎么花。",
    questions: [
      { id: "funding_amount", section: "funding", type: "text", field: "funding.funding_amount", label: "这轮计划融多少钱？" },
      { id: "dilution_range", section: "funding", type: "text", field: "funding.dilution_range", label: "计划出让多少股份？给个区间也可以。" },
      { id: "use_of_funds", section: "funding", type: "table", field: "funding.use_of_funds", label: "这笔钱主要用在哪几块？各占多少？", minRows: 3, maxRows: 4, addable: true, initialRows: [{ purpose: "产品研发" }, { purpose: "市场拓展" }, { purpose: "团队建设" }, { purpose: "其他" }], columns: [{ id: "purpose", label: "用途", type: "text" }, { id: "percentage", label: "占比", type: "number", unit: "%" }] },
    ],
  },
  {
    id: "team", title: "团队与联系方式", intro: "最后聊聊您的团队。投资人看项目，很大程度上是在看人。",
    questions: [
      { id: "members", section: "team", type: "card-list", field: "team.members", label: "介绍一下核心团队成员：姓名、职务、过往经历。\n经历尽量写和这个项目相关的。", minCards: 1, maxCards: 6, fields: [{ id: "name", label: "姓名", type: "text" }, { id: "role", label: "职务", type: "text" }, { id: "background", label: "过往经历", type: "textarea" }] },
      { id: "contact", section: "team", type: "text", label: "最后留一下联系方式，会放在封底。", fields: [{ id: "contact.contact_person", label: "联系人", type: "text" }, { id: "contact.phone", label: "电话", type: "text" }, { id: "contact.email", label: "邮箱", type: "text" }, { id: "contact.address", label: "地址", type: "text", optional: true }] },
    ],
  },
];

export const BUSINESS_PLAN_QUESTIONS = BUSINESS_PLAN_SECTIONS.flatMap(section => section.questions);
