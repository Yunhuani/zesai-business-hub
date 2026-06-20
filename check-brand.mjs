import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查找品牌营销策划师agent
const agents = await db.execute(sql`
  SELECT * FROM agents WHERE name LIKE '%品牌%'
`);

console.log("品牌相关Agent:");
console.log(JSON.stringify(agents[0], null, 2));

// 查找userId=1的品牌营销策划对话
const conversations = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.agentId, c.createdAt, c.updatedAt, a.name as agentName 
  FROM conversations c 
  LEFT JOIN agents a ON c.agentId = a.id 
  WHERE c.userId = 1 AND a.name LIKE '%品牌%'
  ORDER BY c.id DESC 
  LIMIT 10
`);

console.log("\n用户ID=1的品牌营销策划对话:");
console.log(JSON.stringify(conversations[0], null, 2));

process.exit(0);
