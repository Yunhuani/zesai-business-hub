/**
 * 定时补偿任务：扫描pending订单，主动查询支付宝/微信支付状态
 * 作为notify回调的兜底保障
 */
import { queryAlipayOrder } from "./_core/alipay";
import { getDb, updateOrderStatus, createOrUpdateSubscription, getUserById } from "./db";
import { resetSubscriptionCredits, addPurchasedCredits } from "./creditsManager";
import { notifyAdminNewOrder } from "./orderNotification";

const PLAN_CONFIG: Record<string, { monthlyCredits: number; price: number; duration: number }> = {
  basic: { monthlyCredits: 750, price: 9900, duration: 30 },
  professional: { monthlyCredits: 2600, price: 29900, duration: 30 },
  enterprise: { monthlyCredits: 11000, price: 99900, duration: 30 },
};

const CREDIT_PACK_CONFIG: Record<string, { name: string; credits: number; price: number }> = {
  pack_500: { name: "入门包", credits: 500, price: 4900 },
  pack_1000: { name: "超值包", credits: 1000, price: 9900 },
  pack_2200: { name: "专业包", credits: 2200, price: 19900 },
  pack_5500: { name: "企业包", credits: 5500, price: 39900 },
};

const CHECK_INTERVAL = 5 * 60 * 1000; // 5分钟
const MAX_ORDER_AGE = 24 * 60 * 60 * 1000; // 只检查24小时内的订单

async function checkPendingOrders() {
  try {
    const db = await getDb();
    if (!db) {
      console.log("[PendingChecker] Database not available, skipping");
      return;
    }

    // 查询24小时内的pending订单
    const cutoff = new Date(Date.now() - MAX_ORDER_AGE);
    const { orders } = await import("../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");
    const pendingOrders = await db.select().from(orders).where(
      and(
        eq(orders.status, "pending"),
        sql`${orders.createdAt} > ${cutoff.toISOString()}`
      )
    );

    if (pendingOrders.length === 0) return;

    console.log(`[PendingChecker] Found ${pendingOrders.length} pending orders to check`);

    for (const order of pendingOrders) {
      try {
        if (order.paymentMethod === "alipay") {
          await checkAlipayOrder(order);
        }
        // 微信支付的补偿查询可以后续添加
      } catch (error) {
        console.error(`[PendingChecker] Error checking order ${order.outTradeNo}:`, error);
      }
    }
  } catch (error) {
    console.error("[PendingChecker] Error in checkPendingOrders:", error);
  }
}

async function checkAlipayOrder(order: any) {
  try {
    const result = await queryAlipayOrder(order.outTradeNo);

    if (result.tradeStatus === "TRADE_SUCCESS") {
      console.log(`[PendingChecker] Order ${order.outTradeNo} confirmed paid by Alipay`);

      // 更新订单状态
      await updateOrderStatus(order.outTradeNo, {
        status: "paid",
        tradeNo: result.tradeNo,
        paidAt: new Date(),
      });

      // 发放权益
      const subscriptionConfig = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];

      let packId = order.plan;
      if (order.plan.startsWith("pack_") && order.plan.includes("_", 5)) {
        const parts = order.plan.split("_");
        if (parts.length >= 2) {
          packId = `${parts[0]}_${parts[1]}`;
        }
      }
      const creditPackConfig = CREDIT_PACK_CONFIG[packId];

      if (subscriptionConfig) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + subscriptionConfig.duration);

        await createOrUpdateSubscription({
          userId: order.userId,
          plan: order.plan as any,
          price: subscriptionConfig.price,
          endDate,
        });

        await resetSubscriptionCredits(order.userId, order.plan);
        console.log(`[PendingChecker] Subscription credits granted for user ${order.userId}`);

        // 发送通知
        const user = await getUserById(order.userId);
        if (user) {
          await notifyAdminNewOrder({
            orderNo: order.outTradeNo,
            userName: user.name || "",
            userEmail: user.email || "",
            productName: `${subscriptionConfig.monthlyCredits === 750 ? "基础版" : subscriptionConfig.monthlyCredits === 2600 ? "专业版" : "企业版"}套餐`,
            amount: order.amount,
            paymentMethod: "alipay",
            paidAt: new Date(),
          });
        }
      } else if (creditPackConfig) {
        await addPurchasedCredits(order.userId, creditPackConfig.credits, order.id);
        console.log(`[PendingChecker] Credits ${creditPackConfig.credits} added for user ${order.userId}`);

        const user = await getUserById(order.userId);
        if (user) {
          await notifyAdminNewOrder({
            orderNo: order.outTradeNo,
            userName: user.name || "",
            userEmail: user.email || "",
            productName: `${creditPackConfig.name}（${creditPackConfig.credits}积分）`,
            amount: order.amount,
            paymentMethod: "alipay",
            paidAt: new Date(),
          });
        }
      }
    } else if (result.tradeStatus === "TRADE_CLOSED") {
      // 交易已关闭，更新订单状态
      await updateOrderStatus(order.outTradeNo, {
        status: "closed",
      });
      console.log(`[PendingChecker] Order ${order.outTradeNo} closed`);
    }
    // WAIT_BUYER_PAY 状态不处理，等待用户支付
  } catch (error: any) {
    // 交易不存在（用户未完成支付），忽略
    if (error.message?.includes("交易不存在")) {
      return;
    }
    throw error;
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startPendingOrderChecker() {
  if (intervalId) {
    console.log("[PendingChecker] Already running");
    return;
  }

  console.log(`[PendingChecker] Starting, check interval: ${CHECK_INTERVAL / 1000}s`);

  // 启动后延迟30秒执行第一次检查（等数据库连接就绪）
  setTimeout(() => {
    checkPendingOrders();
    intervalId = setInterval(checkPendingOrders, CHECK_INTERVAL);
  }, 30000);
}

export function stopPendingOrderChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("[PendingChecker] Stopped");
  }
}
