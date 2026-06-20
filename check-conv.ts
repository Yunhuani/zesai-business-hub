import { getDb } from './server/db';
import { users, conversations, messages } from './drizzle/schema';
import { eq, and, desc } from 'drizzle-orm';

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
  
  // 查询该用户的竞品分析专家对话 (agent ID 120003)
  console.log('\n=== 用户的竞品分析专家对话 ===');
  const convs = await db.select()
    .from(conversations)
    .where(and(eq(conversations.userId, user.id), eq(conversations.agentId, 120003)))
    .orderBy(desc(conversations.createdAt));
  
  console.log('共有 ' + convs.length + ' 条竞品分析对话');
  for (const conv of convs) {
    console.log('\nConv ID: ' + conv.id);
    console.log('  Title: ' + conv.title);
    console.log('  Created: ' + conv.createdAt);
    console.log('  Updated: ' + conv.updatedAt);
    
    // 查询消息数
    const msgs = await db.select().from(messages).where(eq(messages.conversationId, conv.id));
    console.log('  Messages: ' + msgs.length);
  }
  
  // 查询最新5条对话（不限agent）
  console.log('\n=== 用户最新5条对话 ===');
  const latestConvs = await db.select()
    .from(conversations)
    .where(eq(conversations.userId, user.id))
    .orderBy(desc(conversations.createdAt))
    .limit(5);
  
  for (const conv of latestConvs) {
    console.log('ID: ' + conv.id + ' | Agent: ' + conv.agentId + ' | Created: ' + conv.createdAt);
  }
  
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
