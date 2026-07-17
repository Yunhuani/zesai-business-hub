import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  order: {
    id: 301,
    userId: 9,
    outTradeNo: "SUB-301",
    tradeNo: null,
    plan: "basic",
    amount: 9900,
    status: "pending" as "pending" | "paid",
    paymentMethod: "alipay",
    paidAt: null as string | null,
    createdAt: "2026-07-17 11:10:00",
    updatedAt: "2026-07-17 11:10:00",
  },
  grantSubscriptionCreditsForOrder: vi.fn(async () => true),
  updateOrderStatus: vi.fn(async () => undefined),
  pricing: {
    "subscription.basic": {
      key: "subscription.basic",
      category: "subscription" as const,
      name: "基础版",
      credits: null,
      priceCents: 9900,
      monthlyCredits: 1800,
      durationDays: 30,
      permanent: false,
    },
  },
}));

vi.mock("../_core/alipay", () => ({
  createAlipayPagePayment: vi.fn(),
  queryAlipayOrder: vi.fn(async () => ({
    tradeStatus: "TRADE_SUCCESS",
    tradeNo: "ALI-301",
  })),
  verifyAlipayCallback: vi.fn(() => true),
}));

vi.mock("../wechatPay", () => ({
  createWechatH5Payment: vi.fn(),
  createWechatJsapiPayment: vi.fn(),
  queryWechatPayment: vi.fn(),
}));

vi.mock("../db", () => ({
  createOrder: vi.fn(),
  getOrderByOutTradeNo: vi.fn(async () => mocks.order),
  updateOrderStatus: mocks.updateOrderStatus,
  createOrUpdateSubscription: vi.fn(),
}));

vi.mock("../pricingConfig", async importOriginal => {
  const actual = await importOriginal<typeof import("../pricingConfig")>();
  return {
    ...actual,
    getPricingConfig: vi.fn(async () => mocks.pricing),
    getSubscriptionPlan: vi.fn(),
  };
});

vi.mock("../subscriptionGrant", () => ({
  grantSubscriptionCreditsForOrder: mocks.grantSubscriptionCreditsForOrder,
}));

vi.mock("../creditsManager", () => ({
  addPurchasedCredits: vi.fn(),
  resetSubscriptionCredits: vi.fn(),
}));

describe("payment subscription fulfillment", () => {
  beforeEach(() => {
    mocks.grantSubscriptionCreditsForOrder.mockClear();
    mocks.updateOrderStatus.mockClear();
    mocks.order.status = "pending";
    mocks.order.paidAt = null;
  });

  it("grants subscription credits when active payment query confirms payment", async () => {
    const { paymentRouter } = await import("./payment");
    const caller = paymentRouter.createCaller({
      user: { id: 9 },
      req: {},
      res: {},
    } as any);

    const result = await caller.queryPaymentStatus({ outTradeNo: "SUB-301" });

    expect(result.status).toBe("paid");
    expect(mocks.grantSubscriptionCreditsForOrder).toHaveBeenCalledTimes(1);
    expect(mocks.grantSubscriptionCreditsForOrder).toHaveBeenCalledWith(
      301,
      9,
      "basic",
      expect.any(Date)
    );
    const paidAt = mocks.updateOrderStatus.mock.calls[0][1]?.paidAt;
    expect(mocks.grantSubscriptionCreditsForOrder.mock.calls[0][3]).toEqual(
      paidAt
    );
  });

  it("uses the same order-scoped grant for the legacy Alipay notify route", async () => {
    const { paymentRouter } = await import("./payment");
    const caller = paymentRouter.createCaller({
      user: null,
      req: {},
      res: {},
    } as any);

    await caller.alipayNotify({
      out_trade_no: "SUB-301",
      trade_status: "TRADE_SUCCESS",
      trade_no: "ALI-301",
      sign: "valid",
    });

    expect(mocks.grantSubscriptionCreditsForOrder).toHaveBeenCalledWith(
      301,
      9,
      "basic",
      expect.any(Date)
    );
    const paidAt = mocks.updateOrderStatus.mock.calls[0][1]?.paidAt;
    expect(mocks.grantSubscriptionCreditsForOrder.mock.calls[0][3]).toEqual(
      paidAt
    );
  });

  it("repairs an already-paid subscription order when it is queried again", async () => {
    mocks.order.status = "paid";
    mocks.order.paidAt = "2026-07-17 11:15:00";
    const { paymentRouter } = await import("./payment");
    const caller = paymentRouter.createCaller({
      user: { id: 9 },
      req: {},
      res: {},
    } as any);

    const result = await caller.queryPaymentStatus({ outTradeNo: "SUB-301" });

    expect(result.status).toBe("paid");
    expect(mocks.grantSubscriptionCreditsForOrder).toHaveBeenCalledWith(
      301,
      9,
      "basic",
      new Date("2026-07-17T11:15:00.000Z")
    );
  });
});
