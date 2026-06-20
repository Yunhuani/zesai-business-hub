import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查询对话3390011的创建和更新时间
const conv = await db.execute(sql`
  SELECT id, title, createdAt, updatedAt FROM conversations WHERE id = 3390011
`);

console.log("对话3390011的时间:");
console.log(conv[0][0]);

// 查询该对话最新消息的时间
const msg = await db.execute(sql`
  SELECT id, createdAt FROM messages WHERE conversationId = 3390011 ORDER BY id DESC LIMIT 1
`);

console.log("\n该对话最新消息的时间:");
console.log(msg[0][0]);

process.exit(0);
