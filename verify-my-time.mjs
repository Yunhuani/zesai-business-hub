import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查询商业模式设计的对话（我看到的是14:37）
const conversations = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.updatedAt, a.name as agentName 
  FROM conversations c 
  LEFT JOIN agents a ON c.agentId = a.id 
  WHERE c.title LIKE '%商业模式设计%' AND c.title LIKE '%2026/1/7%'
  ORDER BY c.id DESC 
  LIMIT 10
`);

console.log("商业模式设计 1月7日的对话:");
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
  console.log(`ID: ${c.id}, userId: ${c.userId}, UTC: ${utcTime}, 北京时间: ${beijingTime}`);
});

process.exit(0);
