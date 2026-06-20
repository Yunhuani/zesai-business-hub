import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查询今天所有品牌营销策划师的对话
const conversations = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.agentId, c.createdAt, c.updatedAt, a.name as agentName 
  FROM conversations c 
  LEFT JOIN agents a ON c.agentId = a.id 
  WHERE a.name LIKE '%品牌%' AND c.createdAt >= '2026-01-09 00:00:00'
  ORDER BY c.id DESC 
  LIMIT 20
`);

console.log("今天（1月9日）所有品牌营销策划师的对话:");
if (conversations[0].length === 0) {
  console.log("没有找到任何记录！");
} else {
  conversations[0].forEach(c => {
    console.log(`ID: ${c.id}, userId: ${c.userId}, 创建时间: ${c.createdAt}, 标题: ${c.title}`);
  });
}

// 查询userId=1今天所有的对话
const userConvs = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.agentId, c.createdAt, c.updatedAt, a.name as agentName 
  FROM conversations c 
  LEFT JOIN agents a ON c.agentId = a.id 
  WHERE c.userId = 1 AND c.createdAt >= '2026-01-09 00:00:00'
  ORDER BY c.id DESC 
  LIMIT 20
`);

console.log("\n\n用户ID=1（yunhua.ni@gmail.com）今天所有的对话:");
if (userConvs[0].length === 0) {
  console.log("没有找到任何记录！");
} else {
  userConvs[0].forEach(c => {
    console.log(`ID: ${c.id}, Agent: ${c.agentName}, 创建时间: ${c.createdAt}, 标题: ${c.title}`);
  });
}

process.exit(0);
