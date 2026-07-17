import { beforeEach, describe, expect, it, vi } from "vitest";

type UserState = {
  id: number;
  creditsPurchased: number;
  creditsSubscription: number;
  creditsResetDate: string;
};

type SubscriptionState = {
  userId: number;
  plan: string;
  price: number;
  status: string;
  startDate?: unknown;
  endDate: string;
  updatedAt?: unknown;
};

type CreditTransactionState = {
  userId: number;
  type: string;
  amount: number;
  balancePurchased: number;
  balanceSubscription: number;
  description: string;
  relatedOrderId: number;
  idempotencyKey: string;
};

let user: UserState;
let subscription: SubscriptionState | undefined;
let creditTransactions: CreditTransactionState[];

function tableName(table: { [key: symbol]: string }) {
  return table[Symbol.for("drizzle:Name")];
}

function createDbMock() {
  const db = {
    select: () => ({
      from: (table: { [key: symbol]: string }) => ({
        where: () => ({
          limit: async () => {
            switch (tableName(table)) {
              case "creditsTransactions":
                return creditTransactions;
              case "users":
                return [user];
              case "subscriptions":
                return subscription ? [subscription] : [];
              default:
                return [];
            }
          },
        }),
      }),
    }),
    update: (table: { [key: symbol]: string }) => ({
      set: (payload: Record<string, unknown>) => ({
        where: async () => {
          if (tableName(table) === "users") {
            user = { ...user, ...payload } as UserState;
          }
          if (tableName(table) === "subscriptions" && subscription) {
            subscription = { ...subscription, ...payload } as SubscriptionState;
          }
        },
      }),
    }),
    insert: (table: { [key: symbol]: string }) => ({
      values: async (payload: Record<string, unknown>) => {
        if (tableName(table) === "creditsTransactions") {
          creditTransactions.push(payload as CreditTransactionState);
        }
        if (tableName(table) === "subscriptions") {
          subscription = payload as SubscriptionState;
        }
      },
    }),
    transaction: async <T>(callback: (tx: typeof db) => Promise<T>) => callback(db),
  };
  return db;
}

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getDb: vi.fn(async () => createDbMock()),
  };
});

vi.mock("./pricingConfig", () => ({
  getSubscriptionPlan: vi.fn(async (plan: string) => ({
    id: plan,
    name: "基础版",
    priceCents: 9900,
    monthlyCredits: 1800,
    durationDays: 30,
  })),
}));

describe("grantSubscriptionCreditsForOrder", () => {
  beforeEach(() => {
    user = {
      id: 7,
      creditsPurchased: 250,
      creditsSubscription: 30,
      creditsResetDate: "2026-01-01 00:00:00",
    };
    subscription = undefined;
    creditTransactions = [];
  });

  it("opens the subscription and grants credits from the paid time", async () => {
    const { grantSubscriptionCreditsForOrder } = await import("./subscriptionGrant");
    const paidAt = new Date("2026-07-20T10:00:00.000Z");

    const granted = await grantSubscriptionCreditsForOrder(
      101,
      7,
      "basic",
      paidAt
    );

    expect(granted).toBe(true);
    expect(subscription).toMatchObject({
      userId: 7,
      plan: "basic",
      price: 9900,
      status: "active",
      endDate: "2026-08-19 10:00:00",
    });
    expect(user).toMatchObject({
      creditsPurchased: 250,
      creditsSubscription: 1800,
      creditsResetDate: "2026-08-19 10:00:00",
    });
    expect(creditTransactions).toEqual([
      expect.objectContaining({
        userId: 7,
        type: "subscription_grant",
        amount: 1800,
        balancePurchased: 250,
        balanceSubscription: 1800,
        relatedOrderId: 101,
        idempotencyKey: "subscription:101:grant",
      }),
    ]);
  });

  it("does not grant credits twice for the same order", async () => {
    const { grantSubscriptionCreditsForOrder } = await import("./subscriptionGrant");
    const paidAt = new Date("2026-07-20T10:00:00.000Z");

    expect(
      await grantSubscriptionCreditsForOrder(101, 7, "basic", paidAt)
    ).toBe(true);
    user.creditsSubscription = 1200;

    expect(
      await grantSubscriptionCreditsForOrder(101, 7, "basic", paidAt)
    ).toBe(false);
    expect(user.creditsSubscription).toBe(1200);
    expect(creditTransactions).toHaveLength(1);
  });
});
