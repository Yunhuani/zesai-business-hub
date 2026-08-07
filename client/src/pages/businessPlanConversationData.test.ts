import { describe, expect, it } from "vitest";
import { BUSINESS_PLAN_QUESTIONS } from "./businessPlanQuestionnaire";
import { getBusinessPlanQuestionForAnswers } from "./businessPlanConversationData";

describe("business plan conversation question presentation", () => {
  it("converts the dual-sided customer question to a two-row table", () => {
    const question = BUSINESS_PLAN_QUESTIONS.find(item => item.id === "target_customer")!;
    const table = getBusinessPlanQuestionForAnswers(question, {
      "_meta.customer_type": "两者都有，是平台或者双边模式",
    });

    expect(table.type).toBe("table");
    expect(table).toMatchObject({
      field: "demand.target_customer",
      fixedRows: [
        { customer_type: "第一类客户", customer_profile: "" },
        { customer_type: "第二类客户", customer_profile: "" },
      ],
    });
  });

  it("does not expose development markers in the dual-sided prompt", () => {
    const question = BUSINESS_PLAN_QUESTIONS.find(item => item.id === "target_customer")!;
    expect(question.labelByAnswer?.values["两者都有，是平台或者双边模式"]).not.toContain("第一格标签");
    expect(question.labelByAnswer?.values["两者都有，是平台或者双边模式"]).not.toContain("第二格标签");
  });
});
