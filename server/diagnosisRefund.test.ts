import { beforeEach, describe, expect, it, vi } from "vitest";

const selectResponses: unknown[][] = [];
const insertedTransactions: unknown[] = [];
const userUpdates: unknown[] = [];

function queueRefundReads({
  charge,
  previous,
  user,
  existingRefund = [],
}: {
  charge: unknown[];
  previous: unknown[];
  user: unknown[];
  existingRefund?: unknown[];
}) {
  selectResponses.push(charge, existingRefund, previous, user);
}

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        select: () => ({
          from: () => ({
            where: () => ({
              orderBy: () => ({
                limit: async () => selectResponses.shift() ?? [],
              }),
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

  it("refunds a pure subscription charge back to the subscription bucket", async () => {
    queueRefundReads({
      charge: [{ id: 7, userId: 3, amount: -1000, balancePurchased: 0, balanceSubscription: 0 }],
      previous: [{ balancePurchased: 0, balanceSubscription: 1000 }],
      user: [{ id: 3, creditsPurchased: 0, creditsSubscription: 0 }],
    });
    const { refundDiagnosisFullIfCharged } = await import("./creditsManager");

    const result = await refundDiagnosisFullIfCharged(42);

    expect(result).toEqual({ refunded: true, amount: 1000 });
    expect(userUpdates).toEqual([{ creditsPurchased: 0, creditsSubscription: 1000 }]);
    expect(insertedTransactions).toEqual([
      expect.objectContaining({
        userId: 3,
        type: "refund",
        amount: 1000,
        balancePurchased: 0,
        balanceSubscription: 1000,
        relatedDiagnosisId: 42,
        billingKey: "refund:diagnosis_full",
      }),
    ]);
  });

  it("refunds a pure purchased-credit charge back to the purchased bucket", async () => {
    queueRefundReads({
      charge: [{ id: 7, userId: 3, amount: -1000, balancePurchased: 0, balanceSubscription: 0 }],
      previous: [{ balancePurchased: 1000, balanceSubscription: 0 }],
      user: [{ id: 3, creditsPurchased: 0, creditsSubscription: 0 }],
    });
    const { refundDiagnosisFullIfCharged } = await import("./creditsManager");

    const result = await refundDiagnosisFullIfCharged(42);

    expect(result.amount).toBe(1000);
    expect(userUpdates).toEqual([{ creditsPurchased: 1000, creditsSubscription: 0 }]);
    expect(insertedTransactions[0]).toEqual(expect.objectContaining({
      amount: 1000,
      balancePurchased: 1000,
      balanceSubscription: 0,
    }));
  });

  it("refunds mixed charges symmetrically across both buckets", async () => {
    queueRefundReads({
      charge: [{ id: 7, userId: 3, amount: -1000, balancePurchased: 0, balanceSubscription: 0 }],
      previous: [{ balancePurchased: 600, balanceSubscription: 400 }],
      user: [{ id: 3, creditsPurchased: 0, creditsSubscription: 0 }],
    });
    const { refundDiagnosisFullIfCharged } = await import("./creditsManager");

    const result = await refundDiagnosisFullIfCharged(42);

    expect(result.amount).toBe(1000);
    expect(userUpdates).toEqual([{ creditsPurchased: 600, creditsSubscription: 400 }]);
    expect(insertedTransactions[0]).toEqual(expect.objectContaining({
      amount: 1000,
      balancePurchased: 600,
      balanceSubscription: 400,
    }));
    expect(
      (userUpdates[0] as { creditsPurchased: number; creditsSubscription: number }).creditsPurchased +
      (userUpdates[0] as { creditsPurchased: number; creditsSubscription: number }).creditsSubscription
    ).toBe(result.amount);
  });

  it("does not refund diagnosis_full twice", async () => {
    selectResponses.push([{ id: 7, userId: 3, amount: -1000 }], [{ id: 8 }]);
    const { refundDiagnosisFullIfCharged } = await import("./creditsManager");

    const result = await refundDiagnosisFullIfCharged(42);

    expect(result).toEqual({ refunded: false, amount: 0 });
    expect(userUpdates).toEqual([]);
    expect(insertedTransactions).toEqual([]);
  });
});
