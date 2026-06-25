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

describe("chat credit idempotency", () => {
  beforeEach(() => {
    selectResponses.length = 0;
    insertedTransactions.length = 0;
    userUpdates.length = 0;
  });

  it("deducts credits once for the same idempotency key", async () => {
    selectResponses.push(
      [],
      [{ id: 5, creditsPurchased: 100, creditsSubscription: 20 }]
    );
    const { deductCreditsWithIdempotencyKey } = await import("./creditsManager");

    const result = await deductCreditsWithIdempotencyKey(
      5,
      10,
      "chat",
      "chat:5:8:req-1"
    );

    expect(result).toMatchObject({ success: true, charged: true });
    expect(userUpdates).toEqual([
      { creditsPurchased: 100, creditsSubscription: 10 },
    ]);
    expect(insertedTransactions).toEqual([
      expect.objectContaining({
        userId: 5,
        type: "consume",
        amount: -10,
        idempotencyKey: "chat:5:8:req-1",
      }),
    ]);
  });

  it("returns success without charging again when idempotency key already exists", async () => {
    selectResponses.push(
      [{ id: 9 }],
      [{ id: 5, creditsPurchased: 90, creditsSubscription: 20 }]
    );
    const { deductCreditsWithIdempotencyKey } = await import("./creditsManager");

    const result = await deductCreditsWithIdempotencyKey(
      5,
      10,
      "chat",
      "chat:5:8:req-1"
    );

    expect(result).toEqual({
      success: true,
      charged: false,
      remaining: { purchased: 90, subscription: 20, total: 110 },
    });
    expect(userUpdates).toEqual([]);
    expect(insertedTransactions).toEqual([]);
  });
});
