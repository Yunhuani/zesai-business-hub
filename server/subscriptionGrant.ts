import { and, eq } from "drizzle-orm";
import {
  creditsTransactions,
  users,
} from "../drizzle/schema";
import { createOrUpdateSubscription, getDb } from "./db";
import { toMySqlTimestamp } from "./lib/mysqlTimestamp";
import { getSubscriptionPlan } from "./pricingConfig";

const PAID_SUBSCRIPTION_PLANS = [
  "basic",
  "professional",
  "enterprise",
] as const;

type PaidSubscriptionPlan = (typeof PAID_SUBSCRIPTION_PLANS)[number];

function requirePaidSubscriptionPlan(plan: string): PaidSubscriptionPlan {
  if (!PAID_SUBSCRIPTION_PLANS.includes(plan as PaidSubscriptionPlan)) {
    throw new Error(`Unsupported paid subscription plan: ${plan}`);
  }
  return plan as PaidSubscriptionPlan;
}

export async function grantSubscriptionCreditsForOrder(
  orderId: number,
  userId: number,
  plan: string,
  paidAt: Date
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const subscriptionPlan = requirePaidSubscriptionPlan(plan);
  if (!Number.isInteger(orderId) || orderId <= 0) {
    throw new Error(`Invalid subscription order id: ${orderId}`);
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error(`Invalid subscription user id: ${userId}`);
  }
  if (Number.isNaN(paidAt.getTime())) {
    throw new Error("Invalid subscription paid time");
  }

  return db.transaction(async tx => {
    const [existingGrant] = await tx
      .select({ id: creditsTransactions.id })
      .from(creditsTransactions)
      .where(
        and(
          eq(creditsTransactions.type, "subscription_grant"),
          eq(creditsTransactions.relatedOrderId, orderId)
        )
      )
      .limit(1);
    if (existingGrant) return false;

    const planConfig = await getSubscriptionPlan(subscriptionPlan, tx);
    const [user] = await tx
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!user) throw new Error(`User not found: ${userId}`);

    const endDate = new Date(
      paidAt.getTime() + planConfig.durationDays * 24 * 60 * 60 * 1000
    );
    const endTimestamp = toMySqlTimestamp(endDate);

    await createOrUpdateSubscription(
      {
        userId,
        plan: subscriptionPlan,
        price: planConfig.priceCents,
        endDate,
      },
      tx
    );

    await tx
      .update(users)
      .set({
        creditsSubscription: planConfig.monthlyCredits,
        creditsResetDate: endTimestamp,
      })
      .where(eq(users.id, userId));

    await tx.insert(creditsTransactions).values({
      userId,
      type: "subscription_grant",
      amount: planConfig.monthlyCredits,
      balancePurchased: user.creditsPurchased,
      balanceSubscription: planConfig.monthlyCredits,
      description: `订阅积分发放: ${subscriptionPlan} 套餐`,
      relatedOrderId: orderId,
      idempotencyKey: `subscription:${orderId}:grant`,
    });

    return true;
  });
}
