import type { BPQuestion, BPTableQuestion } from "./businessPlanQuestionnaire";

export const DUAL_CUSTOMER_TYPE = "两者都有，是平台或者双边模式";

export function getBusinessPlanQuestionForAnswers(
  question: BPQuestion,
  answers: Record<string, unknown>
): BPQuestion {
  if (question.id !== "target_customer" || answers["_meta.customer_type"] !== DUAL_CUSTOMER_TYPE) {
    return question;
  }

  return {
    id: question.id,
    section: question.section,
    label: question.label,
    type: "table",
    field: "demand.target_customer",
    columns: [
      { id: "customer_type", label: "客户类型", type: "text", readonly: true },
      { id: "customer_profile", label: "客户画像", type: "textarea" },
    ],
    fixedRows: [
      { customer_type: "第一类客户", customer_profile: "" },
      { customer_type: "第二类客户", customer_profile: "" },
    ],
    addable: false,
  } satisfies BPTableQuestion;
}
