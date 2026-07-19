export const DIAGNOSIS_FOLLOW_UP_FIELDS = [
  "company.top_anxiety",
  "business_model.how_earn_retain",
  "finance_basic.cost_structure",
  "business_model.revenue_sources",
] as const;

export const DIAGNOSIS_FOLLOW_UP_MIN_LENGTH = 15;

const FOLLOW_UP_FIELD_SET = new Set<string>(DIAGNOSIS_FOLLOW_UP_FIELDS);
const FOLLOW_UP_HINT = "能再具体说说吗?这会让诊断更准。";

export function getDiagnosisFollowUpHint(
  field: string,
  value: unknown
): string | null {
  if (!FOLLOW_UP_FIELD_SET.has(field) || typeof value !== "string") {
    return null;
  }

  const contentLength = Array.from(value.replace(/\s+/g, "")).length;
  return contentLength > 0 && contentLength < DIAGNOSIS_FOLLOW_UP_MIN_LENGTH
    ? FOLLOW_UP_HINT
    : null;
}
