import "dotenv/config";
import mysql from "mysql2/promise";

console.log("尝试直接连接 TiDB...");
try {
  const conn = await mysql.createConnection({
    uri: process.env.DATABASE_URL,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectTimeout: 15000,
  });
  const [rows] = await conn.query("SELECT 1 AS ok");
  console.log("✅ 连接成功:", rows);
  await conn.end();
  process.exit(0);
} catch (e) {
  console.error("❌ 连接失败:", e.code, "-", e.message);
  process.exit(1);
}