import { getDb } from './server/db.ts';
import { agents } from './drizzle/schema.ts';

const db = await getDb();
const allAgents = await db.select().from(agents);
console.log('Total agents:', allAgents.length);
allAgents.forEach(agent => {
  console.log(`\n=== ${agent.name} (ID: ${agent.id}) ===`);
  const prompt = agent.systemPrompt || '';
  console.log('Has 【可下载文件】:', prompt.includes('【可下载文件】'));
  console.log('First 200 chars:', prompt.substring(0, 200));
});
