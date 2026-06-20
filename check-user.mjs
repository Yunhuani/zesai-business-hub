import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查找用户
const users = await db.execute(sql`
  SELECT * FROM users WHERE email = 'yunhua.ni@gmail.com'
`);

console.log("用户信息:");
console.log(JSON.stringify(users[0], null, 2));

if (users[0] && users[0].length > 0) {
  const userId = users[0][0].id;
  console.log("\n用户ID:", userId);
  
  // 查询该用户的所有对话
  const conversations = await db.execute(sql`
    SELECT c.id, c.title, c.userId, c.agentId, c.createdAt, c.updatedAt, a.name as agentName 
    FROM conversations c 
    LEFT JOIN agents a ON c.agentId = a.id 
    WHERE c.userId = ${userId}
    ORDER BY c.id DESC 
    LIMIT 30
  `);
  
  console.log("\n该用户的对话记录:");
  console.log(JSON.stringify(conversations[0], null, 2));
}

process.exit(0);
