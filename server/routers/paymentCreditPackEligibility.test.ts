import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createOrder: vi.fn(async () => undefined),
  createAlipayPagePayment: vi.fn(async () => "<form></form>"),
  getUserSubscription: vi.fn(),
}));

vi.mock("../_core/alipay", () => ({
  createAlipayPagePayment: mocks.createAlipayPagePayment,
  queryAlipayOrder: vi.fn(),
  verifyAlipayCallback: vi.fn(),
}));

vi.mock("../wechatPay", () => ({
  createWechatH5Payment: vi.fn(),
  createWechatJsapiPayment: vi.fn(),
  queryWechatPayment: vi.fn(),
}));

vi.mock("../db", () => ({
  createOrder: mocks.createOrder,
  getOrderByOutTradeNo: vi.fn(),
  updateOrderStatus: vi.fn(),
  getUserSubscription: mocks.getUserSubscription,
}));

vi.mock("../paymentPricing", () => ({
  getPaymentProduct: vi.fn(async () => ({
    amountCents: 4900,
    credits: 500,
    name: "入门包",
    subject: "入门包",
    description: "购买 500 积分",
  })),
}));

vi.mock("../subscriptionGrant", () => ({
  grantSubscriptionCreditsForOrder: vi.fn(),
}));

describe("payment credit pack eligibility", () => {
  beforeEach(() => {
    mocks.createOrder.mockClear();
    mocks.createAlipayPagePayment.mockClear();
    mocks.getUserSubscription.mockReset();
  });

  it.each([
    ["no subscription", undefined],
    ["free plan", { plan: "free" }],
  ])("rejects a credit-pack order for %s", async (_case, subscription) => {
    mocks.getUserSubscription.mockResolvedValue(subscription);
    const { paymentRouter } = await import("./payment");
    const caller = paymentRouter.createCaller({
      user: { id: 9 },
      req: {},
      res: {},
    } as any);

    await expect(
      caller.createOrder({
        type: "credits",
        planId: "pack_500",
        paymentMethod: "alipay",
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "积分包仅套餐会员可购买，开通套餐即可使用",
    });
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("allows subscription orders without an existing paid plan", async () => {
    mocks.getUserSubscription.mockResolvedValue(undefined);
    const { paymentRouter } = await import("./payment");
    const caller = paymentRouter.createCaller({
      user: { id: 9 },
      req: {},
      res: {},
    } as any);

    await expect(
      caller.createOrder({
        type: "subscription",
        planId: "basic",
        paymentMethod: "alipay",
      })
    ).resolves.toMatchObject({ paymentMethod: "alipay" });
    expect(mocks.createOrder).toHaveBeenCalledTimes(1);
  });
});
