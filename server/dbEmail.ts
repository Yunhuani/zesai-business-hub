import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { users, InsertUser } from "../drizzle/schema";

/**
 * 通过邮箱查找用户
 * @param email 邮箱地址
 * @returns 用户信息或undefined
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * 创建或更新邮箱登录用户
 * @param email 邮箱地址
 * @param name 用户名（可选）
 * @returns 用户信息
 */
export async function upsertEmailUser(email: string, name?: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  try {
    // 检查用户是否已存在
    const existingUser = await getUserByEmail(email);

    if (existingUser) {
      // 更新最后登录时间
      await db
        .update(users)
        .set({
          lastSignedIn: new Date(),
          ...(name && { name }),
        })
        .where(eq(users.email, email));

      return await getUserByEmail(email);
    } else {
      // 创建新用户
      const insertData: InsertUser = {
        email,
        name: name || email.split("@")[0], // 如果没有提供名字，使用邮箱前缀
        loginMethod: "email",
        lastSignedIn: new Date(),
      };

      await db.insert(users).values(insertData);
      return await getUserByEmail(email);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert email user:", error);
    throw error;
  }
}
