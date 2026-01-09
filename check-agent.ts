import { getDb } from './server/db';
import { agents } from './drizzle/schema';
import { eq, like } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    process.exit(1);
  }

  // 查询agent ID 120003
  console.log('=== 查询 Agent ID 120003 ===');
  const agent120003 = await db.select().from(agents).where(eq(agents.id, 120003));
  if (agent120003.length > 0) {
    console.log('Found:', agent120003[0].name);
  } else {
    console.log('Agent ID 120003 不存在!');
  }
  
  // 查询所有竞品分析相关的agent
  console.log('\n=== 所有 Agent 列表 ===');
  const allAgents = await db.select({ id: agents.id, name: agents.name }).from(agents);
  for (const a of allAgents) {
    console.log('ID: ' + a.id + ' | Name: ' + a.name);
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
