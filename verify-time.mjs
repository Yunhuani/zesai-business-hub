import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查询1月7日的对话
const conversations = await db.execute(sql`
  SELECT id, title, updatedAt FROM conversations 
  WHERE title LIKE '%2026/1/7%' 
  ORDER BY id DESC 
  LIMIT 5
`);

console.log("1月7日的对话（数据库UTC时间）:");
conversations[0].forEach(c => {
  const utcTime = c.updatedAt;
  const isoString = utcTime.replace(' ', 'T') + 'Z';
  const beijingTime = new Date(isoString).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  console.log(`ID: ${c.id}, UTC: ${utcTime}, 北京时间: ${beijingTime}`);
});

process.exit(0);
