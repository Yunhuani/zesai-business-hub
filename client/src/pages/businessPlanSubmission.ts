import type {
  BPField,
  BPQuestion,
  BPTextQuestion,
} from "./businessPlanQuestionnaire";
import { BUSINESS_PLAN_QUESTIONS } from "./businessPlanQuestionnaire";
import type {
  BusinessPlanDraftAnswer,
  BusinessPlanDraftRow,
} from "@/lib/businessPlanDraft";

export type BusinessPlanAnswers = Record<string, BusinessPlanDraftAnswer>;

export type BusinessPlanValidationError = {
  questionId?: string;
  path: string;
  message: string;
};

export type BusinessPlanValidationResult = {
  errors: BusinessPlanValidationError[];
  warnings: string[];
};

const NUMERIC_TEXT_FIELDS = new Set([
  "product_model.gross_margin",
  "product_model.net_margin",
]);

const PERCENTAGE_LABELS: Record<string, string> = {
  "product_model.revenue_sources": "收入来源占比合计应为 100%",
  "current_state.coverage": "市场覆盖占比合计应为 100%",
  "funding.use_of_funds": "资金用途占比合计应为 100%",
};

const isFilled = (value: unknown): boolean =>
  value !== null && value !== undefined && String(value).trim().length > 0;

const rowHasValues = (row: BusinessPlanDraftRow, fields: readonly BPField[]) =>
  fields.every(field => field.optional || isFilled(row[field.id]));

const rowsFor = (answers: BusinessPlanAnswers, field: string): BusinessPlanDraftRow[] => {
  const value = answers[field];
  return Array.isArray(value) ? value as BusinessPlanDraftRow[] : [];
};

function validateTextQuestion(question: BPTextQuestion, answers: BusinessPlanAnswers): string | null {
  if (question.fields) {
    const missing = question.fields.find(field => !field.optional && !isFilled(answers[field.id]));
    return missing ? `${missing.label || missing.id}为必填项` : null;
  }
  if (!question.optional && question.field && !isFilled(answers[question.field])) {
    return "该项为必填项";
  }
  if (
    question.field &&
    NUMERIC_TEXT_FIELDS.has(question.field) &&
    !/\d/.test(String(answers[question.field]))
  ) {
    return "请填写具体的百分比数字";
  }
  return null;
}

export function validateBusinessPlanQuestion(
  question: BPQuestion,
  answers: BusinessPlanAnswers
): BusinessPlanValidationError | null {
  const questionField = "field" in question && question.field ? question.field : question.id;
  if (question.type === "text" || question.type === "textarea" || question.type === "number") {
    const message = validateTextQuestion(question, answers);
    return message ? { questionId: question.id, path: question.field ?? question.id, message } : null;
  }

  if (question.type === "single") {
    return isFilled(answers[question.field])
      ? null
      : { questionId: question.id, path: questionField, message: "该项为必填项" };
  }

  if (question.type === "card-list") {
    const rows = rowsFor(answers, question.field);
    const min = question.minCards ?? 1;
    const max = question.maxCards ?? Number.POSITIVE_INFINITY;
    if (rows.length < min || rows.length > max) {
      return { questionId: question.id, path: questionField, message: `请填写 ${min}-${max} 条` };
    }
    if (question.field === "product_model.solutions") {
      const painPointCount = rowsFor(answers, "demand.pain_points").length;
      if (rows.length !== painPointCount) {
        return { questionId: question.id, path: questionField, message: "解决方案数量必须与客户痛点一致" };
      }
    }
    const invalidRow = rows.find(row => !rowHasValues(row, question.fields));
    return invalidRow
      ? { questionId: question.id, path: questionField, message: "每一行的必填项都需要填写" }
      : null;
  }

  if (question.type === "table") {
    const rows = rowsFor(answers, question.field);
    const expected = question.fixedRows?.length;
    const min = expected ?? question.minRows ?? 1;
    const max = expected ?? question.maxRows ?? Number.POSITIVE_INFINITY;
    if (rows.length < min || rows.length > max) {
      return { questionId: question.id, path: questionField, message: expected ? `需要填写固定 ${expected} 行` : `请填写 ${min}-${max} 行` };
    }
    return rows.some(row => !rowHasValues(row, question.columns))
      ? { questionId: question.id, path: questionField, message: "每一行的三格必填项都需要填写" }
      : null;
  }

  return null;
}

function percentageWarning(answers: BusinessPlanAnswers, field: string, key: string): string | null {
  const rows = rowsFor(answers, field);
  if (!rows.length) return null;
  const percentageLabel = PERCENTAGE_LABELS[field];
  const total = rows.reduce((sum, row) => sum + Number(row[key] ?? 0), 0);
  if (total !== 100 && percentageLabel) return percentageLabel;
  return total === 100 ? null : `${field} 占比合计应为 100%`;
}

export function validateBusinessPlanAnswers(
  answers: BusinessPlanAnswers
): BusinessPlanValidationResult {
  const errors = BUSINESS_PLAN_QUESTIONS
    .map(question => validateBusinessPlanQuestion(question, answers))
    .filter((error): error is BusinessPlanValidationError => Boolean(error));

  const painPoints = rowsFor(answers, "demand.pain_points");
  const solutions = rowsFor(answers, "product_model.solutions");
  if (painPoints.length !== solutions.length) {
    errors.push({ questionId: "solutions", path: "product_model.solutions", message: "解决方案数量必须与客户痛点一致" });
  }

  const fundingWarning = percentageWarning(answers, "funding.use_of_funds", "percentage");
  if (fundingWarning) {
    errors.push({ path: "funding.use_of_funds", message: fundingWarning });
  }

  return {
    errors,
    warnings: [
      percentageWarning(answers, "product_model.revenue_sources", "share"),
      percentageWarning(answers, "current_state.coverage", "share"),
    ].filter((warning): warning is string => Boolean(warning)),
  };
}

function setNested(target: Record<string, unknown>, path: string, value: unknown): void {
  if (path.startsWith("_meta.") || value === undefined) return;
  const parts = path.split(".");
  let cursor = target;
  parts.forEach((part, index) => {
    if (index === parts.length - 1) {
      cursor[part] = value;
      return;
    }
    const next = cursor[part];
    if (!next || typeof next !== "object" || Array.isArray(next)) cursor[part] = {};
    cursor = cursor[part] as Record<string, unknown>;
  });
}

export function buildBusinessPlanIntake(answers: BusinessPlanAnswers): Record<string, unknown> {
  const intake: Record<string, unknown> = {};
  setNested(intake, "competition.competitors", null);
  for (const question of BUSINESS_PLAN_QUESTIONS) {
    if (question.type === "score-matrix" || question.type === "card-list" || question.type === "table" || question.type === "single") {
      setNested(intake, question.field, answers[question.field]);
      continue;
    }
    if (question.fields) {
      for (const field of question.fields) setNested(intake, field.id, answers[field.id]);
    } else if (question.field) {
      setNested(intake, question.field, answers[question.field]);
    }
  }
  const financialProjection = rowsFor(answers, "plan.financial_projection");
  const thirdYearRevenue = financialProjection[2]?.revenue;
  setNested(intake, "market.market_size.som", isFilled(thirdYearRevenue) ? thirdYearRevenue : null);
  return intake;
}
