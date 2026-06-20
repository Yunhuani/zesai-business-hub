import { drizzle } from "drizzle-orm/mysql2";
import { sql } from "drizzle-orm";

const db = drizzle(process.env.DATABASE_URL);

// 查询agentId=120006（品牌营销策划师）的所有对话
const conversations = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.agentId, c.createdAt, c.updatedAt
  FROM conversations c 
  WHERE c.agentId = 120006
  ORDER BY c.id DESC 
  LIMIT 20
`);

console.log("品牌营销策划师（agentId=120006）的所有对话:");
if (conversations[0].length === 0) {
  console.log("没有找到任何记录！");
} else {
  conversations[0].forEach(c => {
    console.log(`ID: ${c.id}, userId: ${c.userId}, 创建时间: ${c.createdAt}`);
  });
}

// 查询userId=1的品牌营销策划师对话
const userConvs = await db.execute(sql`
  SELECT c.id, c.title, c.userId, c.agentId, c.createdAt
  FROM conversations c 
  WHERE c.userId = 1 AND c.agentId = 120006
  ORDER BY c.id DESC 
  LIMIT 10
`);

console.log("\n\n用户ID=1的品牌营销策划师对话:");
if (userConvs[0].length === 0) {
  console.log("没有找到任何记录！");
} else {
  userConvs[0].forEach(c => {
    console.log(`ID: ${c.id}, 创建时间: ${c.createdAt}, 标题: ${c.title}`);
  });
}

process.exit(0);
