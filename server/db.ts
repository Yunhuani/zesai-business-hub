import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
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
  monthlyLimit: number;
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
        monthlyLimit: data.monthlyLimit,
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
      monthlyLimit: data.monthlyLimit,
      price: data.price,
      status: "active",
      startDate: new Date(),
      endDate: data.endDate,
    });
  }
}

// Usage record queries
export async function getOrCreateUsageRecord(userId: number, month: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { usageRecords } = await import("../drizzle/schema");
  const { and } = await import("drizzle-orm");
  
  const result = await db
    .select()
    .from(usageRecords)
    .where(and(eq(usageRecords.userId, userId), eq(usageRecords.month, month)))
    .limit(1);
  
  if (result.length > 0) {
    return result[0];
  }
  
  await db.insert(usageRecords).values({
    userId,
    month,
    usageCount: 0,
  });
  
  const newRecord = await db
    .select()
    .from(usageRecords)
    .where(and(eq(usageRecords.userId, userId), eq(usageRecords.month, month)))
    .limit(1);
  
  return newRecord[0];
}

export async function incrementUsage(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { usageRecords } = await import("../drizzle/schema");
  
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  
  const record = await getOrCreateUsageRecord(userId, month);
  
  await db
    .update(usageRecords)
    .set({ usageCount: record.usageCount + 1 })
    .where(eq(usageRecords.id, record.id));
}

export async function checkUsageLimit(userId: number): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const subscription = await getUserSubscription(userId);
  
  // Default free plan: 3 times per month
  if (!subscription || subscription.plan === "free") {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const usage = await getOrCreateUsageRecord(userId, month);
    const freeLimit = 3;
    const remaining = freeLimit - usage.usageCount;
    return {
      allowed: remaining > 0,
      remaining: Math.max(0, remaining),
      limit: freeLimit,
    };
  }
  
  // Check if subscription is active
  if (subscription.status !== "active" || new Date(subscription.endDate) < new Date()) {
    return { allowed: false, remaining: 0, limit: subscription.monthlyLimit };
  }
  
  // Unlimited plan
  if (subscription.monthlyLimit === 0) {
    return { allowed: true, remaining: -1, limit: 0 };
  }
  
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const usage = await getOrCreateUsageRecord(userId, month);
  
  const remaining = subscription.monthlyLimit - usage.usageCount;
  return {
    allowed: remaining > 0,
    remaining: Math.max(0, remaining),
    limit: subscription.monthlyLimit,
  };
}
