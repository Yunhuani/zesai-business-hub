import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { agents } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const result = await db.select().from(agents).where(eq(agents.name, "竞品分析专家")).limit(1);

if (result.length > 0) {
  console.log("=== 竞品分析专家 systemPrompt ===");
  console.log(result[0].systemPrompt);
} else {
  console.log("未找到竞品分析专家");
}

process.exit(0);
