import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function query() {
  const client = await pool.connect();
  try {
    // 查询最新对话
    const convResult = await client.query(`
      SELECT c.id, c.title, c."agentId", c."userId", c."createdAt", c."updatedAt"
      FROM conversations c 
      ORDER BY c."createdAt" DESC 
      LIMIT 10
    `);
    console.log('=== 最新10条对话 ===');
    convResult.rows.forEach(row => {
      console.log(`ID: ${row.id}, Agent: ${row.agentId}, User: ${row.userId}`);
      console.log(`  Title: ${row.title}`);
      console.log(`  Created: ${row.createdAt}`);
      console.log(`  Updated: ${row.updatedAt}`);
      console.log('---');
    });
    
    // 查询今天的对话
    console.log('\n=== 今天的对话 (UTC) ===');
    const todayResult = await client.query(`
      SELECT c.id, c.title, c."agentId", c."createdAt"
      FROM conversations c 
      WHERE c."createdAt" >= CURRENT_DATE
      ORDER BY c."createdAt" DESC
    `);
    console.log(`今天共有 ${todayResult.rows.length} 条对话`);
    todayResult.rows.forEach(row => {
      console.log(`  ${row.id}: ${row.title} - ${row.createdAt}`);
    });
    
  } finally {
    client.release();
    await pool.end();
  }
}

query().catch(console.error);
