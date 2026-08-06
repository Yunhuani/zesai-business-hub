export type BusinessPlanDraftAnswer =
  | string
  | string[]
  | Array<Record<string, string | number | null>>;

export type BusinessPlanDraft = {
  answers: Record<string, BusinessPlanDraftAnswer>;
  customValues: Record<string, string>;
  conversationUnitIndex: number;
};

export function getRestorableBusinessPlanUnitIndex(
  savedIndex: number | undefined,
  answers: BusinessPlanDraft["answers"],
  unitIds: readonly string[]
): number {
  const firstUnansweredIndex = unitIds.findIndex(
    unitId => !Object.prototype.hasOwnProperty.call(answers, unitId)
  );
  const answeredUnitCount =
    firstUnansweredIndex < 0 ? unitIds.length : firstUnansweredIndex;

  return Math.min(Math.max(savedIndex ?? 0, 0), answeredUnitCount);
}

const BUSINESS_PLAN_DRAFT_KEY = "zesai_business_plan_draft_v1";

export function loadBusinessPlanDraft(
  storage: Storage = localStorage
): BusinessPlanDraft | null {
  try {
    const raw = storage.getItem(BUSINESS_PLAN_DRAFT_KEY);
    return raw ? (JSON.parse(raw) as BusinessPlanDraft) : null;
  } catch {
    return null;
  }
}

export function saveBusinessPlanDraft(
  draft: BusinessPlanDraft,
  storage: Storage = localStorage
) {
  storage.setItem(BUSINESS_PLAN_DRAFT_KEY, JSON.stringify(draft));
}

export function clearBusinessPlanDraft(storage: Storage = localStorage) {
  storage.removeItem(BUSINESS_PLAN_DRAFT_KEY);
}
