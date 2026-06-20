import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { ENV } from './_core/env';

let _client: ReturnType<typeof postgres> | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _client = postgres(ENV.databaseUrl, { prepare: false });
      _db = drizzle(_client, { schema });
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

    const values: InsertUser = {
      openId: user.openId,
    };

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

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
        .set(values)
        .where(eq(schema.users.id, existing.id));
    } else {
      // Insert new user
      await db.insert(schema.users).values(values);
    }
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

export async function getOrderByOutTradeNo(outTradeNo: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get order: database not available");
    return undefined;
  }

  return await db.query.orders.findFirst({
    where: eq(schema.orders.outTradeNo, outTradeNo),
  });
}

export async function updateOrderStatus(outTradeNo: string, update: {
  status: string;
  tradeNo?: string;
  paidAt?: Date;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot update order: database not available");
    return;
  }

  await db.update(schema.orders)
    .set({
      status: update.status as any,
      tradeNo: update.tradeNo,
      paidAt: update.paidAt,
      updatedAt: new Date(),
    })
    .where(eq(schema.orders.outTradeNo, outTradeNo));
}

export async function createOrUpdateSubscription(subscription: {
  userId: number;
  plan: string;
  price: number;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create subscription: database not available");
    return;
  }

  const existing = await db.query.subscriptions.findFirst({
    where: eq(schema.subscriptions.userId, subscription.userId),
  });

  if (existing) {
    await db.update(schema.subscriptions)
      .set({
        plan: subscription.plan as any,
        price: subscription.price,
        endDate: subscription.endDate,
        updatedAt: new Date(),
      })
      .where(eq(schema.subscriptions.id, existing.id));
  } else {
    await db.insert(schema.subscriptions).values({
      userId: subscription.userId,
      plan: subscription.plan as any,
      price: subscription.price,
      endDate: subscription.endDate,
    });
  }
}
