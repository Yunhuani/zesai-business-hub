import { getDb } from './server/db';
import { users, conversations, messages, agents } from './drizzle/schema';
import { eq, desc, sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    process.exit(1);
  }

  const userResult = await db.select().from(users).where(eq(users.email, 'yunhua.ni@gmail.com'));
  if (userResult.length === 0) {
    console.log('用户不存在');
    process.exit(0);
  }
  
  const user = userResult[0];
  console.log('=== 用户信息 ===');
  console.log('ID:', user.id);
  console.log('Email:', user.email);
  
  const convs = await db.select({
    id: conversations.id,
    title: conversations.title,
    agentId: conversations.agentId,
    createdAt: conversations.createdAt,
    updatedAt: conversations.updatedAt,
  })
  .from(conversations)
  .where(eq(conversations.userId, user.id))
  .orderBy(desc(conversations.createdAt));
  
  console.log('\n=== 对话记录 (共' + convs.length + '条) ===');
  for (const conv of convs) {
    const agentResult = await db.select({ name: agents.name }).from(agents).where(eq(agents.id, conv.agentId));
    const agentName = agentResult[0]?.name || 'Unknown';
    
    console.log('\nID: ' + conv.id + ' | Agent: ' + agentName);
    console.log('  Title: ' + conv.title);
    console.log('  Created: ' + conv.createdAt);
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
