import { and, eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, creditsTransactions, type InsertCreditsTransaction } from "../drizzle/schema";
import { getSubscriptionPlan } from "./pricingConfig";
import {
  calculateCreditDeduction,
  calculateFreeTrialGrant,
} from "./creditsPolicy";

/**
 * Credits Manager - Core logic for credits system
 */

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
  await ensureFreeTrialCredits(userId);
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

  const nextBalance = calculateCreditDeduction(
    {
      purchased: user.creditsPurchased,
      subscription: user.creditsSubscription,
    },
    amount
  );
  const newPurchased = nextBalance.purchased;
  const newSubscription = nextBalance.subscription;

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

export async function hasCreditCharge(
  relatedDiagnosisId: number,
  billingKey: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [existing] = await db
    .select({ id: creditsTransactions.id })
    .from(creditsTransactions)
    .where(
      and(
        eq(creditsTransactions.relatedDiagnosisId, relatedDiagnosisId),
        eq(creditsTransactions.billingKey, billingKey),
        eq(creditsTransactions.type, "consume")
      )
    )
    .limit(1);

  return Boolean(existing);
}

export async function refundDiagnosisFullIfCharged(
  relatedDiagnosisId: number
): Promise<{ refunded: boolean; amount: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async tx => {
    const [charge] = await tx
      .select({
        id: creditsTransactions.id,
        userId: creditsTransactions.userId,
        amount: creditsTransactions.amount,
      })
      .from(creditsTransactions)
      .where(
        and(
          eq(creditsTransactions.relatedDiagnosisId, relatedDiagnosisId),
          eq(creditsTransactions.billingKey, "diagnosis_full"),
          eq(creditsTransactions.type, "consume")
        )
      )
      .limit(1);

    if (!charge) {
      return { refunded: false, amount: 0 };
    }

    const [existingRefund] = await tx
      .select({ id: creditsTransactions.id })
      .from(creditsTransactions)
      .where(
        and(
          eq(creditsTransactions.relatedDiagnosisId, relatedDiagnosisId),
          eq(creditsTransactions.billingKey, "refund:diagnosis_full"),
          eq(creditsTransactions.type, "refund")
        )
      )
      .limit(1);

    if (existingRefund) {
      return { refunded: false, amount: 0 };
    }

    const refundAmount = Math.abs(charge.amount);
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, charge.userId))
      .limit(1);
    if (!user) throw new Error("User not found");

    const nextPurchased = user.creditsPurchased + refundAmount;
    await tx
      .update(users)
      .set({ creditsPurchased: nextPurchased })
      .where(eq(users.id, charge.userId));

    await tx.insert(creditsTransactions).values({
      userId: charge.userId,
      type: "refund",
      amount: refundAmount,
      balancePurchased: nextPurchased,
      balanceSubscription: user.creditsSubscription,
      description: `诊断失败退回 - Diagnosis #${relatedDiagnosisId}`,
      relatedDiagnosisId,
      billingKey: "refund:diagnosis_full",
    });

    return { refunded: true, amount: refundAmount };
  });
}

export async function deductCreditsOnce(
  userId: number,
  amount: number,
  description: string,
  relatedDiagnosisId: number,
  billingKey: string
): Promise<{
  success: boolean;
  charged: boolean;
  remaining: { purchased: number; subscription: number; total: number };
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async tx => {
    const [existing] = await tx
      .select({ id: creditsTransactions.id })
      .from(creditsTransactions)
      .where(
        and(
          eq(creditsTransactions.relatedDiagnosisId, relatedDiagnosisId),
          eq(creditsTransactions.billingKey, billingKey),
          eq(creditsTransactions.type, "consume")
        )
      )
      .limit(1);

    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error("User not found");

    if (existing) {
      return {
        success: true,
        charged: false,
        remaining: {
          purchased: user.creditsPurchased,
          subscription: user.creditsSubscription,
          total: user.creditsPurchased + user.creditsSubscription,
        },
      };
    }

    if (user.creditsPurchased + user.creditsSubscription < amount) {
      return {
        success: false,
        charged: false,
        remaining: {
          purchased: user.creditsPurchased,
          subscription: user.creditsSubscription,
          total: user.creditsPurchased + user.creditsSubscription,
        },
      };
    }

    const nextBalance = calculateCreditDeduction(
      {
        purchased: user.creditsPurchased,
        subscription: user.creditsSubscription,
      },
      amount
    );

    await tx
      .update(users)
      .set({
        creditsPurchased: nextBalance.purchased,
        creditsSubscription: nextBalance.subscription,
      })
      .where(eq(users.id, userId));

    await tx.insert(creditsTransactions).values({
      userId,
      type: "consume",
      amount: -amount,
      balancePurchased: nextBalance.purchased,
      balanceSubscription: nextBalance.subscription,
      description,
      relatedDiagnosisId,
      billingKey,
    });

    return {
      success: true,
      charged: true,
      remaining: {
        purchased: nextBalance.purchased,
        subscription: nextBalance.subscription,
        total: nextBalance.purchased + nextBalance.subscription,
      },
    };
  });
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

  const planCredits = (await getSubscriptionPlan(plan)).monthlyCredits;

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
      // 免费用户使用一次性体验额度，不参与月度重置。
      await ensureFreeTrialCredits(userId);
    } else {
      // 付费用户：按套餐重置积分
      await resetSubscriptionCredits(userId, plan);
    }
  }
}

export async function ensureFreeTrialCredits(userId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) throw new Error("User not found");
  if (user.trialCreditsGranted === 1) return;

  const { getUserSubscription } = await import("./db");
  const subscription = await getUserSubscription(userId);
  if (subscription?.plan && subscription.plan !== "free") return;

  const trial = calculateFreeTrialGrant(
    user.trialCreditsGranted === 1,
    user.creditsSubscription
  );
  if (!trial.markGranted) return;

  await db
    .update(users)
    .set({
      creditsSubscription: trial.balance,
      trialCreditsGranted: 1,
    })
    .where(eq(users.id, userId));

  await recordTransaction({
    userId,
    type: "subscription_grant",
    amount: trial.grant,
    balancePurchased: user.creditsPurchased,
    balanceSubscription: trial.balance,
    description: "免费版一次性体验额度",
  });
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
