import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, messages } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

/**
 * Get message by ID
 */
export async function getMessageById(messageId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get message: database not available");
    return undefined;
  }

  const result = await db.select().from(messages).where(eq(messages.id, messageId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Agent queries
export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];
  const { agents } = await import("../drizzle/schema");
  return db.select().from(agents);
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { agents } = await import("../drizzle/schema");
  const result = await db.select().from(agents).where(eq(agents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateAgent(id: number, data: { name?: string; description?: string; icon?: string; systemPrompt?: string; inputFields?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { agents } = await import("../drizzle/schema");
  await db.update(agents).set(data).where(eq(agents.id, id));
}

// Conversation queries
export async function createConversation(data: { userId: number; agentId: number; title: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { conversations } = await import("../drizzle/schema");
  const result = await db.insert(conversations).values(data);
  return result[0];
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { conversations, agents } = await import("../drizzle/schema");
  return db
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
    .where(eq(conversations.userId, userId))
    .orderBy(conversations.updatedAt);
}

export async function getLatestConversationByAgent(userId: number, agentId: number) {
  const db = await getDb();
  if (!db) return null;
  const { conversations } = await import("../drizzle/schema");
  const { desc, and } = await import("drizzle-orm");
  const result = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.userId, userId), eq(conversations.agentId, agentId)))
    .orderBy(desc(conversations.updatedAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { conversations } = await import("../drizzle/schema");
  const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Message queries
export async function createMessage(data: { conversationId: number; role: "user" | "assistant" | "system"; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { messages } = await import("../drizzle/schema");
  const result = await db.insert(messages).values(data);
  return result[0];
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  const { messages } = await import("../drizzle/schema");
  return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
}

// Subscription queries
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const { subscriptions } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .orderBy(subscriptions.createdAt)
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateSubscription(data: {
  userId: number;
  plan: "free" | "basic" | "professional" | "enterprise";
  price: number;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { subscriptions } = await import("../drizzle/schema");
  
  const existing = await getUserSubscription(data.userId);
  if (existing) {
    await db
      .update(subscriptions)
      .set({
        plan: data.plan,
        price: data.price,
        status: "active",
        startDate: new Date(),
        endDate: data.endDate,
      })
      .where(eq(subscriptions.userId, data.userId));
  } else {
    await db.insert(subscriptions).values({
      userId: data.userId,
      plan: data.plan,
      price: data.price,
      status: "active",
      startDate: new Date(),
      endDate: data.endDate,
    });
  }
}

// Usage record queries - DEPRECATED
// These functions are no longer used. The system now uses credits instead of usage counts.
// Keeping them temporarily for reference during migration.

/*
export async function getOrCreateUsageRecord(userId: number, month: string) { ... }
export async function incrementUsage(userId: number) { ... }
export async function checkUsageLimit(userId: number) { ... }
*/

// Order queries
export async function createOrder(data: {
  userId: number;
  outTradeNo: string;
  plan: string; // Changed to string to support both subscription plans and credit pack IDs
  amount: number;
  paymentMethod?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orders } = await import("../drizzle/schema");
  const result = await db.insert(orders).values({
    userId: data.userId,
    outTradeNo: data.outTradeNo,
    plan: data.plan,
    amount: data.amount,
    paymentMethod: data.paymentMethod || "alipay",
    status: "pending",
  });
  return result[0];
}

export async function getOrderByOutTradeNo(outTradeNo: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { orders } = await import("../drizzle/schema");
  const result = await db.select().from(orders).where(eq(orders.outTradeNo, outTradeNo)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateOrderStatus(outTradeNo: string, data: {
  status: "pending" | "paid" | "cancelled" | "refunded";
  tradeNo?: string;
  paidAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { orders } = await import("../drizzle/schema");
  await db.update(orders).set(data).where(eq(orders.outTradeNo, outTradeNo));
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const { orders } = await import("../drizzle/schema");
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(orders.createdAt);
}

// Password reset token queries
export async function createPasswordResetToken(data: {
  userId: number;
  token: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { passwordResetTokens } = await import("../drizzle/schema");
  await db.insert(passwordResetTokens).values(data);
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const { passwordResetTokens } = await import("../drizzle/schema");
  const result = await db
    .select()
    .from(passwordResetTokens)
    .where(eq(passwordResetTokens.token, token))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markTokenAsUsed(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { passwordResetTokens } = await import("../drizzle/schema");
  await db
    .update(passwordResetTokens)
    .set({ used: 1 })
    .where(eq(passwordResetTokens.token, token));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(users)
    .set({ password: passwordHash })
    .where(eq(users.id, userId));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}
