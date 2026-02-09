import { getDb } from './server/db';

async function main() {
  const db = await getDb();
  const [rows] = await (db as any).execute('SELECT id, title, status, fileUrl, fileSize, slideCount FROM pptDocuments ORDER BY id DESC LIMIT 3');
  console.log(JSON.stringify(rows, null, 2));
  process.exit(0);
}
main();
