export type BPSectionId =
  | "cover"
  | "demand"
  | "product"
  | "market"
  | "competition"
  | "traction"
  | "plan"
  | "funding"
  | "team";

type BPQuestionBase = {
  id: string;
  section: BPSectionId;
  label: string;
  optional?: boolean;
  helperText?: string;
};

export type BPTextQuestion = BPQuestionBase & {
  field: string;
  type: "text" | "textarea" | "number";
  placeholder: string;
  unit?: string;
  min?: number;
};

export type BPSingleQuestion = BPQuestionBase & {
  field: string;
  type: "single";
  options: string[];
  customPlaceholder?: string;
};

export type BPCardField = {
  id: string;
  label: string;
  type: "text" | "textarea" | "number";
  placeholder: string;
};

export type BPCardListQuestion = BPQuestionBase & {
  field: string;
  type: "card-list";
  fields: BPCardField[];
  minCards?: number;
  maxCards?: number;
};

export type BPScoreMatrixQuestion = BPQuestionBase & {
  field: string;
  type: "score-matrix";
  rows: Array<{ id: string; label: string }>;
  minColumns?: number;
  maxColumns?: number;
};

export type BPTableQuestion = BPQuestionBase & {
  field: string;
  type: "table";
  columns: Array<{
    key: string;
    label: string;
    inputType: "text" | "number";
    unit?: string;
  }>;
  fixedRows?: number;
  minRows?: number;
  maxRows?: number;
};

export type BPQuestion =
  | BPTextQuestion
  | BPSingleQuestion
  | BPCardListQuestion
  | BPScoreMatrixQuestion
  | BPTableQuestion;

export type BPSection = {
  id: BPSectionId;
  title: string;
  intro: string;
  questions: BPQuestion[];
};

export const BUSINESS_PLAN_SECTIONS: BPSection[] = [
  {
    id: "cover",
    title: "封面信息",
    intro: "先从这份商业计划书的基本信息开始。",
    questions: [],
  },
  {
    id: "demand",
    title: "需求",
    intro: "接下来，我们聊聊客户真正需要解决的问题。",
    questions: [],
  },
  {
    id: "product",
    title: "产品与商业模式",
    intro: "下面看看你的产品如何回应需求，又如何形成生意。",
    questions: [],
  },
  {
    id: "market",
    title: "市场规模",
    intro: "有了产品和模式，我们再一起判断市场空间。",
    questions: [],
  },
  {
    id: "competition",
    title: "竞争",
    intro: "接下来看看市场中的其他选择，以及你的差异。",
    questions: [],
  },
  {
    id: "traction",
    title: "目前状况",
    intro: "现在回到业务现场，盘点已经取得的进展。",
    questions: [],
  },
  {
    id: "plan",
    title: "未来规划",
    intro: "基于当前基础，我们继续梳理下一阶段的计划。",
    questions: [],
  },
  {
    id: "funding",
    title: "融资计划",
    intro: "下面聊聊资金需求，以及资金将如何推动增长。",
    questions: [],
  },
  {
    id: "team",
    title: "团队与联系方式",
    intro: "最后，介绍一下推动这件事的人和联系方式。",
    questions: [],
  },
];
