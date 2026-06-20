import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { users } from "./drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

async function fixReferralCredits() {
  try {
    // 查询推荐人
    const [referrer] = await db.select().from(users).where(eq(users.email, 'yunhua.ni@gmail.com')).limit(1);
    
    if (!referrer) {
      console.error('推荐人不存在');
      process.exit(1);
    }
    
    console.log('推荐人信息：', {
      id: referrer.id,
      email: referrer.email,
      name: referrer.name,
      creditsPurchased: referrer.creditsPurchased,
    });
    
    // 补发200积分
    const newCredits = referrer.creditsPurchased + 200;
    
    await db.update(users)
      .set({ creditsPurchased: newCredits })
      .where(eq(users.id, referrer.id));
    
    console.log(`✅ 成功补发200积分，新积分余额：${newCredits}`);
    
    // 创建交易记录
    const { recordTransaction } = await import("./server/creditsManager.js");
    await recordTransaction({
      userId: referrer.id,
      type: "purchase",
      amount: 200,
      balancePurchased: newCredits,
      balanceSubscription: referrer.creditsSubscription,
      description: "推荐新用户奖励（补发）",
    });
    
    console.log('✅ 交易记录已创建');
    
  } catch (error) {
    console.error('补发积分失败：', error);
    process.exit(1);
  }
}

fixReferralCredits();
