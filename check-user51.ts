import { getUserByEmail, getUserOrders } from './server/db';

async function main() {
  const user = await getUserByEmail('51880049@qq.com');
  console.log('=== USER ===');
  if (user) {
    console.log(`id: ${user.id}, name: ${user.name}, email: ${user.email}`);
    console.log(`creditsPurchased: ${user.creditsPurchased}, creditsSubscription: ${user.creditsSubscription}`);
    
    const userOrders = await getUserOrders(user.id);
    console.log('\n=== ORDERS ===');
    for (const o of userOrders) {
      console.log(`orderNo: ${o.outTradeNo}, plan: ${o.plan}, amount: ${o.amount}分, status: ${o.status}, tradeNo: ${o.tradeNo}, paidAt: ${o.paidAt}, createdAt: ${o.createdAt}`);
    }
  } else {
    console.log('User not found');
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
