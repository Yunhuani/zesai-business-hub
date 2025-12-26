import { getDb } from './server/db';
import { users } from './drizzle/schema';
import { eq } from 'drizzle-orm';

async function checkUser() {
  const db = await getDb();
  if (!db) {
    console.log('❌ Database not available');
    return;
  }

  const user = await db.select().from(users).where(eq(users.email, '37593301@qq.com')).limit(1);
  
  if (user.length === 0) {
    console.log('❌ User not found');
  } else {
    console.log('✅ User found:');
    console.log(JSON.stringify(user[0], null, 2));
  }
}

checkUser().catch(console.error);
