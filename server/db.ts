import { eq, and, desc, sql, count, exists, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { ENV } from "./_core/env";

let _client: ReturnType<typeof mysql.createPool> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getSslConfig() {
  return process.env.DATABASE_SSL === "false"
    ? undefined
    : {
        minVersion: "TLSv1.2" as const,
        rejectUnauthorized: true,
      };
}

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: getSslConfig(),
        connectTimeout: 15000,
      });
      _db = drizzle(_client, { schema, mode: "default" }) as unknown as ReturnType<typeof drizzle<typeof schema>>;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function closeDb() {
  if (_client) {
    await _client.end();
    _client = null;
    _db = null;
  }
}

export type InsertUser = typeof schema.users.$inferInsert;

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
    // Check if user exists
    const existing = await db.query.users.findFirst({
      where: eq(schema.users.openId, user.openId),
    });

    const values: Partial<InsertUser> = {
      openId: user.openId,
    };

    const textFields = ["name", "email", "loginMethod"] as const;

    for (const field of textFields) {
      const value = user[field];
      if (value !== undefined) {
        (values as any)[field] = value ?? null;
      }
    }

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (existing) {
      // Update existing user
      await db.update(schema.users)
        .set({ ...values, updatedAt: new Date() })
        .where(eq(schema.users.id, existing.id));
    } else {
      // Insert new user
      await db.insert(schema.users).values({
        ...values,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as InsertUser);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getMessageById(messageId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get message: database not available");
    return undefined;
  }

  return await db.query.messages.findFirst({
    where: eq(schema.messages.id, messageId),
  });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  return await db.query.users.findFirst({
    where: eq(schema.users.openId, openId),
  });
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  return await db.query.users.findFirst({
    where: eq(schema.users.id, id),
  });
}

// Agent queries
export async function getAllAgents() {
  const db = await getDb();
  if (!db) return [];
  // Safe: don't return systemPrompt
  return db.select({
    id: schema.agents.id,
    name: schema.agents.name,
    description: schema.agents.description,
    icon: schema.agents.icon,
    welcomeMessage: schema.agents.welcomeMessage,
    inputFields: schema.agents.inputFields,
    createdAt: schema.agents.createdAt,
    updatedAt: schema.agents.updatedAt,
  }).from(schema.agents);
}

export async function getAgentById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({
    id: schema.agents.id,
    name: schema.agents.name,
    description: schema.agents.description,
    icon: schema.agents.icon,
    welcomeMessage: schema.agents.welcomeMessage,
    inputFields: schema.agents.inputFields,
    createdAt: schema.agents.createdAt,
    updatedAt: schema.agents.updatedAt,
  }).from(schema.agents).where(eq(schema.agents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Internal use: get full agent data (with systemPrompt)
export async function getAgentByIdFull(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.query.agents.findFirst({
    where: eq(schema.agents.id, id),
  });
}

export async function updateAgent(id: number, data: { name?: string; description?: string; icon?: string; systemPrompt?: string; inputFields?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(schema.agents).set({ ...data, updatedAt: new Date() }).where(eq(schema.agents.id, id));
}

// Conversation queries
export async function createConversation(data: { userId: number; agentId: number; title: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [insertResult] = await db.insert(schema.conversations).values({
    ...data,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const conversation = await db.query.conversations.findFirst({
    where: eq(schema.conversations.id, insertResult.insertId),
  });
  return conversation!;
}

export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) return [];

  // Only return conversations with user messages (filter out empty ones with just welcome)
  return db
    .select({
      id: schema.conversations.id,
      title: schema.conversations.title,
      agentId: schema.conversations.agentId,
      agentName: schema.agents.name,
      agentIcon: schema.agents.icon,
      createdAt: schema.conversations.createdAt,
      updatedAt: schema.conversations.updatedAt,
    })
    .from(schema.conversations)
    .leftJoin(schema.agents, eq(schema.conversations.agentId, schema.agents.id))
    .where(
      and(
        eq(schema.conversations.userId, userId),
        exists(
          db.select({ id: schema.messages.id })
            .from(schema.messages)
            .where(
              and(
                eq(schema.messages.conversationId, schema.conversations.id),
                eq(schema.messages.role, "user")
              )
            )
        )
      )
    )
    .orderBy(desc(schema.conversations.updatedAt));
}

export async function getLatestConversationByAgent(userId: number, agentId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(schema.conversations)
    .where(and(eq(schema.conversations.userId, userId), eq(schema.conversations.agentId, agentId)))
    .orderBy(desc(schema.conversations.updatedAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getConversationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.query.conversations.findFirst({
    where: eq(schema.conversations.id, id),
  });
}

// Message queries
export async function createMessage(data: { conversationId: number; role: "user" | "assistant" | "system"; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert message
  const [insertResult] = await db.insert(schema.messages).values({
    ...data,
    createdAt: new Date(),
  });
  const message = await db.query.messages.findFirst({
    where: eq(schema.messages.id, insertResult.insertId),
  });

  // Update conversation
  const updateData: { updatedAt: Date; title?: string } = { updatedAt: new Date() };

  // If user message, check if need to update title
  if (data.role === "user") {
    const existingUserMessages = await db
      .select()
      .from(schema.messages)
      .where(eq(schema.messages.conversationId, data.conversationId));

    const userMessageCount = existingUserMessages.filter(m => m.role === "user").length;

    // If first user message, update title
    if (userMessageCount === 1) {
      const newTitle = data.content.length > 20
        ? data.content.substring(0, 20) + "..."
        : data.content;
      updateData.title = newTitle;
    }
  }

  await db.update(schema.conversations)
    .set(updateData)
    .where(eq(schema.conversations.id, data.conversationId));

  return message!;
}

export async function getConversationMessages(conversationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.messages)
    .where(eq(schema.messages.conversationId, conversationId))
    .orderBy(schema.messages.createdAt);
}

// Subscription queries
export async function getUserSubscription(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, userId))
    .orderBy(schema.subscriptions.createdAt)
    .limit(1);
  if (result.length === 0) return undefined;

  const sub = result[0];
  // Check if expired
  if (sub.status !== 'active' || new Date(sub.endDate) < new Date()) {
    return { ...sub, plan: 'free' as const, status: 'expired' as const };
  }
  return sub;
}

export async function createOrUpdateSubscription(data: {
  userId: number;
  plan: "free" | "basic" | "professional" | "enterprise";
  price: number;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getUserSubscription(data.userId);
  if (existing) {
    await db
      .update(schema.subscriptions)
      .set({
        plan: data.plan,
        price: data.price,
        status: "active",
        startDate: new Date(),
        endDate: data.endDate,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.userId, data.userId));
  } else {
    await db.insert(schema.subscriptions).values({
      userId: data.userId,
      plan: data.plan,
      price: data.price,
      status: "active",
      startDate: new Date(),
      endDate: data.endDate,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

// Order queries
export async function createOrder(data: {
  userId: number;
  outTradeNo: string;
  plan: string;
  amount: number;
  paymentMethod?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [insertResult] = await db.insert(schema.orders).values({
    userId: data.userId,
    outTradeNo: data.outTradeNo,
    plan: data.plan,
    amount: data.amount,
    paymentMethod: data.paymentMethod || "alipay",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  const order = await db.query.orders.findFirst({
    where: eq(schema.orders.id, insertResult.insertId),
  });
  return order!;
}

export async function getOrderByOutTradeNo(outTradeNo: string) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.query.orders.findFirst({
    where: eq(schema.orders.outTradeNo, outTradeNo),
  });
}

export async function updateOrderStatus(outTradeNo: string, data: {
  status: "pending" | "paid" | "cancelled" | "refunded" | "closed";
  tradeNo?: string;
  paidAt?: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(schema.orders).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(schema.orders.outTradeNo, outTradeNo));
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(schema.orders)
    .where(eq(schema.orders.userId, userId))
    .orderBy(desc(schema.orders.createdAt));
}

export async function getUserAccessStats(timeRange?: { start: Date; end: Date }) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      userId: schema.users.id,
      userName: schema.users.name,
      userEmail: schema.users.email,
      totalAccess: count(schema.conversations.id),
      lastAccess: sql`MAX(${schema.conversations.createdAt})`,
      firstAccess: sql`MIN(${schema.conversations.createdAt})`,
    })
    .from(schema.users)
    .leftJoin(schema.conversations, eq(schema.users.id, schema.conversations.userId))
    .groupBy(schema.users.id)
    .orderBy(desc(count(schema.conversations.id)));

  return result;
}

export async function getFailedOrders(timeRange?: { start: Date; end: Date }) {
  const db = await getDb();
  if (!db) return [];

  // Get orders that are still pending after 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  let query = db.select().from(schema.orders).where(
    and(
      eq(schema.orders.status, "pending"),
      sql`${schema.orders.createdAt} < ${thirtyMinutesAgo.toISOString()}`
    )
  );

  if (timeRange) {
    query = db.select().from(schema.orders).where(
      and(
        eq(schema.orders.status, "pending"),
        sql`${schema.orders.createdAt} >= ${timeRange.start.toISOString()}`,
        sql`${schema.orders.createdAt} <= ${timeRange.end.toISOString()}`
      )
    );
  }

  return query.orderBy(sql`${schema.orders.createdAt} DESC`);
}

// Password reset token queries
export async function createPasswordResetToken(data: {
  userId: number;
  token: string;
  expiresAt: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(schema.passwordResetTokens).values({
    ...data,
    used: 0,
    createdAt: new Date(),
  });
}

export async function getPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.query.passwordResetTokens.findFirst({
    where: eq(schema.passwordResetTokens.token, token),
  });
}

export async function markTokenAsUsed(token: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(schema.passwordResetTokens)
    .set({ used: 1 })
    .where(eq(schema.passwordResetTokens.token, token));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(schema.users)
    .set({ password: passwordHash, updatedAt: new Date() })
    .where(eq(schema.users.id, userId));
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  return await db.query.users.findFirst({
    where: eq(schema.users.email, email),
  });
}
