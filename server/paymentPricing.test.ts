import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING_CONFIG } from "./pricingConfig";
import { resolvePaymentProduct } from "./paymentPricing";

describe("payment pricing", () => {
  it("uses the configured subscription price", () => {
    expect(
      resolvePaymentProduct(
        DEFAULT_PRICING_CONFIG,
        "subscription",
        "enterprise"
      )
    ).toMatchObject({
      amountCents: 99900,
      credits: 15000,
    });
  });

  it("uses the configured credit pack price", () => {
    expect(
      resolvePaymentProduct(
        DEFAULT_PRICING_CONFIG,
        "credits",
        "pack_3000"
      )
    ).toMatchObject({
      amountCents: 19900,
      credits: 3000,
    });
  });
});
