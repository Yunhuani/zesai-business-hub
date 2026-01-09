import mysql from 'mysql2/promise';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false }
});

const result = await connection.execute(`
SELECT 
  c.id as conversation_id,
  c.agentId,
  a.name as agent_name,
  c.createdAt,
  (SELECT COUNT(*) FROM messages m WHERE m.conversationId = c.id) as message_count
FROM conversations c
LEFT JOIN agents a ON c.agentId = a.id
WHERE c.userId = (SELECT id FROM users WHERE email = '598364001@qq.com')
ORDER BY c.createdAt DESC
LIMIT 20;
`);

console.log('用户 598364001@qq.com 的对话历史:');
console.log(JSON.stringify(result[0], null, 2));

await connection.end();
