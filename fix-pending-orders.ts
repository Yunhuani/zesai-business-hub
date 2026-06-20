/**
 * 修复所有pending订单：主动查询支付宝，如已支付则更新数据库并发放积分/订阅
 * 运行方式: npx tsx fix-pending-orders.ts
 */
import { AlipaySdk } from 'alipay-sdk';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

// 直接用环境变量初始化SDK
const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID!,
  privateKey: process.env.ALIPAY_PRIVATE_KEY!,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
  gateway: 'https://openapi.alipay.com/gateway.do',
  charset: 'utf-8',
  signType: 'RSA2',
});

const PLAN_CONFIG: Record<string, { monthlyCredits: number; price: number; duration: number; name: string }> = {
  basic: { name: '基础版', monthlyCredits: 750, price: 9900, duration: 30 },
  professional: { name: '专业版', monthlyCredits: 2600, price: 29900, duration: 30 },
  enterprise: { name: '企业版', monthlyCredits: 11000, price: 99900, duration: 30 },
};

const CREDIT_PACK_CONFIG: Record<string, { name: string; credits: number }> = {
  pack_500: { name: '入门包', credits: 500 },
  pack_1000: { name: '超值包', credits: 1000 },
  pack_1200: { name: '超值包', credits: 1200 },
  pack_2200: { name: '专业包', credits: 2200 },
  pack_3000: { name: '专业包', credits: 3000 },
  pack_5500: { name: '企业包', credits: 5500 },
  pack_8000: { name: '企业包', credits: 8000 },
};

// 需要检查的订单（从数据库查出的所有pending订单）
const PENDING_ORDERS = [
  { outTradeNo: 'ZS17738244815499030001', userId: 9030001, plan: 'basic', amount: 9900 },
  { outTradeNo: 'ZS17738244816487350017', userId: 7350017, plan: 'pack_500', amount: 4900 },
  { outTradeNo: 'ZS17738244436207350017', userId: 7350017, plan: 'pack_500', amount: 4900 },
  { outTradeNo: 'ZS177324049436618360001', userId: 18360001, plan: 'basic', amount: 9900 },
  { outTradeNo: 'ZS177243201823418030001', userId: 18030001, plan: 'basic', amount: 9900 },
  { outTradeNo: 'ZS176938709847115870001', userId: 15870001, plan: 'enterprise', amount: 99900 },
  { outTradeNo: 'ZS176938662563915870001', userId: 15870001, plan: 'basic', amount: 9900 },
  { outTradeNo: 'ZS176938598972915870001', userId: 15870001, plan: 'basic', amount: 9900 },
];

async function queryAlipayOrder(outTradeNo: string) {
  try {
    const result = await alipaySdk.exec('alipay.trade.query', {
      bizContent: { out_trade_no: outTradeNo },
    }) as any;
    return result;
  } catch (err: any) {
    return { code: 'ERROR', msg: err.message };
  }
}

async function main() {
  console.log('=== 支付宝订单修复脚本 ===\n');
  console.log(`ALIPAY_APP_ID: ${process.env.ALIPAY_APP_ID}`);
  console.log(`ALIPAY_PUBLIC_KEY 前50字符: ${process.env.ALIPAY_PUBLIC_KEY?.substring(0, 50)}...\n`);

  const paidOrders: typeof PENDING_ORDERS = [];

  for (const order of PENDING_ORDERS) {
    console.log(`\n--- 查询订单: ${order.outTradeNo} ---`);
    const result = await queryAlipayOrder(order.outTradeNo);
    
    console.log(`支付宝返回 code: ${result.code}, tradeStatus: ${result.tradeStatus || 'N/A'}, msg: ${result.msg || 'OK'}`);
    
    if (result.code === '10000') {
      if (result.tradeStatus === 'TRADE_SUCCESS') {
        console.log(`✅ 已支付！tradeNo: ${result.tradeNo}`);
        paidOrders.push({ ...order, outTradeNo: order.outTradeNo });
      } else if (result.tradeStatus === 'WAIT_BUYER_PAY') {
        console.log(`⏳ 等待买家付款（未完成支付）`);
      } else if (result.tradeStatus === 'TRADE_CLOSED') {
        console.log(`❌ 交易已关闭`);
      } else {
        console.log(`❓ 未知状态: ${result.tradeStatus}`);
      }
    } else if (result.code === 'ACQ.TRADE_NOT_EXIST') {
      console.log(`❌ 支付宝无此交易记录（用户未完成支付）`);
    } else {
      console.log(`❌ 查询失败: ${result.subMsg || result.msg}`);
    }
  }

  console.log(`\n=== 查询完成 ===`);
  console.log(`已支付订单数: ${paidOrders.length}`);
  
  if (paidOrders.length > 0) {
    console.log('\n需要在数据库中修复的订单:');
    for (const o of paidOrders) {
      const packId = o.plan.startsWith('pack_') ? o.plan.split('_').slice(0, 2).join('_') : o.plan;
      const isSubscription = !!PLAN_CONFIG[o.plan];
      const isCreditPack = !!CREDIT_PACK_CONFIG[packId];
      console.log(`  - ${o.outTradeNo} | userId: ${o.userId} | plan: ${o.plan} | type: ${isSubscription ? '订阅' : isCreditPack ? '积分包' : '未知'}`);
    }
    console.log('\n请将以上信息告知，我将执行数据库修复SQL。');
  }
}

main().catch(console.error);
