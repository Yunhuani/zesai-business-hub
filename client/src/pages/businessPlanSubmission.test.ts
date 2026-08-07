import { describe, expect, it } from "vitest";
import { BUSINESS_PLAN_QUESTIONS } from "./businessPlanQuestionnaire";
import { buildBusinessPlanIntake } from "./businessPlanSubmission";
import { validateBusinessPlanAnswers, validateBusinessPlanQuestion } from "./businessPlanValidation";

describe("business plan submission validation", () => {
  it("rejects a required whitespace answer immediately", () => {
    const question = BUSINESS_PLAN_QUESTIONS.find(item => item.id === "company_name")!;
    const result = validateBusinessPlanQuestion(question, {
      "project_overview.company_name": "   ",
    });

    expect(result?.message).toContain("必填");
  });

  it("enforces cross-field solution and pain-point counts", () => {
    const result = validateBusinessPlanAnswers({
      "demand.pain_points": [{ description: "a", why_rigid_demand: "b" }],
      "product_model.solutions": [],
    });

    expect(result.errors.some(error => error.path === "product_model.solutions")).toBe(true);
  });

  it("returns percentage mismatch as a warning instead of an error", () => {
    const result = validateBusinessPlanAnswers({
      "product_model.revenue_sources": [
        { source: "A", share: "40" },
        { source: "B", share: "40" },
      ],
    });

    expect(result.warnings).toContain("收入来源占比合计应为 100%");
  });

  it("accepts between one and three pain points", () => {
    const question = BUSINESS_PLAN_QUESTIONS.find(item => item.id === "pain_points")!;
    const oneRow = validateBusinessPlanQuestion(question, {
      "demand.pain_points": [{ description: "a", why_rigid_demand: "b" }],
    });
    const threeRows = validateBusinessPlanQuestion(question, {
      "demand.pain_points": [
        { description: "a", why_rigid_demand: "b" },
        { description: "c", why_rigid_demand: "d" },
        { description: "e", why_rigid_demand: "f" },
      ],
    });

    expect(oneRow).toBeNull();
    expect(threeRows).toBeNull();
    expect(validateBusinessPlanQuestion(question, { "demand.pain_points": [] })?.message).toContain("1-3");
    expect(validateBusinessPlanQuestion(question, {
      "demand.pain_points": [
        { description: "a", why_rigid_demand: "b" },
        { description: "c", why_rigid_demand: "d" },
        { description: "e", why_rigid_demand: "f" },
        { description: "g", why_rigid_demand: "h" },
      ],
    })?.message).toContain("1-3");
  });

  it("accepts one to three solutions and writes omitted competitors as null", () => {
    const question = BUSINESS_PLAN_QUESTIONS.find(item => item.id === "solutions")!;
    const row = { pain_point: "a", solution: "b" };

    expect(validateBusinessPlanQuestion(question, {
      "demand.pain_points": [row],
      "product_model.solutions": [row],
    })).toBeNull();
    expect(validateBusinessPlanQuestion(question, {
      "demand.pain_points": [row, row, row, row],
      "product_model.solutions": [row, row, row, row],
    })?.message).toContain("1-3");
    expect(buildBusinessPlanIntake({}).competition).toEqual({ competitors: null });
  });

  it("blocks funding percentage mismatch", () => {
    const result = validateBusinessPlanAnswers({
      "funding.use_of_funds": [
        { purpose: "A", percentage: "30" },
        { purpose: "B", percentage: "30" },
        { purpose: "C", percentage: "30" },
      ],
    });

    expect(result.errors.some(error => error.path === "funding.use_of_funds")).toBe(true);
    expect(result.warnings).not.toContain("资金用途占比合计应为 100%");
  });

  it("maps third-year revenue to market som", () => {
    const intake = buildBusinessPlanIntake({
      "plan.financial_projection": [
        { year: "1", revenue: "100", net_profit: "10" },
        { year: "2", revenue: "200", net_profit: "20" },
        { year: "3", revenue: "300", net_profit: "30" },
      ],
    });

    expect(intake.market).toMatchObject({ market_size: { som: "300" } });
  });

  it("builds nested intake and removes meta-only fields", () => {
    const intake = buildBusinessPlanIntake({
      "project_overview.company_name": "Acme",
      "_meta.customer_type": "企业",
      "_meta.market_focus": "华东",
      "market.market_size.sam": "100",
    });

    expect(intake.project_overview).toMatchObject({ company_name: "Acme" });
    expect(intake.market).toMatchObject({ market_size: { sam: "100" } });
    expect(JSON.stringify(intake)).not.toContain("_meta");
  });
});
