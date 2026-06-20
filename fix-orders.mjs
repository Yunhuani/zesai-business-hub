/**
 * 主动查询支付宝订单状态并修复数据库
 * 用于处理notify回调未触发的情况
 */
import { AlipaySdk } from 'alipay-sdk';
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env') });

const ORDERS_TO_FIX = [
  { outTradeNo: 'ZS17738244816487350017', plan: 'pack_500', userId: 7350017, amount: 4900 },
  { outTradeNo: 'ZS17738244815499030001', plan: 'basic', userId: 9030001, amount: 9900 },
];

const CREDIT_PACK_CONFIG = {
  pack_500: { name: '入门包', credits: 500 },
  pack_1000: { name: '超值包', credits: 1000 },
  pack_2200: { name: '专业包', credits: 2200 },
  pack_5500: { name: '企业包', credits: 5500 },
};

const PLAN_CONFIG = {
  basic: { monthlyCredits: 750, duration: 30 },
  professional: { monthlyCredits: 2600, duration: 30 },
  enterprise: { monthlyCredits: 11000, duration: 30 },
};

async function main() {
  // Init Alipay SDK
  const alipaySdk = new AlipaySdk({
    appId: process.env.ALIPAY_APP_ID,
    privateKey: process.env.ALIPAY_PRIVATE_KEY,
    alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
    gateway: 'https://openapi.alipay.com/gateway.do',
    charset: 'utf-8',
    signType: 'RSA2',
  });

  // Init DB
  const db = await createConnection(process.env.DATABASE_URL);

  for (const order of ORDERS_TO_FIX) {
    console.log(`\n=== 查询订单: ${order.outTradeNo} ===`);
    
    try {
      // Query Alipay
      const result = await alipaySdk.exec('alipay.trade.query', {
        bizContent: { out_trade_no: order.outTradeNo },
      });
      
      console.log('支付宝返回:', JSON.stringify(result, null, 2));
      
      if (result.code === '10000' && result.tradeStatus === 'TRADE_SUCCESS') {
        console.log(`✅ 支付宝确认已支付，tradeNo: ${result.tradeNo}`);
        
        // Update order status
        await db.execute(
          `UPDATE orders SET status='paid', tradeNo=?, paidAt=NOW() WHERE outTradeNo=? AND status='pending'`,
          [result.tradeNo, order.outTradeNo]
        );
        console.log('✅ 订单状态已更新为 paid');

        // Handle credit pack
        if (order.plan.startsWith('pack_')) {
          const packConfig = CREDIT_PACK_CONFIG[order.plan];
          if (packConfig) {
            // Add purchased credits
            await db.execute(
              `INSERT INTO credit_transactions (userId, type, amount, description, createdAt)
               VALUES (?, 'purchase', ?, ?, NOW())
               ON DUPLICATE KEY UPDATE amount=amount`,
              [order.userId, packConfig.credits, `购买${packConfig.name}（${packConfig.credits}积分）`]
            );
            // Update user credits
            await db.execute(
              `UPDATE users SET purchasedCredits = COALESCE(purchasedCredits, 0) + ? WHERE id = ?`,
              [packConfig.credits, order.userId]
            );
            console.log(`✅ 已发放 ${packConfig.credits} 积分给用户 ${order.userId}`);
          }
        } else {
          // Handle subscription
          const planConfig = PLAN_CONFIG[order.plan];
          if (planConfig) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + planConfig.duration);
            
            // Upsert subscription
            await db.execute(
              `INSERT INTO subscriptions (userId, plan, status, startDate, endDate, createdAt, updatedAt)
               VALUES (?, ?, 'active', NOW(), ?, NOW(), NOW())
               ON DUPLICATE KEY UPDATE plan=?, status='active', endDate=?, updatedAt=NOW()`,
              [order.userId, order.plan, endDate, order.plan, endDate]
            );
            
            // Reset subscription credits
            await db.execute(
              `UPDATE users SET subscriptionCredits = ? WHERE id = ?`,
              [planConfig.monthlyCredits, order.userId]
            );
            console.log(`✅ 已开通 ${order.plan} 订阅，发放 ${planConfig.monthlyCredits} 积分给用户 ${order.userId}`);
          }
        }
      } else {
        console.log(`❌ 支付宝返回状态: ${result.tradeStatus || result.subMsg || result.msg}`);
      }
    } catch (err) {
      console.error(`❌ 查询失败:`, err.message);
    }
  }

  await db.end();
  console.log('\n=== 完成 ===');
}

main().catch(console.error);
