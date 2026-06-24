import { describe, expect, it } from "vitest";
import {
  FREE_TRIAL_CREDITS,
  calculateCreditDeduction,
  calculateFreeTrialGrant,
} from "./creditsPolicy";

describe("credits policy", () => {
  it("deducts expiring subscription credits before permanent purchased credits", () => {
    expect(
      calculateCreditDeduction(
        { subscription: 100, purchased: 1000 },
        150
      )
    ).toEqual({
      subscription: 0,
      purchased: 950,
    });
  });

  it("uses only subscription credits when they cover the charge", () => {
    expect(
      calculateCreditDeduction(
        { subscription: 300, purchased: 1000 },
        150
      )
    ).toEqual({
      subscription: 150,
      purchased: 1000,
    });
  });

  it("rejects deductions larger than the combined balance", () => {
    expect(() =>
      calculateCreditDeduction(
        { subscription: 50, purchased: 50 },
        101
      )
    ).toThrow("Insufficient credits");
  });

  it("grants the free trial exactly once without monthly reset", () => {
    expect(FREE_TRIAL_CREDITS).toBe(150);
    expect(calculateFreeTrialGrant(false, 0)).toEqual({
      grant: FREE_TRIAL_CREDITS,
      balance: FREE_TRIAL_CREDITS,
      markGranted: true,
    });
    expect(calculateFreeTrialGrant(true, 30)).toEqual({
      grant: 0,
      balance: 30,
      markGranted: false,
    });
  });
});
