import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, subscriptions, creditsTransactions } from "../drizzle/schema";
import { getSubscriptionPlan } from "./pricingConfig";
import { toMySqlTimestamp } from "./lib/mysqlTimestamp";

/**
 * Fix missing credits for users who paid but didn't receive credits
 * This script补发所有已支付但未到账的积分
 */

async function fixMissingCredits() {
  const db = await getDb();
  if (!db) {
    console.error("Database not available");
    process.exit(1);
  }

  console.log("🔍 查询需要补发积分的用户...\n");

  // Query users with active paid subscriptions but 0 credits
  const affectedUsers = await db
    .select({
      userId: users.id,
      email: users.email,
      name: users.name,
      currentCredits: users.creditsSubscription,
      plan: subscriptions.plan,
      subscriptionStatus: subscriptions.status,
      startDate: subscriptions.startDate,
      endDate: subscriptions.endDate,
    })
    .from(users)
    .innerJoin(subscriptions, eq(users.id, subscriptions.userId))
    .where(eq(subscriptions.status, "active"));

  // Filter users with paid plans but 0 credits
  const usersToFix = affectedUsers.filter(
    (user) =>
      ["basic", "professional", "enterprise"].includes(user.plan) &&
      user.currentCredits === 0
  );

  if (usersToFix.length === 0) {
    console.log("✅ 没有需要补发积分的用户");
    return;
  }

  console.log(`📊 发现 ${usersToFix.length} 个用户需要补发积分:\n`);

  for (const user of usersToFix) {
    const expectedCredits = (await getSubscriptionPlan(user.plan)).monthlyCredits;
    console.log(`用户ID: ${user.userId}`);
    console.log(`套餐: ${user.plan}`);
    console.log(`当前积分: ${user.currentCredits}`);
    console.log(`应有积分: ${expectedCredits}`);
    console.log(`订阅状态: ${user.subscriptionStatus}`);
    console.log(`订阅期限: ${user.startDate} - ${user.endDate}\n`);
  }

  console.log("🔧 开始补发积分...\n");

  let successCount = 0;
  let failCount = 0;

  for (const user of usersToFix) {
    try {
      const expectedCredits = (await getSubscriptionPlan(user.plan)).monthlyCredits;

      // Calculate next reset date (1 month from subscription start)
      const nextResetDate = new Date(user.startDate);
      nextResetDate.setMonth(nextResetDate.getMonth() + 1);

      // Update user credits
      await db
        .update(users)
        .set({
          creditsSubscription: expectedCredits,
          creditsResetDate: toMySqlTimestamp(nextResetDate),
        })
        .where(eq(users.id, user.userId));

      // Record transaction
      await db.insert(creditsTransactions).values({
        userId: user.userId,
        type: "subscription_grant",
        amount: expectedCredits,
        balancePurchased: 0, // Assuming 0 purchased credits
        balanceSubscription: expectedCredits,
        description: `补发订阅积分: ${user.plan} 套餐 (系统修复)`,
      });

      console.log(`✅ 成功补发: userId=${user.userId} - ${expectedCredits}积分`);
      successCount++;
    } catch (error) {
      console.error(`❌ 失败: userId=${user.userId}`, error);
      failCount++;
    }
  }

  console.log(`\n📊 补发完成:`);
  console.log(`   成功: ${successCount}个用户`);
  console.log(`   失败: ${failCount}个用户`);
}

fixMissingCredits()
  .then(() => {
    console.log("\n✅ 脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ 脚本执行失败:", error);
    process.exit(1);
  });
