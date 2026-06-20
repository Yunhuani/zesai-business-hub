import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";

const DATABASE_URL = process.env.DATABASE_URL;

async function main() {
  const connection = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(connection);
  
  // 查询订单
  const [orders] = await connection.execute(
    "SELECT id, userId, outTradeNo, plan, amount, status, tradeNo, paidAt, createdAt FROM orders WHERE outTradeNo = 'ZS17658746262929030001'"
  );
  console.log("订单信息:", orders);
  
  // 查询用户
  if (orders.length > 0) {
    const userId = orders[0].userId;
    const [users] = await connection.execute(
      "SELECT id, email, name, creditsPurchased, creditsSubscription, creditsResetDate FROM users WHERE id = ?",
      [userId]
    );
    console.log("用户信息:", users);
  }
  
  await connection.end();
}

main().catch(console.error);
