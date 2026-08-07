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
    id: "cover", title: "封面信息", intro: "",
    questions: [
      { id: "company_name", section: "cover", type: "text", field: "project_overview.company_name", label: "请告诉我您的公司名称，或者您的项目名称。" },
      { id: "founded", section: "cover", type: "text", field: "project_overview.founded", label: "公司或项目是什么时候成立的？" },
      { id: "bp_title", section: "cover", type: "text", field: "project_overview.bp_title", label: "这份计划书的标题想叫什么？", placeholder: "建议：{公司名}商业计划书" },
    ],
  },
  {
    id: "demand", title: "需求", intro: "好的，接下来我们聊聊您的客户。投资人看一份商业计划书，最先想弄清楚的就是——您在为谁解决问题，这个问题到底有多痛。",
    questions: [
      { id: "customer_type", section: "demand", type: "single", field: "_meta.customer_type", label: "在开始之前，先跟您确认一下：您的产品或服务，主要是卖给企业，还是卖给个人消费者？", options: ["主要是企业客户", "主要是个人消费者", "两者都有，是平台或者双边模式"] },
      { id: "target_customer", section: "demand", type: "textarea", field: "demand.target_customer", label: "请详细描述一下您的目标客户——他们大概在什么行业、什么规模、处在什么发展阶段，有什么共同的特征？说得越具体，后面这份计划书就越有说服力。", labelByAnswer: { field: "_meta.customer_type", values: { "主要是企业客户": "请详细描述一下您的目标客户——他们大概在什么行业、什么规模、处在什么发展阶段，有什么共同的特征？说得越具体，后面这份计划书就越有说服力。", "主要是个人消费者": "请详细描述一下您的目标客户——他们大概是什么年龄、什么职业、什么生活状态，有什么共同的特征和偏好？说得越具体，后面这份计划书就越有说服力。", "两者都有，是平台或者双边模式": "您这是双边模式，那我们分开说，一类一类来。" } } },
      { id: "pain_points", section: "demand", type: "card-list", field: "demand.pain_points", label: "接下来是最关键的一部分。请您说一说，您的目标客户在什么样的场景下，会遇到什么样的痛点？如果有多个，最多可以说三个。", minCards: 1, maxCards: 3, fields: [
        { id: "description", label: "客户在什么场景下，遇到了什么问题？", type: "textarea" },
        { id: "why_rigid_demand", label: "这个问题他们现在是怎么解决的？为什么现在解决得不够好？", type: "textarea" },
      ] },
    ],
  },
  {
    id: "product", title: "产品与商业模式", intro: "好，客户的问题我们说清楚了。接下来聊聊您是怎么解决的。",
    questions: [
      { id: "solutions", section: "product", type: "card-list", field: "product_model.solutions", label: "刚才这三个痛点，我们一个一个看，您分别是怎么解决的？", minCards: 1, maxCards: 3, addable: false, echoFrom: { field: "demand.pain_points", itemField: "description", targetField: "pain_point" }, fields: [
        { id: "pain_point", label: "客户痛点", type: "textarea", readonly: true },
        { id: "solution", label: "您是怎么解决的？", type: "textarea" },
      ] },
      { id: "business_summary", section: "product", type: "textarea", field: "project_overview.business_summary", label: "请概括介绍一下您的产品和业务：主要卖什么、卖给谁、目前做到什么规模？" },
      { id: "core_values", section: "product", type: "card-list", field: "product_model.core_values", label: "您的产品或业务，给客户最核心的价值点是什么？最多可以列三项。\n如果一时想不满三点，可以从不同角度拆开来看，比如产品本身的优势、服务上的优势、成本或者效率上的优势。", minCards: 1, maxCards: 3, fields: [{ id: "value", label: "核心价值", type: "text" }] },
      { id: "one_liner", section: "product", type: "text", field: "project_overview.one_liner", label: "请用一句话，精炼地描述您的产品业务和核心价值。这句会印在计划书封面上。" },
      { id: "slogan", section: "product", type: "text", field: "project_overview.slogan", label: "那有没有一句对外的口号或者 slogan？（选填）", optional: true },
      { id: "revenue_sources", section: "product", type: "table", field: "product_model.revenue_sources", label: "接下来聊聊您是怎么赚钱的。您的收入主要来自哪几部分？每部分占多少比例？", minRows: 2, maxRows: 4, addable: true, columns: [{ id: "source", label: "收入来源", type: "text" }, { id: "share", label: "占比", type: "number", unit: "%" }] },
      { id: "gross_margin", section: "product", type: "text", field: "product_model.gross_margin", label: "您的毛利率大概是多少？如果有几块不同的业务，可以分别说明。" },
      { id: "net_margin", section: "product", type: "text", field: "product_model.net_margin", label: "净利率大概是多少？" },
      { id: "sales_model", section: "product", type: "textarea", field: "product_model.sales_model", label: "您目前是通过什么方式把产品销售出去的？主要通过哪些渠道？" },
    ],
  },
  {
    id: "market", title: "市场规模", intro: "好，您的业务我们了解清楚了。接下来看看这块市场到底有多大——这是投资人一定会关注的。",
    questions: [
      { id: "tam", section: "market", type: "text", field: "market.market_size.tam", label: "您所在的这个行业，整体市场规模大概有多大？", helperText: "如果不清楚确切数字，可以用「客户总数 × 客单价」这样的方式粗略推算。" },
      { id: "growth_forecast", section: "market", type: "table", field: "market.growth_forecast", label: "最后估一下，未来五年这个市场的规模和增长速度大概是什么走势？", fixedRows: yearlyRows(), columns: [{ id: "year", label: "年份", type: "text", readonly: true }, { id: "market_size", label: "市场规模", type: "text" }, { id: "growth_rate", label: "增长率", type: "text" }] },
      { id: "market_focus", section: "market", type: "text", label: "这个市场很大，但一般不会一上来就全做。您目前主要做的是哪一块？", fields: [{ id: "_meta.market_focus", label: "主要市场", type: "text", placeholder: "比如华东地区的中小制造企业" }, { id: "market.market_size.sam", label: "这块的市场规模大概多少", type: "text", placeholder: "这块的市场规模大概多少" }] },
      { id: "market_basis", section: "market", type: "textarea", field: "market.basis", label: "上面这两个数字，您是怎么估出来的？行业报告、客户数量乘以客单价、同行的公开数据、或者您自己的经验判断都可以。" },
    ],
  },
  {
    id: "competition", title: "竞争", intro: "接下来我们聊聊您的竞争对手。投资人一定会问：这件事别人也在做，凭什么是您能做成。",
    questions: [
      { id: "competitors", section: "competition", type: "score-matrix", field: "competition.competitors", label: "请列出目前主要的 3 到 4 家竞争对手，我们和您做个横向对比打分。", helperText: "打分说明：5 分 = 行业领先　4 分 = 明显强于同行　3 分 = 行业平均水平　2 分 = 弱于同行　1 分 = 明显落后", companyName: "您的公司", minColumns: 3, maxColumns: 4, rows: [{ id: "product_capability", label: "产品能力" }, { id: "technical_strength", label: "技术实力" }, { id: "team", label: "团队" }, { id: "channel", label: "渠道" }] },
      { id: "differentiations", section: "competition", type: "card-list", field: "competition.differentiations", label: "和您的竞争对手相比，您最核心的优势是什么？最多可以说三点。", minCards: 1, maxCards: 3, fields: [{ id: "value", label: "核心优势", type: "text" }] },
    ],
  },
  {
    id: "traction", title: "目前状况", intro: "前面我们聊完竞争，接下来看看目前公司或者项目做到什么程度了。这块的数字越实，投资人越买账。",
    questions: [
      { id: "product_status", section: "traction", type: "textarea", field: "current_state.product_status", label: "您的产品现在做到什么程度了？" },
      { id: "customer_count", section: "traction", type: "text", field: "current_state.customer_count", label: "目前有多少客户或者用户？" },
      { id: "device_count", section: "traction", type: "text", field: "current_state.device_count", label: "还有什么可以量化的经营数据？比如设备台数、门店数量、累计订单量、平台交易额。" },
      { id: "revenue", section: "traction", type: "text", field: "current_state.financials.revenue", label: "目前的年营收大概是多少？" },
      { id: "profit", section: "traction", type: "text", field: "current_state.financials.profit", label: "年净利润呢？" },
      { id: "coverage", section: "traction", type: "table", field: "current_state.coverage", label: "业务主要覆盖哪些地区或行业？各占多少？", minRows: 2, maxRows: 4, addable: true, columns: [{ id: "name", label: "地区或行业", type: "text" }, { id: "share", label: "占比", type: "number", unit: "%" }] },
      { id: "team_size", section: "traction", type: "text", field: "current_state.team_size", label: "团队现在多少人？" },
      { id: "endorsements", section: "traction", type: "textarea", field: "current_state.endorsements", label: "有没有媒体报道、重要合作、客户认可、获奖之类的？" },
    ],
  },
  {
    id: "plan", title: "未来规划", intro: "说完现在，我们看看未来。投资人要判断的是：这笔钱投进来，您准备怎么把公司带到下一个阶段。",
    questions: [
      { id: "roadmap", section: "plan", type: "card-list", field: "plan.roadmap", label: "接下来的发展路径，我们分三个阶段来说。每个阶段告诉我三件事：时间范围、要达成什么目标、具体做出什么。可以从业务、产品、团队、地域扩张这几个方面来说。", minCards: 3, maxCards: 3, addable: false, fields: [{ id: "period", label: "时间范围", type: "text" }, { id: "objective", label: "阶段目标", type: "textarea" }, { id: "deliverables", label: "具体要做出什么", type: "textarea" }] },
      { id: "financial_projection", section: "plan", type: "table", field: "plan.financial_projection", label: "最后估一下未来五年的营收和净利润。", fixedRows: yearlyRows(), columns: [{ id: "year", label: "年份", type: "text", readonly: true }, { id: "revenue", label: "营收", type: "text" }, { id: "net_profit", label: "净利润", type: "text" }] },
    ],
  },
  {
    id: "funding", title: "融资计划", intro: "接下来是投资人最关心的一页：您要融多少钱？这笔钱会怎么花？",
    questions: [
      { id: "funding_amount", section: "funding", type: "text", field: "funding.funding_amount", label: "这轮计划融多少钱？" },
      { id: "dilution_range", section: "funding", type: "text", field: "funding.dilution_range", label: "计划出让多少股份？给个区间也可以。" },
      { id: "use_of_funds", section: "funding", type: "table", field: "funding.use_of_funds", label: "这笔钱主要用在哪几块？各占多少比例？", minRows: 3, maxRows: 4, addable: true, initialRows: [{ purpose: "产品研发" }, { purpose: "市场拓展" }, { purpose: "团队建设" }, { purpose: "其他" }], columns: [{ id: "purpose", label: "用途", type: "text" }, { id: "percentage", label: "占比", type: "number", unit: "%" }] },
    ],
  },
  {
    id: "team", title: "团队与联系方式", intro: "最后一步，我们聊聊您的团队。投资人看项目，很大程度上是在看人。",
    questions: [
      { id: "members", section: "team", type: "card-list", field: "team.members", label: "请介绍一下核心团队成员。每位说三件事：姓名、职务、过往经历。经历部分尽量写和这个项目相关的，比如在哪些公司做过什么、有什么行业积累或者成功案例。", minCards: 1, maxCards: 6, fields: [{ id: "name", label: "姓名", type: "text" }, { id: "role", label: "职务", type: "text" }, { id: "background", label: "过往经历", type: "textarea" }] },
      { id: "contact", section: "team", type: "text", label: "最后留一下联系方式，会放在计划书封底。", fields: [{ id: "contact.contact_person", label: "联系人", type: "text" }, { id: "contact.phone", label: "电话", type: "text" }, { id: "contact.email", label: "邮箱", type: "text" }, { id: "contact.address", label: "地址（选填）", type: "text", optional: true }] },
    ],
  },
];

// Score-matrix 控件存在点击分数后整页白屏的缺陷，待控件重做后恢复。
export const TEMP_DISABLE_SCORE_MATRIX = true;

export const BUSINESS_PLAN_QUESTIONS = BUSINESS_PLAN_SECTIONS
  .flatMap(section => section.questions)
  .filter(question => !(TEMP_DISABLE_SCORE_MATRIX && question.type === "score-matrix"));
