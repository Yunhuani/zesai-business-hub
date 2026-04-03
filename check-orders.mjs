import { drizzle } from "drizzle-orm/mysql2";
import { eq, desc, sql } from "drizzle-orm";
import { mysqlTable, serial, text, int, timestamp, varchar } from "drizzle-orm/mysql-core";
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) { console.error("No DATABASE_URL found"); process.exit(1); }

const db = drizzle(dbUrl);

// Define minimal schema
const orders = mysqlTable("orders", {
  id: serial("id").primaryKey(),
  userId: int("user_id"),
  outTradeNo: varchar("out_trade_no", { length: 255 }),
  plan: varchar("plan", { length: 255 }),
  amount: int("amount"),
  status: varchar("status", { length: 50 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  tradeNo: varchar("trade_no", { length: 255 }),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at"),
});

const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }),
  name: varchar("name", { length: 255 }),
  creditsPurchased: int("credits_purchased"),
  creditsSubscription: int("credits_subscription"),
});

async function main() {
  // 1. Recent orders
  console.log("=== RECENT ORDERS (last 10) ===");
  const recentOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(10);
  for (const o of recentOrders) {
    console.log(`  [${o.status}] ${o.outTradeNo} | plan=${o.plan} | amount=${o.amount} | method=${o.paymentMethod} | created=${o.createdAt}`);
  }

  // 2. Pending orders
  console.log("\n=== PENDING ORDERS ===");
  const pendingOrders = await db.select().from(orders).where(eq(orders.status, "pending")).orderBy(desc(orders.createdAt));
  console.log(`  Total: ${pendingOrders.length}`);
  for (const o of pendingOrders) {
    console.log(`  ${o.outTradeNo} | plan=${o.plan} | amount=${o.amount} | user=${o.userId} | created=${o.createdAt}`);
  }

  // 3. Check all users credits
  console.log("\n=== ALL USERS CREDITS ===");
  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    purchased: users.creditsPurchased,
    subscription: users.creditsSubscription,
  }).from(users);
  for (const u of allUsers) {
    console.log(`  ID:${u.id} | ${u.email} | ${u.name} | purchased=${u.purchased} | sub=${u.subscription} | total=${(u.purchased||0)+(u.subscription||0)}`);
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
