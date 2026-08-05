import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING_CONFIG,
  getSeedPricingRows,
  resolveActionCredits,
  resolveCreditPack,
  resolveSubscriptionPlan,
} from "./pricingConfig";

describe("pricing config", () => {
  it("defines the requested action credit prices", () => {
    expect(resolveActionCredits(DEFAULT_PRICING_CONFIG, "chat")).toBe(10);
    expect(resolveActionCredits(DEFAULT_PRICING_CONFIG, "quick_analysis")).toBe(200);
    expect(resolveActionCredits(DEFAULT_PRICING_CONFIG, "diagnosis_full")).toBe(1000);
    expect(resolveActionCredits(DEFAULT_PRICING_CONFIG, "diagnosis_pdf")).toBe(0);
    expect(resolveActionCredits(DEFAULT_PRICING_CONFIG, "business_plan")).toBe(1500);
    expect(resolveActionCredits(DEFAULT_PRICING_CONFIG, "equity_structure")).toBe(1800);
    expect(resolveActionCredits(DEFAULT_PRICING_CONFIG, "report_redownload")).toBe(0);
  });

  it("defines the requested subscription plans", () => {
    expect(resolveSubscriptionPlan(DEFAULT_PRICING_CONFIG, "free")).toMatchObject({
      priceCents: 0,
      monthlyCredits: 0,
    });
    expect(resolveSubscriptionPlan(DEFAULT_PRICING_CONFIG, "basic")).toMatchObject({
      priceCents: 9900,
      monthlyCredits: 1800,
    });
    expect(resolveSubscriptionPlan(DEFAULT_PRICING_CONFIG, "professional")).toMatchObject({
      priceCents: 49900,
      monthlyCredits: 6000,
    });
    expect(resolveSubscriptionPlan(DEFAULT_PRICING_CONFIG, "enterprise")).toMatchObject({
      priceCents: 99900,
      monthlyCredits: 15000,
    });
  });

  it("defines permanent credit packs", () => {
    expect(resolveCreditPack(DEFAULT_PRICING_CONFIG, "pack_500")).toMatchObject({
      credits: 500,
      priceCents: 4900,
    });
    expect(resolveCreditPack(DEFAULT_PRICING_CONFIG, "pack_1200")).toMatchObject({
      credits: 1200,
      priceCents: 9900,
    });
    expect(resolveCreditPack(DEFAULT_PRICING_CONFIG, "pack_3000")).toMatchObject({
      credits: 3000,
      priceCents: 19900,
    });
    expect(resolveCreditPack(DEFAULT_PRICING_CONFIG, "pack_8000")).toMatchObject({
      credits: 8000,
      priceCents: 39900,
    });
  });

  it("produces one unique seed row per pricing key", () => {
    const rows = getSeedPricingRows();
    expect(new Set(rows.map(row => row.key)).size).toBe(rows.length);
    expect(rows).toHaveLength(15);
  });
});
