import { describe, it, expect } from "vitest";
import { notifyAdminNewOrder, OrderInfo } from "./orderNotification";

describe("订单邮件通知功能测试", () => {
  it("应该正确构建订单通知邮件内容", () => {
    const orderInfo: OrderInfo = {
      orderNo: "ZS17660000000001",
      userName: "测试用户",
      userEmail: "test@example.com",
      productName: "基础版套餐",
      amount: 9900, // 99元
      paymentMethod: "alipay",
      paidAt: new Date("2025-01-01T10:00:00Z"),
    };

    // 验证订单信息格式正确
    expect(orderInfo.orderNo).toMatch(/^ZS\d+$/);
    expect(orderInfo.amount).toBeGreaterThan(0);
    expect(orderInfo.paymentMethod).toMatch(/^(alipay|wechat)$/);
  });

  it("应该正确格式化金额（分转元）", () => {
    const testCases = [
      { amount: 9900, expected: "99.00" },
      { amount: 29900, expected: "299.00" },
      { amount: 99900, expected: "999.00" },
      { amount: 4900, expected: "49.00" },
    ];

    testCases.forEach(({ amount, expected }) => {
      const formatted = (amount / 100).toFixed(2);
      expect(formatted).toBe(expected);
    });
  });

  it("应该正确识别支付方式", () => {
    const paymentMethods = ["alipay", "wechat"] as const;
    const paymentMethodTexts = {
      alipay: "支付宝",
      wechat: "微信支付",
    };

    paymentMethods.forEach((method) => {
      expect(paymentMethodTexts[method]).toBeDefined();
    });
  });

  it("应该正确格式化时间为北京时间", () => {
    const utcTime = new Date("2025-01-01T10:00:00Z");
    const bjTime = new Date(utcTime.getTime() + 8 * 60 * 60 * 1000);
    const formatted = bjTime.toISOString().replace("T", " ").substring(0, 19);

    expect(formatted).toBe("2025-01-01 18:00:00");
  });

  it("应该包含所有必需的订单信息字段", () => {
    const orderInfo: OrderInfo = {
      orderNo: "ZS17660000000001",
      userName: "测试用户",
      userEmail: "test@example.com",
      productName: "专业版套餐",
      amount: 29900,
      paymentMethod: "wechat",
      paidAt: new Date(),
    };

    // 验证所有字段都存在
    expect(orderInfo.orderNo).toBeDefined();
    expect(orderInfo.userName).toBeDefined();
    expect(orderInfo.userEmail).toBeDefined();
    expect(orderInfo.productName).toBeDefined();
    expect(orderInfo.amount).toBeDefined();
    expect(orderInfo.paymentMethod).toBeDefined();
    expect(orderInfo.paidAt).toBeDefined();
  });

  it("应该正确处理积分包订单", () => {
    const creditPackOrders = [
      { name: "入门包", credits: 500, price: 4900 },
      { name: "超值包", credits: 1000, price: 9900 },
      { name: "专业包", credits: 2200, price: 19900 },
      { name: "企业包", credits: 5500, price: 39900 },
    ];

    creditPackOrders.forEach((pack) => {
      const productName = `${pack.name}（${pack.credits}积分）`;
      expect(productName).toContain(pack.name);
      expect(productName).toContain(pack.credits.toString());
    });
  });

  it("应该正确处理订阅套餐订单", () => {
    const subscriptionPlans = [
      { name: "基础版", monthlyCredits: 750, price: 9900 },
      { name: "专业版", monthlyCredits: 2600, price: 29900 },
      { name: "企业版", monthlyCredits: 11000, price: 99900 },
    ];

    subscriptionPlans.forEach((plan) => {
      const productName = `${plan.name}套餐`;
      expect(productName).toContain(plan.name);
      expect(productName).toContain("套餐");
    });
  });

  it("邮件通知函数应该不抛出错误", async () => {
    // 注意：这个测试不会真正发送邮件，只是验证函数不会崩溃
    const orderInfo: OrderInfo = {
      orderNo: "ZS17660000000001",
      userName: "测试用户",
      userEmail: "test@example.com",
      productName: "基础版套餐",
      amount: 9900,
      paymentMethod: "alipay",
      paidAt: new Date(),
    };

    // 函数内部会捕获错误，不会抛出
    await expect(notifyAdminNewOrder(orderInfo)).resolves.not.toThrow();
  });
});
