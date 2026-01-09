import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查看最新对话
const conversations = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.agentId, c.updatedAt, a.name as agentName 
  FROM conversations c 
  LEFT JOIN agents a ON c.agentId = a.id 
  ORDER BY c.id DESC 
  LIMIT 20
`);

console.log("最新对话:");
console.log(JSON.stringify(conversations[0], null, 2));

// 查看品牌营销策划相关
const brandConvs = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.agentId, c.updatedAt, a.name as agentName 
  FROM conversations c 
  LEFT JOIN agents a ON c.agentId = a.id 
  WHERE a.name LIKE '%品牌%' OR c.title LIKE '%品牌%'
  ORDER BY c.id DESC 
  LIMIT 10
`);

console.log("\n品牌相关对话:");
console.log(JSON.stringify(brandConvs[0], null, 2));

process.exit(0);
