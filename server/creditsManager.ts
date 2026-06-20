import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, creditsTransactions, type InsertCreditsTransaction } from "../drizzle/schema";

/**
 * Credits Manager - Core logic for credits system
 */

// Credits cost for different operations
export const CREDITS_COST = {
  BASIC_CHAT: 10,
  DEEP_CHAT: 20,
  DOCUMENT_ANALYSIS: 30,
  EXPORT_PPT: 50,
  EXPORT_PDF: 30,
  CHART_GENERATION: 20,
} as const;

// Credits included in each plan per month
export const PLAN_CREDITS = {
  free: 100,
  basic: 750,
  professional: 2600,
  enterprise: 11000,
} as const;

/**
 * Get user's total available credits
 */
export async function getUserCredits(userId: number): Promise<{
  purchased: number;
  subscription: number;
  total: number;
  free: number;
  resetDate: Date;
  nextResetIn: number; // seconds until next reset
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  // Calculate time until next reset
  const now = new Date();
  const resetDate = new Date(user.creditsResetDate);
  const nextResetIn = Math.max(0, Math.floor((resetDate.getTime() - now.getTime()) / 1000));

  // Free credits are always 0 for now (can be extended later)
  const freeCredits = 0;

  return {
    purchased: user.creditsPurchased,
    subscription: user.creditsSubscription,
    total: user.creditsPurchased + user.creditsSubscription + freeCredits,
    free: freeCredits,
    resetDate: user.creditsResetDate,
    nextResetIn,
  };
}

/**
 * Check if user has enough credits
 */
export async function checkCredits(userId: number, requiredCredits: number): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits.total >= requiredCredits;
}

/**
 * Deduct credits from user account
 * Priority: purchased credits → subscription credits
 */
export async function deductCredits(
  userId: number,
  amount: number,
  description: string
): Promise<{
  success: boolean;
  remaining: { purchased: number; subscription: number; total: number };
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current credits
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const totalCredits = user.creditsPurchased + user.creditsSubscription;
  if (totalCredits < amount) {
    return {
      success: false,
      remaining: {
        purchased: user.creditsPurchased,
        subscription: user.creditsSubscription,
        total: totalCredits,
      },
    };
  }

  // Deduct from purchased credits first
  let newPurchased = user.creditsPurchased;
  let newSubscription = user.creditsSubscription;

  if (newPurchased >= amount) {
    newPurchased -= amount;
  } else {
    const remaining = amount - newPurchased;
    newPurchased = 0;
    newSubscription -= remaining;
  }

  // Update user credits
  await db
    .update(users)
    .set({
      creditsPurchased: newPurchased,
      creditsSubscription: newSubscription,
    })
    .where(eq(users.id, userId));

  // Record transaction
  await recordTransaction({
    userId,
    type: "consume",
    amount: -amount,
    balancePurchased: newPurchased,
    balanceSubscription: newSubscription,
    description,
  });

  return {
    success: true,
    remaining: {
      purchased: newPurchased,
      subscription: newSubscription,
      total: newPurchased + newSubscription,
    },
  };
}

/**
 * Add purchased credits to user account
 * Has deduplication: if orderId is provided and already has a purchase transaction, skip
 */
export async function addPurchasedCredits(
  userId: number,
  amount: number,
  orderId?: number
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Deduplication check: if orderId provided, check if credits already granted
  if (orderId) {
    const { and } = await import("drizzle-orm");
    const existing = await db.select().from(creditsTransactions).where(
      and(
        eq(creditsTransactions.relatedOrderId, orderId),
        eq(creditsTransactions.type, "purchase")
      )
    ).limit(1);
    if (existing.length > 0) {
      console.log(`[Credits] Skipping duplicate credit grant for orderId=${orderId}, already granted`);
      return false;
    }
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const newPurchased = user.creditsPurchased + amount;

  await db
    .update(users)
    .set({
      creditsPurchased: newPurchased,
    })
    .where(eq(users.id, userId));

  await recordTransaction({
    userId,
    type: "purchase",
    amount,
    balancePurchased: newPurchased,
    balanceSubscription: user.creditsSubscription,
    description: `购买积分: ${amount}积分`,
    relatedOrderId: orderId,
  });

  console.log(`[Credits] Granted ${amount} credits to user ${userId} for order ${orderId}`);
  return true;
}

/**
 * Reset subscription credits (called monthly)
 */
export async function resetSubscriptionCredits(userId: number, plan: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");

  const planCredits = PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] || 100;

  // Calculate next reset date (1 month from now)
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);

  await db
    .update(users)
    .set({
      creditsSubscription: planCredits,
      creditsResetDate: nextResetDate,
    })
    .where(eq(users.id, userId));

  await recordTransaction({
    userId,
    type: "subscription_grant",
    amount: planCredits,
    balancePurchased: user.creditsPurchased,
    balanceSubscription: planCredits,
    description: `订阅积分重置: ${plan} 套餐`,
  });
}

/**
 * Check and reset subscription credits if needed
 */
export async function checkAndResetCredits(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  const now = new Date();
  const resetDate = new Date(user.creditsResetDate);

  if (now >= resetDate) {
    // 从订阅表获取实际订阅状态
    const { getUserSubscription } = await import("./db");
    const subscription = await getUserSubscription(userId);
    const plan = subscription?.plan || "free";
    
    if (plan === "free") {
      // 过期用户或未订阅用户：订阅积分清零（不给100试用积分）
      await clearSubscriptionCredits(userId);
    } else {
      // 付费用户：按套餐重置积分
      await resetSubscriptionCredits(userId, plan);
    }
  }
}

/**
 * Clear subscription credits to zero (for expired/downgraded users)
 */
export async function clearSubscriptionCredits(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return;

  // 设置下次重置日期为1个月后
  const nextResetDate = new Date();
  nextResetDate.setMonth(nextResetDate.getMonth() + 1);

  await db
    .update(users)
    .set({
      creditsSubscription: 0,
      creditsResetDate: nextResetDate,
    })
    .where(eq(users.id, userId));

  await recordTransaction({
    userId,
    type: "subscription_grant",
    amount: 0,
    balancePurchased: user.creditsPurchased,
    balanceSubscription: 0,
    description: `订阅已过期，订阅积分清零`,
  });
}

/**
 * Record a credits transaction
 */
async function recordTransaction(transaction: InsertCreditsTransaction): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(creditsTransactions).values(transaction);
}

/**
 * Get user's transaction history
 */
export async function getTransactionHistory(
  userId: number,
  options: { limit?: number; offset?: number } = {}
): Promise<typeof creditsTransactions.$inferSelect[]> {
  const { desc } = await import("drizzle-orm");
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { limit = 50, offset = 0 } = options;

  return await db
    .select()
    .from(creditsTransactions)
    .where(eq(creditsTransactions.userId, userId))
    .orderBy(desc(creditsTransactions.createdAt))
    .limit(limit)
    .offset(offset);
}
