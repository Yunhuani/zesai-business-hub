import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. Now optional for email login. */
  openId: varchar("openId", { length: 64 }).unique(),
  name: text("name"),
  /** Email address for email-based login. Unique per user. */
  email: varchar("email", { length: 320 }).unique(),
  /** Username for password-based login. Unique per user. */
  username: varchar("username", { length: 64 }).unique(),
  /** Hashed password for password-based login */
  password: varchar("password", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** Credits purchased by user (永久有效的充值积分) */
  creditsPurchased: int("creditsPurchased").default(0).notNull(),
  /** Credits from subscription (每月重置的订阅积分) */
  creditsSubscription: int("creditsSubscription").default(100).notNull(), // Free plan gets 100 credits
  /** Date when subscription credits will reset */
  creditsResetDate: timestamp("creditsResetDate").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Agents table - stores business consulting agent configurations
 */
export const agents = mysqlTable("agents", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description").notNull(),
  icon: varchar("icon", { length: 50 }).notNull(), // lucide icon name
  systemPrompt: text("systemPrompt").notNull(),
  inputFields: text("inputFields").notNull(), // JSON string of field configurations
  welcomeMessage: text("welcomeMessage"), // Optional welcome message shown when user opens the agent
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = typeof agents.$inferInsert;

/**
 * Conversations table - stores user chat sessions with agents
 */
export const conversations = mysqlTable("conversations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  agentId: int("agentId").notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;

/**
 * Messages table - stores individual messages in conversations
 */
export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  conversationId: int("conversationId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;

/**
 * Subscriptions table - stores user subscription plans
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["free", "basic", "professional", "enterprise"]).default("free").notNull(),
  monthlyLimit: int("monthlyLimit").notNull().default(0), // 0 means unlimited
  price: int("price").notNull().default(0), // in cents (分)
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active").notNull(),
  startDate: timestamp("startDate").defaultNow().notNull(),
  endDate: timestamp("endDate").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Usage records table - tracks monthly usage per user
 */
export const usageRecords = mysqlTable("usageRecords", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  month: varchar("month", { length: 7 }).notNull(), // Format: YYYY-MM
  usageCount: int("usageCount").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UsageRecord = typeof usageRecords.$inferSelect;
export type InsertUsageRecord = typeof usageRecords.$inferInsert;

/**
 * Orders table - stores payment orders
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  outTradeNo: varchar("outTradeNo", { length: 64 }).notNull().unique(), // 商户订单号
  tradeNo: varchar("tradeNo", { length: 64 }), // 支付宝交易号
  plan: varchar("plan", { length: 50 }).notNull(), // Changed to varchar to support both subscription plans and credit pack IDs
  amount: int("amount").notNull(), // 订单金额(分)
  status: mysqlEnum("status", ["pending", "paid", "cancelled", "refunded"]).default("pending").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 20 }).default("alipay").notNull(), // alipay, wechat
  paidAt: timestamp("paidAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Credits transactions table - records all credit operations
 */
export const creditsTransactions = mysqlTable("creditsTransactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["consume", "purchase", "subscription_grant", "refund"]).notNull(),
  amount: int("amount").notNull(), // Positive for add, negative for deduct
  balancePurchased: int("balancePurchased").notNull(), // Balance after transaction
  balanceSubscription: int("balanceSubscription").notNull(), // Balance after transaction
  description: text("description").notNull(),
  relatedOrderId: int("relatedOrderId"), // Link to order if applicable
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CreditsTransaction = typeof creditsTransactions.$inferSelect;
export type InsertCreditsTransaction = typeof creditsTransactions.$inferInsert;

/**
 * Generated documents table - stores AI-generated documents (PDF/Word/PPT)
 */
export const generatedDocuments = mysqlTable("generatedDocuments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  conversationId: int("conversationId").notNull(),
  agentId: int("agentId").notNull(),
  fileId: varchar("fileId", { length: 100 }).notNull(), // e.g., "business_plan", "pitch_framework"
  fileName: varchar("fileName", { length: 255 }).notNull(), // e.g., "商业计划书（完整版）"
  fileType: mysqlEnum("fileType", ["heavy", "medium", "light"]).notNull(), // Determines credit cost
  format: mysqlEnum("format", ["pdf", "word"]).notNull(),
  fileUrl: text("fileUrl"), // S3 URL
  fileSize: int("fileSize"), // File size in bytes
  status: mysqlEnum("status", ["pending", "generating", "completed", "failed"]).default("pending").notNull(),
  creditsDeducted: int("creditsDeducted").notNull(), // 200/140/100
  expiresAt: timestamp("expiresAt").notNull(), // 7 days from creation
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GeneratedDocument = typeof generatedDocuments.$inferSelect;
export type InsertGeneratedDocument = typeof generatedDocuments.$inferInsert;

/**
 * Support tickets table - stores customer service requests
 */
export const supportTickets = mysqlTable("supportTickets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  conversationId: int("conversationId").notNull(), // Link to conversations table
  status: mysqlEnum("status", ["pending", "in_progress", "resolved"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["normal", "urgent"]).default("normal").notNull(),
  category: varchar("category", { length: 50 }), // e.g., "payment", "technical", "feature"
  internalNotes: text("internalNotes"), // Admin-only notes
  resolvedAt: timestamp("resolvedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SupportTicket = typeof supportTickets.$inferSelect;
export type InsertSupportTicket = typeof supportTickets.$inferInsert;
