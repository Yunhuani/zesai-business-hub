/**
 * 一次性补发脚本：扫描所有已paid的积分包订单，补发未发放的积分
 */
import { drizzle } from 'drizzle-orm/mysql2';
import { eq, and, sql } from 'drizzle-orm';

const CREDIT_PACK_CONFIG = {
  pack_500: { name: "入门包", credits: 500, price: 4900 },
  pack_1200: { name: "超值包", credits: 1200, price: 9900 },
  pack_3000: { name: "专业包", credits: 3000, price: 19900 },
  pack_8000: { name: "企业包", credits: 8000, price: 39900 },
};

async function main() {
  const db = drizzle(process.env.DATABASE_URL);

  // 1. 查找所有已支付的积分包订单
  const paidPackOrders = await db.execute(
    "SELECT o.id, o.userId, o.outTradeNo, o.plan, o.amount, o.paidAt FROM orders o WHERE o.status='paid' AND o.plan LIKE 'pack_%' ORDER BY o.createdAt DESC"
  );
  console.log(`\n=== 已支付积分包订单: ${paidPackOrders[0].length} 笔 ===`);

  // 2. 查找已发放积分的订单ID
  const deliveredTxns = await db.execute(
    "SELECT relatedOrderId FROM creditsTransactions WHERE type='purchase' AND relatedOrderId IS NOT NULL"
  );
  const deliveredOrderIds = new Set(deliveredTxns[0].map(t => t.relatedOrderId));

  // 3. 找出未发放的订单
  const undelivered = paidPackOrders[0].filter(o => !deliveredOrderIds.has(o.id));
  console.log(`\n=== 未发放积分的订单: ${undelivered.length} 笔 ===`);

  if (undelivered.length === 0) {
    console.log("所有订单积分已发放，无需补发。");
    process.exit(0);
  }

  for (const order of undelivered) {
    let packId = order.plan;
    if (order.plan.startsWith('pack_') && order.plan.includes('_', 5)) {
      const parts = order.plan.split('_');
      if (parts.length >= 2) {
        packId = `${parts[0]}_${parts[1]}`;
      }
    }

    const config = CREDIT_PACK_CONFIG[packId];
    if (!config) {
      console.log(`  ⚠ 订单 ${order.outTradeNo} (plan=${order.plan}) 无匹配配置，跳过`);
      continue;
    }

    // 获取用户当前积分
    const userResult = await db.execute(`SELECT id, email, creditsPurchased, creditsSubscription FROM users WHERE id=${order.userId}`);
    const user = userResult[0][0];
    if (!user) {
      console.log(`  ⚠ 用户 ${order.userId} 不存在，跳过`);
      continue;
    }

    const newPurchased = user.creditsPurchased + config.credits;

    // 更新积分
    await db.execute(`UPDATE users SET creditsPurchased=${newPurchased} WHERE id=${order.userId}`);

    // 记录交易
    await db.execute(
      `INSERT INTO creditsTransactions (userId, type, amount, balancePurchased, balanceSubscription, description, relatedOrderId) VALUES (${order.userId}, 'purchase', ${config.credits}, ${newPurchased}, ${user.creditsSubscription}, '购买积分: ${config.credits}积分 [补发]', ${order.id})`
    );

    console.log(`  ✅ 补发 ${config.credits} 积分给用户 ${user.email} (订单 ${order.outTradeNo}, plan=${order.plan})`);
  }

  console.log("\n=== 补发完成 ===");

  // 验证结果
  for (const order of undelivered) {
    const userResult = await db.execute(`SELECT email, creditsPurchased, creditsSubscription FROM users WHERE id=${order.userId}`);
    const user = userResult[0][0];
    if (user) {
      console.log(`  用户 ${user.email}: purchased=${user.creditsPurchased}, subscription=${user.creditsSubscription}, total=${user.creditsPurchased + user.creditsSubscription}`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
