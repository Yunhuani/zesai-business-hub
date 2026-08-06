type BPQuestionBase = {
  id: string;
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

export type BPStep = {
  id: string;
  title: string;
  transition: string;
  questions: BPQuestion[];
};

export const BUSINESS_PLAN_STEPS: BPStep[] = [
  { id: "cover", title: "封面信息", transition: "", questions: [] },
  { id: "demand", title: "需求", transition: "", questions: [] },
  { id: "product", title: "产品与商业模式", transition: "", questions: [] },
  { id: "market", title: "市场规模", transition: "", questions: [] },
  { id: "competition", title: "竞争", transition: "", questions: [] },
  { id: "traction", title: "目前状况", transition: "", questions: [] },
  { id: "plan", title: "未来规划", transition: "", questions: [] },
  { id: "funding", title: "融资计划", transition: "", questions: [] },
  { id: "team", title: "团队与联系方式", transition: "", questions: [] },
];
