/**
 * 核心功能回归测试
 * 
 * 这些测试覆盖了最关键的用户流程，确保每次发布前核心功能正常工作。
 * 
 * 运行方式：
 * - 全部测试：pnpm test
 * - 单个文件：pnpm test regression
 * - 监听模式：pnpm test:watch
 */

import { describe, it, expect, beforeAll } from "vitest";

describe("核心功能回归测试", () => {
  describe("1. 数据库连接", () => {
    it("应该能连接到数据库", async () => {
      const { getDb } = await import("../db");
      const db = await getDb();
      expect(db).toBeDefined();
    });

    it("应该能查询users表", async () => {
      const { getDb } = await import("../db");
      const { users } = await import("../../drizzle/schema");
      const db = await getDb();
      
      if (!db) {
        throw new Error("Database not available");
      }

      const result = await db.select().from(users).limit(1);
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("2. 用户认证功能", () => {
    it("应该有用户查询函数", async () => {
      const { getUserByOpenId } = await import("../db");
      expect(typeof getUserByOpenId).toBe("function");
    });

    it("应该有用户创建/更新函数", async () => {
      const { upsertUser } = await import("../db");
      expect(typeof upsertUser).toBe("function");
    });
  });

  describe("3. 积分系统", () => {
    it("应该有积分查询函数", async () => {
      const { getUserCredits } = await import("../creditsManager");
      expect(typeof getUserCredits).toBe("function");
    });

    it("应该有积分扣除函数", async () => {
      const { deductCredits } = await import("../creditsManager");
      expect(typeof deductCredits).toBe("function");
    });

    it("应该有积分增加函数", async () => {
      const { addPurchasedCredits } = await import("../creditsManager");
      expect(typeof addPurchasedCredits).toBe("function");
    });

    it("积分查询应该返回正确格式", async () => {
      const { getUserCredits } = await import("../creditsManager");
      
      // 使用测试用户ID（假设ID=1存在）
      const credits = await getUserCredits(1);
      
      expect(credits).toHaveProperty("purchased");
      expect(credits).toHaveProperty("subscription");
      expect(credits).toHaveProperty("total");
      expect(typeof credits.total).toBe("number");
    });
  });

  describe("4. 支付功能", () => {
    it("应该有订单创建函数", async () => {
      const { createOrder } = await import("../db");
      expect(typeof createOrder).toBe("function");
    });

    it("应该有订单查询函数", async () => {
      const { getOrderByOutTradeNo } = await import("../db");
      expect(typeof getOrderByOutTradeNo).toBe("function");
    });

    it("应该有订单状态更新函数", async () => {
      const { updateOrderStatus } = await import("../db");
      expect(typeof updateOrderStatus).toBe("function");
    });

    it("支付宝配置应该正确", async () => {
      const { ENV } = await import("../_core/env");
      
      // 检查必要的支付宝配置
      expect(process.env.ALIPAY_APP_ID).toBeDefined();
      expect(process.env.ALIPAY_PRIVATE_KEY).toBeDefined();
      expect(process.env.ALIPAY_PUBLIC_KEY).toBeDefined();
    });
  });

  describe("5. 对话功能", () => {
    it("应该有对话创建函数", async () => {
      const { createConversation } = await import("../db");
      expect(typeof createConversation).toBe("function");
    });

    it("应该有消息保存函数", async () => {
      const { createMessage } = await import("../db");
      expect(typeof createMessage).toBe("function");
    });

    it("应该有对话历史查询函数", async () => {
      const { getUserConversations } = await import("../db");
      expect(typeof getUserConversations).toBe("function");
    });

    it("应该有LLM调用函数", async () => {
      const { invokeLLM } = await import("../_core/llm");
      expect(typeof invokeLLM).toBe("function");
    });
  });

  describe("6. 订阅管理", () => {
    it("应该有订阅创建/更新函数", async () => {
      const { createOrUpdateSubscription } = await import("../db");
      expect(typeof createOrUpdateSubscription).toBe("function");
    });

    it("应该有订阅查询函数", async () => {
      const { getUserSubscription } = await import("../db");
      expect(typeof getUserSubscription).toBe("function");
    });

    it("应该有订阅积分重置函数", async () => {
      const { resetSubscriptionCredits } = await import("../creditsManager");
      expect(typeof resetSubscriptionCredits).toBe("function");
    });
  });

  describe("7. 环境配置", () => {
    it("应该有必要的环境变量", async () => {
      const { ENV } = await import("../_core/env");
      
      // 检查关键环境变量
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(ENV.jwtSecret).toBeDefined();
      expect(ENV.ownerOpenId).toBeDefined();
    });

    it("数据库URL应该是有效格式", async () => {
      const { ENV } = await import("../_core/env");
      
      // 检查数据库URL格式
      expect(process.env.DATABASE_URL).toMatch(/^mysql:\/\//);
    });
  });

  describe("8. tRPC路由", () => {
    it("应该有auth路由", async () => {
      const { appRouter } = await import("../routers");
      expect(appRouter.auth).toBeDefined();
    });

    it("应该有system路由", async () => {
      const { appRouter } = await import("../routers");
      expect(appRouter.system).toBeDefined();
    });

    it("auth路由应该有me和logout", async () => {
      const { appRouter } = await import("../routers");
      expect(appRouter.auth.me).toBeDefined();
      expect(appRouter.auth.logout).toBeDefined();
    });
  });
});

describe("数据完整性测试", () => {
  it("用户表结构应该正确", async () => {
    const { users } = await import("../../drizzle/schema");
    
    // 检查必要字段
    expect(users.id).toBeDefined();
    expect(users.openId).toBeDefined();
    expect(users.name).toBeDefined();
    expect(users.email).toBeDefined();
    expect(users.role).toBeDefined();
  });

  it("订单表结构应该正确", async () => {
    const { orders } = await import("../../drizzle/schema");
    
    // 检查必要字段
    expect(orders.id).toBeDefined();
    expect(orders.userId).toBeDefined();
    expect(orders.outTradeNo).toBeDefined();
    expect(orders.plan).toBeDefined();
    expect(orders.amount).toBeDefined();
    expect(orders.status).toBeDefined();
  });

  it("积分交易表结构应该正确", async () => {
    const { creditsTransactions } = await import("../../drizzle/schema");
    
    // 检查必要字段
    expect(creditsTransactions.id).toBeDefined();
    expect(creditsTransactions.userId).toBeDefined();
    expect(creditsTransactions.amount).toBeDefined();
    expect(creditsTransactions.type).toBeDefined();
    expect(creditsTransactions.description).toBeDefined();
  });
});

describe("错误处理测试", () => {
  it("查询不存在的用户应该返回undefined", async () => {
    const { getUserByOpenId } = await import("../db");
    
    const user = await getUserByOpenId("non-existent-user-id-12345");
    expect(user).toBeUndefined();
  });

  it("查询不存在的订单应该返回undefined", async () => {
    const { getOrderByOutTradeNo } = await import("../db");
    
    const order = await getOrderByOutTradeNo("non-existent-order-12345");
    expect(order).toBeUndefined();
  });

  it("扣除超额积分应该抛出错误", async () => {
    const { deductCredits } = await import("../creditsManager");
    
    // 假设用户1存在但积分不足
    const result = await deductCredits(1, 999999, "测试扣除");
    expect(result.success).toBe(false);
  });
});
