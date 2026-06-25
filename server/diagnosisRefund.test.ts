import { beforeEach, describe, expect, it, vi } from "vitest";

const selectResponses: unknown[][] = [];
const insertedTransactions: unknown[] = [];
const userUpdates: unknown[] = [];

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => selectResponses.shift() ?? [],
            }),
          }),
        }),
        update: () => ({
          set: (payload: unknown) => ({
            where: async () => {
              userUpdates.push(payload);
            },
          }),
        }),
        insert: () => ({
          values: async (payload: unknown) => {
            insertedTransactions.push(payload);
          },
        }),
      }),
  })),
}));

describe("diagnosis full refund", () => {
  beforeEach(() => {
    selectResponses.length = 0;
    insertedTransactions.length = 0;
    userUpdates.length = 0;
  });

  it("refunds a charged diagnosis_full transaction once", async () => {
    selectResponses.push(
      [{ id: 7, userId: 3, amount: -1500 }],
      [],
      [{ id: 3, creditsPurchased: 200, creditsSubscription: 100 }]
    );
    const { refundDiagnosisFullIfCharged } = await import("./creditsManager");

    const result = await refundDiagnosisFullIfCharged(42);

    expect(result).toEqual({ refunded: true, amount: 1500 });
    expect(userUpdates).toEqual([{ creditsPurchased: 1700 }]);
    expect(insertedTransactions).toEqual([
      expect.objectContaining({
        userId: 3,
        type: "refund",
        amount: 1500,
        balancePurchased: 1700,
        balanceSubscription: 100,
        relatedDiagnosisId: 42,
        billingKey: "refund:diagnosis_full",
      }),
    ]);
  });

  it("does not refund diagnosis_full twice", async () => {
    selectResponses.push(
      [{ id: 7, userId: 3, amount: -1500 }],
      [{ id: 8 }]
    );
    const { refundDiagnosisFullIfCharged } = await import("./creditsManager");

    const result = await refundDiagnosisFullIfCharged(42);

    expect(result).toEqual({ refunded: false, amount: 0 });
    expect(userUpdates).toEqual([]);
    expect(insertedTransactions).toEqual([]);
  });
});
