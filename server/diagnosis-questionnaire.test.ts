import { describe, expect, it } from "vitest";
import { DIAGNOSIS_STEPS } from "../client/src/pages/diagnosisQuestionnaire";

describe("diagnosis questionnaire structure", () => {
  it("groups the intake into eleven progressive steps with accurate dimension labels", () => {
    expect(DIAGNOSIS_STEPS).toHaveLength(11);
    expect(DIAGNOSIS_STEPS.map(step => step.dimension)).toEqual([
      "Company identity",
      "Scale & markets",
      "Growth & organization",
      "Sales & priorities",
      "Market / Opportunity",
      "Competition",
      "Competitive assets",
      "Business model",
      "Capability",
      "Financial health",
      "Financial health",
    ]);
    expect(DIAGNOSIS_STEPS.every(step => step.questions.length >= 1 && step.questions.length <= 2)).toBe(true);
  });

  it("covers every official basic intake field used by the diagnosis engine", () => {
    const fields = DIAGNOSIS_STEPS.flatMap(step =>
      step.questions.flatMap(question =>
        question.type === "matrix"
          ? question.items.map(item => item.field)
          : [question.field]
      )
    );

    expect(fields).toEqual(expect.arrayContaining([
      "company.name",
      "company.industry_sub",
      "company.region",
      "company.revenue_band",
      "company.revenue_trend",
      "company.headcount_band",
      "company.channels",
      "company.top_anxiety",
      "market.home_market",
      "market.expansion_intent",
      "competition.competitors",
      "competition.customer_values",
      "competition.unique_assets",
      "business_model.revenue_sources",
      "business_model.how_earn_retain",
      "capability.team_structure.研发",
      "capability.team_structure.生产",
      "capability.team_structure.销售",
      "capability.team_structure.职能",
      "capability.function_strength.product",
      "capability.function_strength.supply_chain",
      "capability.function_strength.channel",
      "capability.function_strength.marketing",
      "capability.function_strength.finance",
      "finance_basic.net_margin_band",
      "finance_basic.cost_structure",
      "finance_basic.cash",
      "finance_basic.monthly_fixed",
    ]));
  });

  it("gives every preset choice question a free-text alternative", () => {
    const choiceQuestions = DIAGNOSIS_STEPS.flatMap(step => step.questions)
      .filter(question => question.type === "single" || question.type === "multi");

    expect(choiceQuestions.length).toBeGreaterThan(0);
    expect(choiceQuestions.every(question => Boolean(question.customPlaceholder))).toBe(true);
  });

  it("uses the requested wording, ordering, and optional financial metadata", () => {
    const questions = DIAGNOSIS_STEPS.flatMap(step => step.questions);
    const byId = new Map(questions.map(question => [question.id, question]));
    const scaleStep = DIAGNOSIS_STEPS.find(step => step.id === "company-scale");

    expect(scaleStep?.title).toBe("公司目前的规模");
    expect(scaleStep?.questions.map(question => question.id)).toEqual([
      "revenue-band",
      "region",
    ]);
    expect(byId.get("industry-sub")?.label).toBe("你的业务是什么？");
    expect(byId.get("region")?.label).toBe("你的业务覆盖哪些市场？");
    expect(byId.get("customer-values")?.type).toBe("multi");
    expect(byId.has("unique-assets")).toBe(true);
    expect(byId.get("cost-structure")?.label).toBe(
      "你的成本主要花在哪些地方？（如原材料、人工、房租、推广等）"
    );

    for (const id of ["cash", "monthly-fixed"]) {
      const question = byId.get(id);
      expect(question && "optional" in question ? question.optional : false).toBe(true);
      expect(question && "helperText" in question ? question.helperText : "").toContain(
        "不填我们仍会给出完整诊断"
      );
    }

    expect(DIAGNOSIS_STEPS.find(step => step.id === "finance-cash")?.showFinanceUpload).toBe(true);
  });

  it("uses 公司 instead of 企业 in questionnaire copy", () => {
    const serialized = JSON.stringify(DIAGNOSIS_STEPS);
    expect(serialized).not.toContain("企业");
  });
});
