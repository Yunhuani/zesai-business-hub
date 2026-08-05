import { beforeEach, describe, expect, it, vi } from "vitest";

const tx = {
  insert: vi.fn(() => ({ values: vi.fn(async () => [{ insertId: 51 }]) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
  delete: vi.fn(() => ({ where: vi.fn(async () => undefined) })),
};
const db = {
  transaction: vi.fn(async (callback: (executor: typeof tx) => Promise<unknown>) => callback(tx)),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => undefined) })) })),
};

vi.mock("./db", () => ({ getDb: vi.fn(async () => db) }));
vi.mock("./businessPlanClient", () => ({
  runBusinessPlanGeneration: vi.fn(() => new Promise(() => undefined)),
}));
vi.mock("./creditsManager", () => ({
  checkAndResetCredits: vi.fn(async () => undefined),
  deductCreditsOnceInTx: vi.fn(async () => ({
    success: true,
    charged: true,
    remaining: { purchased: 0, subscription: 0, total: 0 },
  })),
  refundBusinessPlanFullIfCharged: vi.fn(async () => ({ refunded: false, amount: 0 })),
}));
vi.mock("./pricingConfig", () => ({
  getActionCredits: vi.fn(async () => 1_500),
}));

import {
  checkAndResetCredits,
  deductCreditsOnceInTx,
} from "./creditsManager";
import { getActionCredits } from "./pricingConfig";
import { createBusinessPlan } from "./businessPlanService";

describe("createBusinessPlan billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the default path unchanged and charges the configured action price", async () => {
    await expect(createBusinessPlan(7, { company: "Acme" })).resolves.toBe(51);

    expect(checkAndResetCredits).toHaveBeenCalledWith(7);
    expect(getActionCredits).toHaveBeenCalledWith("business_plan");
    expect(deductCreditsOnceInTx).toHaveBeenCalledWith(
      tx,
      7,
      1_500,
      "Business plan generation - BusinessPlan #51",
      51,
      "business_plan_full"
    );
  });

  it("skips all billing work only when skipBilling is explicitly true", async () => {
    await expect(
      createBusinessPlan(7, { company: "Acme" }, { skipBilling: true })
    ).resolves.toBe(51);

    expect(checkAndResetCredits).not.toHaveBeenCalled();
    expect(getActionCredits).not.toHaveBeenCalled();
    expect(deductCreditsOnceInTx).not.toHaveBeenCalled();
  });
});
