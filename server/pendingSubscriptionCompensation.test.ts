import { beforeEach, describe, expect, it, vi } from "vitest";

type PaidOrder = {
  id: number;
  userId: number;
  outTradeNo: string;
  plan: string;
  status: "paid";
  paidAt: string;
  createdAt: string;
};

let paidOrders: PaidOrder[];
let deliveredOrderIds: number[];

const grantSubscriptionCreditsForOrder = vi.fn(async () => true);

function tableName(table: { [key: symbol]: string }) {
  return table[Symbol.for("drizzle:Name")];
}

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    select: () => ({
      from: (table: { [key: symbol]: string }) => ({
        where: async () => {
          if (tableName(table) === "orders") return paidOrders;
          if (tableName(table) === "creditsTransactions") {
            return deliveredOrderIds.map(orderId => ({ orderId }));
          }
          return [];
        },
      }),
    }),
  })),
  updateOrderStatus: vi.fn(),
  getUserById: vi.fn(),
}));

vi.mock("./subscriptionGrant", () => ({
  grantSubscriptionCreditsForOrder,
}));

vi.mock("./_core/alipay", () => ({ queryAlipayOrder: vi.fn() }));
vi.mock("./creditsManager", () => ({
  addPurchasedCredits: vi.fn(),
  clearSubscriptionCredits: vi.fn(),
}));
vi.mock("./orderNotification", () => ({ notifyAdminNewOrder: vi.fn() }));
vi.mock("./pricingConfig", () => ({
  getCreditPack: vi.fn(),
  getSubscriptionPlan: vi.fn(),
}));

describe("checkPaidButUndeliveredSubscriptionOrders", () => {
  beforeEach(() => {
    paidOrders = [
      {
        id: 201,
        userId: 9,
        outTradeNo: "SUB-201",
        plan: "professional",
        status: "paid",
        paidAt: "2026-07-17 11:05:00",
        createdAt: "2026-07-17 11:00:00",
      },
    ];
    deliveredOrderIds = [];
    grantSubscriptionCreditsForOrder.mockClear();
  });

  it("grants a paid subscription order that has no grant transaction", async () => {
    const { checkPaidButUndeliveredSubscriptionOrders } = await import(
      "./pendingOrderChecker"
    );

    await checkPaidButUndeliveredSubscriptionOrders();

    expect(grantSubscriptionCreditsForOrder).toHaveBeenCalledWith(
      201,
      9,
      "professional",
      new Date("2026-07-17T11:05:00.000Z")
    );
  });

  it("does not grant an order that already has a subscription grant", async () => {
    deliveredOrderIds = [201];
    const { checkPaidButUndeliveredSubscriptionOrders } = await import(
      "./pendingOrderChecker"
    );

    await checkPaidButUndeliveredSubscriptionOrders();

    expect(grantSubscriptionCreditsForOrder).not.toHaveBeenCalled();
  });

  it("ignores orders before the rollout cutoff and non-subscription plans", async () => {
    paidOrders = [
      {
        ...paidOrders[0],
        id: 202,
        createdAt: "2026-07-17 10:59:04",
      },
      {
        ...paidOrders[0],
        id: 203,
        plan: "pack_500",
      },
    ];
    const { checkPaidButUndeliveredSubscriptionOrders } = await import(
      "./pendingOrderChecker"
    );

    await checkPaidButUndeliveredSubscriptionOrders();

    expect(grantSubscriptionCreditsForOrder).not.toHaveBeenCalled();
  });
});
