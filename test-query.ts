import { getDb } from './server/db';
import { users, conversations, agents } from './drizzle/schema';
import { eq, desc } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) {
    console.error('DB not available');
    process.exit(1);
  }

  // 查找用户
  const userResult = await db.select().from(users).where(eq(users.email, 'yunhua.ni@gmail.com'));
  const user = userResult[0];
  console.log('User ID:', user.id);
  
  // 模拟getUserConversations的查询
  console.log('\n=== getUserConversations 查询结果 ===');
  const result = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      agentId: conversations.agentId,
      agentName: agents.name,
      agentIcon: agents.icon,
      createdAt: conversations.createdAt,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .leftJoin(agents, eq(conversations.agentId, agents.id))
    .where(eq(conversations.userId, user.id))
    .orderBy(desc(conversations.updatedAt))
    .limit(10);
  
  console.log('返回 ' + result.length + ' 条记录');
  for (const conv of result) {
    console.log('\nID: ' + conv.id + ' | Agent: ' + conv.agentName);
    console.log('  Title: ' + conv.title);
    console.log('  Updated: ' + conv.updatedAt);
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
