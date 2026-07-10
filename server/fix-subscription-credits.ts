/**
 * 批量补发订阅积分脚本
 * 修复支付成功但积分未到账的问题
 */

import { getDb } from "./db";
import { resetSubscriptionCredits } from "./creditsManager";
import { getSubscriptionPlan } from "./pricingConfig";
import { eq } from "drizzle-orm";
import { users, orders } from "../drizzle/schema";

async function fixSubscriptionCredits() {
  console.log("开始修复订阅积分问题...\n");

  const db = await getDb();
  if (!db) {
    console.error("数据库连接失败");
    return;
  }

  // 查询所有已支付的订阅订单
  const paidOrders = await db
    .select({
      orderId: orders.id,
      userId: orders.userId,
      outTradeNo: orders.outTradeNo,
      plan: orders.plan,
      amount: orders.amount,
      paidAt: orders.paidAt,
    })
    .from(orders)
    .where(eq(orders.status, "paid"))
    .execute();

  // 过滤出订阅订单（排除积分包订单）
  const subscriptionOrders = paidOrders.filter(
    (order) => order.plan === "basic" || order.plan === "professional" || order.plan === "enterprise"
  );

  console.log(`找到 ${subscriptionOrders.length} 个已支付的订阅订单\n`);

  let fixedCount = 0;
  let skippedCount = 0;

  for (const order of subscriptionOrders) {
    try {
      // 获取用户当前积分
      const [user] = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);

      if (!user) {
        console.log(`❌ 用户不存在: userId=${order.userId}`);
        continue;
      }

      const expectedCredits = (await getSubscriptionPlan(order.plan)).monthlyCredits;
      const currentCredits = user.creditsSubscription;

      console.log(`\n订单: ${order.outTradeNo}`);
      console.log(`用户ID: ${user.id}`);
      console.log(`套餐: ${order.plan}`);
      console.log(`当前积分: ${currentCredits}`);
      console.log(`应有积分: ${expectedCredits}`);

      // 如果当前积分已经正确，跳过
      if (currentCredits === expectedCredits) {
        console.log(`✅ 积分正确，无需修复`);
        skippedCount++;
        continue;
      }

      // 补发积分
      await resetSubscriptionCredits(order.userId, order.plan);
      console.log(`✅ 积分已补发: ${currentCredits} → ${expectedCredits}`);
      fixedCount++;
    } catch (error) {
      console.error(`❌ 处理订单失败: ${order.outTradeNo}`, error);
    }
  }

  console.log(`\n\n修复完成！`);
  console.log(`总订单数: ${subscriptionOrders.length}`);
  console.log(`已修复: ${fixedCount}`);
  console.log(`已跳过: ${skippedCount}`);
}

// 执行修复
fixSubscriptionCredits()
  .then(() => {
    console.log("\n脚本执行完成");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n脚本执行失败:", error);
    process.exit(1);
  });
