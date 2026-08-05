import { beforeEach, describe, expect, it, vi } from "vitest";

const selectResponses: unknown[][] = [];
const insertedTransactions: unknown[] = [];
const userUpdates: unknown[] = [];

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    transaction: async (callback: (tx: any) => Promise<unknown>) => callback({
      select: () => ({ from: () => ({ where: () => ({
        orderBy: () => ({ limit: async () => selectResponses.shift() ?? [] }),
        limit: async () => selectResponses.shift() ?? [],
      }) }) }),
      update: () => ({ set: (payload: unknown) => ({ where: async () => userUpdates.push(payload) }) }),
      insert: () => ({ values: async (payload: unknown) => insertedTransactions.push(payload) }),
    }),
  })),
}));

describe("business plan refund", () => {
  beforeEach(() => {
    selectResponses.length = 0;
    insertedTransactions.length = 0;
    userUpdates.length = 0;
  });

  it("refunds business_plan_full once using its dedicated billing key", async () => {
    selectResponses.push(
      [{ id: 9, userId: 3, amount: -1500, balancePurchased: 0, balanceSubscription: 0, createdAt: "2026-08-05" }],
      [],
      [{ balancePurchased: 600, balanceSubscription: 900 }],
      [{ id: 3, creditsPurchased: 0, creditsSubscription: 0 }]
    );
    const { refundBusinessPlanFullIfCharged } = await import("./creditsManager");

    await expect(refundBusinessPlanFullIfCharged(51)).resolves.toEqual({ refunded: true, amount: 1500 });
    expect(userUpdates).toEqual([{ creditsPurchased: 600, creditsSubscription: 900 }]);
    expect(insertedTransactions[0]).toEqual(expect.objectContaining({
      relatedDiagnosisId: 51,
      billingKey: "refund:business_plan_full",
      amount: 1500,
    }));
  });
});
