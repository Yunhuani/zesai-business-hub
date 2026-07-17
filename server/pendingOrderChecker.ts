/**
 * 定时补偿任务：扫描pending订单，主动查询支付宝/微信支付状态
 * 作为notify回调的兜底保障
 */
import { queryAlipayOrder } from "./_core/alipay";
import { getDb, updateOrderStatus, getUserById } from "./db";
import { addPurchasedCredits, clearSubscriptionCredits } from "./creditsManager";
import { notifyAdminNewOrder } from "./orderNotification";
import { getCreditPack, getSubscriptionPlan } from "./pricingConfig";
import { grantSubscriptionCreditsForOrder } from "./subscriptionGrant";
import { toMySqlTimestamp } from "./lib/mysqlTimestamp";

function normalizePaymentMethod(paymentMethod: string | null | undefined): "alipay" | "wechat" {
  if (paymentMethod === "wechat") return "wechat";
  if (paymentMethod && paymentMethod !== "alipay") {
    console.warn(`[PendingChecker] Unexpected payment method "${paymentMethod}", using alipay for notification`);
  }
  return "alipay";
}

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
        sql`${orders.createdAt} > ${toMySqlTimestamp(cutoff)}`
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
      const paidAt = new Date();

      // 更新订单状态
      await updateOrderStatus(order.outTradeNo, {
        status: "paid",
        tradeNo: result.tradeNo,
        paidAt,
      });

      // 发放权益
      let subscriptionConfig;
      try {
        subscriptionConfig = await getSubscriptionPlan(order.plan);
      } catch {}

      let packId = order.plan;
      if (order.plan.startsWith("pack_") && order.plan.includes("_", 5)) {
        const parts = order.plan.split("_");
        if (parts.length >= 2) {
          packId = `${parts[0]}_${parts[1]}`;
        }
      }
      let creditPackConfig;
      try {
        creditPackConfig = await getCreditPack(packId);
      } catch {}

      if (subscriptionConfig) {
        await grantSubscriptionCreditsForOrder(
          order.id,
          order.userId,
          order.plan,
          paidAt
        );
        console.log(`[PendingChecker] Subscription credits granted for user ${order.userId}`);

        // 发送通知
        const user = await getUserById(order.userId);
        if (user) {
          await notifyAdminNewOrder({
            orderNo: order.outTradeNo,
            userName: user.name || "",
            userEmail: user.email || "",
            productName: `${subscriptionConfig.name}套餐`,
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
        status: "cancelled",
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

/**
 * 扫描已支付但未发放积分的订单，自动补发
 */
async function checkPaidButUndeliveredOrders() {
  try {
    const db = await getDb();
    if (!db) return;

    const { orders, creditsTransactions } = await import("../drizzle/schema");
    const { eq, and, sql, notInArray } = await import("drizzle-orm");

    // 查找所有积分包类型的已支付订单
    const paidPackOrders = await db.select().from(orders).where(
      and(
        eq(orders.status, "paid"),
        sql`${orders.plan} LIKE 'pack_%'`
      )
    );

    if (paidPackOrders.length === 0) return;

    // 查找已经发放过积分的订单ID
    const deliveredTxns = await db.select({ orderId: creditsTransactions.relatedOrderId }).from(creditsTransactions).where(
      eq(creditsTransactions.type, "purchase")
    );
    const deliveredOrderIds = new Set(deliveredTxns.map(t => t.orderId).filter(Boolean));

    // 找出未发放积分的订单
    const undelivered = paidPackOrders.filter(o => !deliveredOrderIds.has(o.id));

    if (undelivered.length === 0) return;

    console.log(`[PendingChecker] Found ${undelivered.length} paid but undelivered credit pack orders`);

    for (const order of undelivered) {
      let packId = order.plan;
      if (order.plan.startsWith("pack_") && order.plan.includes("_", 5)) {
        const parts = order.plan.split("_");
        if (parts.length >= 2) {
          packId = `${parts[0]}_${parts[1]}`;
        }
      }
      let creditPackConfig;
      try {
        creditPackConfig = await getCreditPack(packId);
      } catch {}
      if (creditPackConfig) {
        const granted = await addPurchasedCredits(order.userId, creditPackConfig.credits, order.id);
        if (granted) {
          console.log(`[PendingChecker] Auto-delivered ${creditPackConfig.credits} credits for order ${order.outTradeNo} (user ${order.userId})`);
          const user = await getUserById(order.userId);
          if (user) {
            await notifyAdminNewOrder({
              orderNo: order.outTradeNo,
              userName: user.name || "",
              userEmail: user.email || "",
              productName: `${creditPackConfig.name}（${creditPackConfig.credits}积分）[补发]`,
              amount: order.amount,
              paymentMethod: normalizePaymentMethod(order.paymentMethod),
              paidAt: order.paidAt ? new Date(order.paidAt) : new Date(),
            });
          }
        }
      } else {
        console.warn(`[PendingChecker] Unknown pack config for plan=${order.plan}, packId=${packId}`);
      }
    }
  } catch (error) {
    console.error("[PendingChecker] Error in checkPaidButUndeliveredOrders:", error);
  }
}

export const SUBSCRIPTION_GRANT_COMPENSATION_CUTOFF = new Date(
  "2026-07-17T10:59:05.000Z"
);

const PAID_SUBSCRIPTION_PLANS = [
  "basic",
  "professional",
  "enterprise",
] as const;

function parseStoredTimestamp(value: string | Date): Date {
  if (value instanceof Date) return value;
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(`${value.replace(" ", "T")}Z`);
  }
  return new Date(value);
}

export async function checkPaidButUndeliveredSubscriptionOrders() {
  try {
    const db = await getDb();
    if (!db) return;

    const { orders, creditsTransactions } = await import("../drizzle/schema");
    const { and, eq, gte, inArray } = await import("drizzle-orm");
    const paidSubscriptionOrders = await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.status, "paid"),
          inArray(orders.plan, [...PAID_SUBSCRIPTION_PLANS]),
          gte(
            orders.createdAt,
            toMySqlTimestamp(SUBSCRIPTION_GRANT_COMPENSATION_CUTOFF)
          )
        )
      );

    const eligibleOrders = paidSubscriptionOrders.filter(order => {
      const createdAt = parseStoredTimestamp(order.createdAt);
      return (
        order.status === "paid" &&
        PAID_SUBSCRIPTION_PLANS.includes(
          order.plan as (typeof PAID_SUBSCRIPTION_PLANS)[number]
        ) &&
        createdAt >= SUBSCRIPTION_GRANT_COMPENSATION_CUTOFF
      );
    });
    if (eligibleOrders.length === 0) return;

    const deliveredTransactions = await db
      .select({ orderId: creditsTransactions.relatedOrderId })
      .from(creditsTransactions)
      .where(
        and(
          eq(creditsTransactions.type, "subscription_grant"),
          inArray(
            creditsTransactions.relatedOrderId,
            eligibleOrders.map(order => order.id)
          )
        )
      );
    const deliveredOrderIds = new Set(
      deliveredTransactions
        .map(transaction => transaction.orderId)
        .filter((orderId): orderId is number => orderId !== null)
    );

    const undeliveredOrders = eligibleOrders.filter(
      order => !deliveredOrderIds.has(order.id)
    );
    if (undeliveredOrders.length === 0) return;

    console.log(
      `[PendingChecker] Found ${undeliveredOrders.length} paid but undelivered subscription orders`
    );

    for (const order of undeliveredOrders) {
      try {
        if (!order.paidAt) {
          console.warn(
            `[PendingChecker] Subscription order ${order.outTradeNo} is paid without paidAt, skipping`
          );
          continue;
        }
        const granted = await grantSubscriptionCreditsForOrder(
          order.id,
          order.userId,
          order.plan,
          parseStoredTimestamp(order.paidAt)
        );
        if (granted) {
          console.log(
            `[PendingChecker] Auto-delivered subscription credits for order ${order.outTradeNo} (user ${order.userId})`
          );
        }
      } catch (error) {
        console.error(
          `[PendingChecker] Error compensating subscription order ${order.outTradeNo}:`,
          error
        );
      }
    }
  } catch (error) {
    console.error(
      "[PendingChecker] Error in checkPaidButUndeliveredSubscriptionOrders:",
      error
    );
  }
}

/**
 * 定时检查过期订阅，自动降级为免费版并清零订阅积分
 */
async function checkExpiredSubscriptions() {
  try {
    const db = await getDb();
    if (!db) return;

    const { subscriptions, users: usersTable } = await import("../drizzle/schema");
    const { eq, and, sql } = await import("drizzle-orm");

    // 查找所有已过期但status仍为active的订阅
    const now = toMySqlTimestamp();
    const expiredSubs = await db.select().from(subscriptions).where(
      and(
        eq(subscriptions.status, "active"),
        sql`${subscriptions.endDate} < ${now}`
      )
    );

    if (expiredSubs.length === 0) return;

    console.log(`[SubscriptionChecker] Found ${expiredSubs.length} expired subscriptions`);

    for (const sub of expiredSubs) {
      try {
        // 将订阅状态改为expired
        await db.update(subscriptions)
          .set({ status: "expired" })
          .where(eq(subscriptions.id, sub.id));

        // 清零该用户的订阅积分
        await clearSubscriptionCredits(sub.userId);

        console.log(`[SubscriptionChecker] User ${sub.userId} subscription expired: ${sub.plan} -> free, credits cleared`);
      } catch (error) {
        console.error(`[SubscriptionChecker] Error processing expired subscription for user ${sub.userId}:`, error);
      }
    }
  } catch (error) {
    console.error("[SubscriptionChecker] Error in checkExpiredSubscriptions:", error);
  }
}

const SUBSCRIPTION_CHECK_INTERVAL = 60 * 60 * 1000; // 1小时
let intervalId: ReturnType<typeof setInterval> | null = null;
let subscriptionIntervalId: ReturnType<typeof setInterval> | null = null;

export function startPendingOrderChecker() {
  if (intervalId) {
    console.log("[PendingChecker] Already running");
    return;
  }

  console.log(`[PendingChecker] Starting, check interval: ${CHECK_INTERVAL / 1000}s`);

  // 启动后延迟30秒执行第一次检查（等数据库连接就绪）
  setTimeout(() => {
    checkPendingOrders();
    checkPaidButUndeliveredOrders();
    checkPaidButUndeliveredSubscriptionOrders();
    checkExpiredSubscriptions(); // 启动时也检查一次过期订阅
    intervalId = setInterval(() => {
      checkPendingOrders();
      checkPaidButUndeliveredOrders();
      checkPaidButUndeliveredSubscriptionOrders();
    }, CHECK_INTERVAL);
    // 过期订阅每小时检查一次
    subscriptionIntervalId = setInterval(() => {
      checkExpiredSubscriptions();
    }, SUBSCRIPTION_CHECK_INTERVAL);
  }, 30000);
}

export function stopPendingOrderChecker() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  if (subscriptionIntervalId) {
    clearInterval(subscriptionIntervalId);
    subscriptionIntervalId = null;
  }
  console.log("[PendingChecker] Stopped");
}
