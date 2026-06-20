import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查询品牌营销策划师（agentId=120006）相关对话的消息
const messages = await db.execute(sql`
  SELECT m.id, m.conversationId, m.role, m.createdAt, LEFT(m.content, 50) as content_preview
  FROM messages m 
  JOIN conversations c ON m.conversationId = c.id
  WHERE c.agentId = 120006 AND c.userId = 1
  ORDER BY m.id DESC 
  LIMIT 20
`);

console.log("用户ID=1的品牌营销策划师对话消息:");
if (messages[0].length === 0) {
  console.log("没有找到任何消息记录！");
} else {
  messages[0].forEach(m => {
    console.log(`ID: ${m.id}, ConvID: ${m.conversationId}, Role: ${m.role}, 创建时间: ${m.createdAt}`);
    console.log(`  内容: ${m.content_preview}...`);
  });
}

// 查询今天所有用户的消息数量
const todayMessages = await db.execute(sql`
  SELECT COUNT(*) as count FROM messages WHERE createdAt >= '2026-01-09 00:00:00'
`);
console.log("\n\n今天（1月9日）所有消息数量:", todayMessages[0][0].count);

// 查询今天用户ID=1的消息
const userTodayMessages = await db.execute(sql`
  SELECT m.id, m.conversationId, m.role, m.createdAt, LEFT(m.content, 50) as content_preview, c.title
  FROM messages m 
  JOIN conversations c ON m.conversationId = c.id
  WHERE c.userId = 1 AND m.createdAt >= '2026-01-09 00:00:00'
  ORDER BY m.id DESC 
  LIMIT 30
`);

console.log("\n\n用户ID=1今天的所有消息:");
if (userTodayMessages[0].length === 0) {
  console.log("没有找到任何消息记录！");
} else {
  userTodayMessages[0].forEach(m => {
    console.log(`ID: ${m.id}, ConvID: ${m.conversationId}, Role: ${m.role}, 标题: ${m.title}`);
    console.log(`  内容: ${m.content_preview}...`);
  });
}

process.exit(0);
