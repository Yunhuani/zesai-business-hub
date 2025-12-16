import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  // 用户ID和需要补发的积分
  const userId = 9030001;
  const creditsToAdd = 500;
  const orderId = 720001;
  
  // 1. 更新用户积分
  await connection.execute(
    "UPDATE users SET creditsPurchased = creditsPurchased + ? WHERE id = ?",
    [creditsToAdd, userId]
  );
  console.log(`已为用户 ${userId} 充值 ${creditsToAdd} 积分`);
  
  // 2. 记录积分交易
  await connection.execute(
    `INSERT INTO credits_transactions (userId, type, amount, description, relatedOrderId, createdAt) 
     VALUES (?, 'purchase', ?, '积分包购买补发 - 入门包500积分', ?, NOW())`,
    [userId, creditsToAdd, orderId]
  );
  console.log("已记录积分交易");
  
  // 3. 验证结果
  const [users] = await connection.execute(
    "SELECT id, email, creditsPurchased, creditsSubscription FROM users WHERE id = ?",
    [userId]
  );
  console.log("更新后用户信息:", users);
  
  await connection.end();
}

main().catch(console.error);
