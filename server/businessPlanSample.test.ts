import { describe, expect, it } from "vitest";
import { BUSINESS_PLAN_SAMPLE } from "./businessPlanSample";

describe("business plan sample", () => {
  it("contains every BPIntake module and preserves the intentional pending field", () => {
    expect(Object.keys(BUSINESS_PLAN_SAMPLE)).toEqual([
      "project_overview",
      "demand",
      "product_model",
      "market",
      "competition",
      "current_state",
      "plan",
      "funding",
      "team",
    ]);
    expect(BUSINESS_PLAN_SAMPLE.demand.pain_points).toHaveLength(3);
    expect(BUSINESS_PLAN_SAMPLE.product_model.solutions).toHaveLength(3);
    expect(BUSINESS_PLAN_SAMPLE.product_model.core_values).toHaveLength(3);
    expect(BUSINESS_PLAN_SAMPLE.product_model.net_margin).toBe("");
    expect(BUSINESS_PLAN_SAMPLE.market.growth_forecast).toHaveLength(5);
    expect(BUSINESS_PLAN_SAMPLE.competition.competitors).toHaveLength(3);
    expect(BUSINESS_PLAN_SAMPLE.plan.financial_projection).toHaveLength(5);
    expect(BUSINESS_PLAN_SAMPLE.funding.use_of_funds).toHaveLength(4);
    expect(BUSINESS_PLAN_SAMPLE.team.members).toHaveLength(3);
  });
});
