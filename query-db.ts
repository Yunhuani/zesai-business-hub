import { getDb } from './server/db';
import { conversations, messages } from './drizzle/schema';
import { desc, sql } from 'drizzle-orm';

async function query() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    process.exit(1);
  }
  
  // 查询最新对话
  const convs = await db.select({
    id: conversations.id,
    title: conversations.title,
    agentId: conversations.agentId,
    userId: conversations.userId,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
  })
  .from(conversations)
  .orderBy(desc(conversations.createdAt))
  .limit(10);
  
  console.log('=== 最新10条对话 ===');
  for (const conv of convs) {
    console.log(`ID: ${conv.id}, Agent: ${conv.agentId}, User: ${conv.userId}`);
    console.log(`  Title: ${conv.title}`);
    console.log(`  Created: ${conv.createdAt}`);
    console.log(`  Updated: ${conv.updatedAt}`);
    console.log('---');
  }
  
  // 查询今天的对话数量
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayConvs = await db.select()
    .from(conversations)
    .where(sql`${conversations.createdAt} >= ${today.toISOString()}`)
    .orderBy(desc(conversations.createdAt));
    
  console.log('\n=== 今天的对话 (共' + todayConvs.length + '条) ===');
  for (const conv of todayConvs) {
    console.log('  ' + conv.id + ': ' + conv.title + ' - ' + conv.createdAt);
  }
  
  process.exit(0);
}

query().catch(e => {
  console.error(e);
  process.exit(1);
});
