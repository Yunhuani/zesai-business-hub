import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 更新对话3390011的updatedAt为最新消息时间
await db.execute(sql`
  UPDATE conversations SET updatedAt = '2026-01-09 07:33:01' WHERE id = 3390011
`);

console.log("已更新对话3390011的updatedAt时间");

// 验证更新
const conv = await db.execute(sql`
  SELECT id, title, createdAt, updatedAt FROM conversations WHERE id = 3390011
`);
console.log("更新后:", conv[0][0]);

process.exit(0);
