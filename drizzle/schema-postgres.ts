import { pgTable, pgEnum, serial, varchar, text, timestamp, integer, boolean, index, uniqueIndex, bigint, jsonb } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// 定义枚举类型
export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "expired", "cancelled"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["free", "basic", "professional", "enterprise"]);
export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "cancelled", "refunded"]);
export const messageRoleEnum = pgEnum("message_role", ["user", "assistant", "system"]);
export const creditsTransactionTypeEnum = pgEnum("credits_transaction_type", ["consume", "purchase", "subscription_grant", "refund", "admin_adjustment"]);
export const documentStatusEnum = pgEnum("document_status", ["pending", "generating", "completed", "failed"]);
export const documentFormatEnum = pgEnum("document_format", ["pdf", "word"]);
export const documentTypeEnum = pgEnum("document_type", ["light", "medium", "heavy"]);
export const supportTicketStatusEnum = pgEnum("support_ticket_status", ["pending", "resolved"]);
export const supportTicketTypeEnum = pgEnum("support_ticket_type", ["technical", "account", "payment", "feature", "other"]);
export const referralStatusEnum = pgEnum("referral_status", ["pending", "completed"]);
export const withdrawalStatusEnum = pgEnum("withdrawal_status", ["pending", "approved", "rejected"]);

export const agents = pgTable("agents", {
	id: serial("id").primaryKey(),
	name: varchar("name", { length: 100 }).notNull(),
	description: text("description").notNull(),
	icon: varchar("icon", { length: 50 }).notNull(),
	systemPrompt: text("system_prompt").notNull(),
	inputFields: text("input_fields").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	welcomeMessage: text("welcome_message"),
});

export const conversations = pgTable("conversations", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	agentId: integer("agent_id").notNull(),
	title: varchar("title", { length: 200 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_conversations_user_id").on(table.userId),
	index("idx_conversations_agent_id").on(table.agentId),
	index("idx_conversations_user_agent_updated").on(table.userId, table.agentId, table.updatedAt),
]);

export const creditsTransactions = pgTable("credits_transactions", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	type: creditsTransactionTypeEnum("type").notNull(),
	amount: integer("amount").notNull(),
	balancePurchased: integer("balance_purchased").notNull(),
	balanceSubscription: integer("balance_subscription").notNull(),
	description: text("description").notNull(),
	relatedOrderId: integer("related_order_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_credits_transactions_user_id").on(table.userId),
	index("idx_credits_transactions_type").on(table.type),
	index("idx_credits_transactions_user_created").on(table.userId, table.createdAt),
]);

export const generatedDocuments = pgTable("generated_documents", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	conversationId: integer("conversation_id").notNull(),
	agentId: integer("agent_id").notNull(),
	fileId: varchar("file_id", { length: 100 }).notNull(),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	fileType: documentTypeEnum("file_type").notNull(),
	format: documentFormatEnum("format").notNull(),
	fileUrl: text("file_url"),
	fileSize: integer("file_size"),
	status: documentStatusEnum("status").default('pending').notNull(),
	creditsDeducted: integer("credits_deducted").notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_generated_documents_user_id").on(table.userId),
	index("idx_generated_documents_conversation_id").on(table.conversationId),
	index("idx_generated_documents_user_conversation_type").on(table.userId, table.conversationId, table.fileType),
]);

export const messages = pgTable("messages", {
	id: serial("id").primaryKey(),
	conversationId: integer("conversation_id").notNull(),
	role: messageRoleEnum("role").notNull(),
	content: text("content").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_messages_conversation_id").on(table.conversationId),
]);

export const orders = pgTable("orders", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	outTradeNo: varchar("out_trade_no", { length: 64 }).notNull(),
	tradeNo: varchar("trade_no", { length: 64 }),
	plan: varchar("plan", { length: 50 }).notNull(),
	amount: integer("amount").notNull(),
	status: orderStatusEnum("status").default('pending').notNull(),
	paymentMethod: varchar("payment_method", { length: 20 }).default('alipay').notNull(),
	paidAt: timestamp("paid_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_orders_out_trade_no_unique").on(table.outTradeNo),
	index("idx_orders_user_id").on(table.userId),
]);

export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	token: varchar("token", { length: 64 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	used: integer("used").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_password_reset_tokens_token").on(table.token),
]);

export const subscriptions = pgTable("subscriptions", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	plan: subscriptionPlanEnum("plan").default('free').notNull(),
	monthlyLimit: integer("monthly_limit").default(0).notNull(),
	price: integer("price").default(0).notNull(),
	status: subscriptionStatusEnum("status").default('active').notNull(),
	startDate: timestamp("start_date", { mode: 'string' }).defaultNow().notNull(),
	endDate: timestamp("end_date", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_subscriptions_user_id_unique").on(table.userId),
]);

export const supportTickets = pgTable("support_tickets", {
	id: serial("id").primaryKey(),
	userId: integer("user_id"),
	userName: varchar("user_name", { length: 100 }).notNull(),
	userEmail: varchar("user_email", { length: 320 }).notNull(),
	issueType: supportTicketTypeEnum("issue_type").notNull(),
	description: text("description").notNull(),
	attachmentUrl: text("attachment_url"),
	status: supportTicketStatusEnum("status").default('pending').notNull(),
	internalNotes: text("internal_notes"),
	resolvedAt: timestamp("resolved_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	wechat: varchar("wechat", { length: 100 }).default('').notNull(),
});

export const usageRecords = pgTable("usage_records", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	month: varchar("month", { length: 7 }).notNull(),
	usageCount: integer("usage_count").default(0).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const users = pgTable("users", {
	id: serial("id").primaryKey(),
	openId: varchar("open_id", { length: 64 }),
	name: text("name"),
	email: varchar("email", { length: 320 }),
	phone: varchar("phone", { length: 20 }),
	loginMethod: varchar("login_method", { length: 64 }),
	role: userRoleEnum("role").default('user').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	lastSignedIn: timestamp("last_signed_in", { mode: 'string' }).defaultNow().notNull(),
	creditsPurchased: integer("credits_purchased").default(0).notNull(),
	creditsSubscription: integer("credits_subscription").default(100).notNull(),
	creditsResetDate: timestamp("credits_reset_date", { mode: 'string' }).defaultNow().notNull(),
	username: varchar("username", { length: 64 }),
	password: varchar("password", { length: 255 }),
	referralCode: varchar("referral_code", { length: 20 }),
	commissionBalance: integer("commission_balance").default(0).notNull(),
	bindPhonePrompted: integer("bind_phone_prompted").default(0).notNull(),
	loginCount: integer("login_count").default(0).notNull(),
}, (table) => [
	uniqueIndex("idx_users_open_id_unique").on(table.openId),
	uniqueIndex("idx_users_email_unique").on(table.email),
	uniqueIndex("idx_users_username_unique").on(table.username),
	uniqueIndex("idx_users_phone_unique").on(table.phone),
]);

export const systemConfig = pgTable("system_config", {
	id: serial("id").primaryKey(),
	key: varchar("key", { length: 100 }).notNull(),
	value: text("value").notNull(),
	description: text("description"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_system_config_key_unique").on(table.key),
]);

export const referrals = pgTable("referrals", {
	id: serial("id").primaryKey(),
	referrerId: integer("referrer_id").notNull(),
	refereeId: integer("referee_id").notNull(),
	referralCode: varchar("referral_code", { length: 20 }).notNull(),
	referrerCreditsRewarded: integer("referrer_credits_rewarded").default(0).notNull(),
	refereeCreditsRewarded: integer("referee_credits_rewarded").default(0).notNull(),
	status: referralStatusEnum("status").default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("idx_referrals_referee_id_unique").on(table.refereeId),
]);

export const commissions = pgTable("commissions", {
	id: serial("id").primaryKey(),
	referrerId: integer("referrer_id").notNull(),
	refereeId: integer("referee_id").notNull(),
	orderId: varchar("order_id", { length: 64 }).notNull(),
	orderAmount: integer("order_amount").notNull(),
	commissionAmount: integer("commission_amount").notNull(),
	status: varchar("status", { length: 20 }).default('pending').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const withdrawals = pgTable("withdrawals", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	amount: integer("amount").notNull(),
	status: withdrawalStatusEnum("status").default('pending').notNull(),
	alipayAccount: varchar("alipay_account", { length: 100 }),
	processedAt: timestamp("processed_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// PPT生成相关表
export const pptDocuments = pgTable("ppt_documents", {
	id: serial("id").primaryKey(),
	userId: integer("user_id").notNull(),
	inputText: text("input_text").notNull(),
	theme: varchar("theme", { length: 50 }).notNull(),
	colorScheme: varchar("color_scheme", { length: 50 }).notNull(),
	status: varchar("status", { length: 20 }).default('pending').notNull(),
	s3Key: varchar("s3_key", { length: 500 }),
	s3Url: text("s3_url"),
	fileSize: integer("file_size"),
	creditsDeducted: integer("credits_deducted").notNull(),
	progress: integer("progress").default(0).notNull(),
	progressMessage: text("progress_message"),
	errorMessage: text("error_message"),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

// 短信验证码表
export const smsCodes = pgTable("sms_codes", {
	id: serial("id").primaryKey(),
	phone: varchar("phone", { length: 20 }).notNull(),
	code: varchar("code", { length: 6 }).notNull(),
	type: varchar("type", { length: 20 }).notNull().default('login'),
	used: integer("used").default(0).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_sms_codes_phone").on(table.phone),
]);

export const smsLogs = pgTable("sms_logs", {
	id: serial("id").primaryKey(),
	phone: varchar("phone", { length: 20 }).notNull(),
	type: varchar("type", { length: 20 }).notNull().default('login'),
	code: varchar("code", { length: 6 }).notNull(),
	status: varchar("status", { length: 20 }).default('pending').notNull(),
	aliyunCode: varchar("aliyun_code", { length: 20 }),
	aliyunMessage: text("aliyun_message"),
	errorReason: text("error_reason"),
	requestedAt: timestamp("requested_at", { mode: 'string' }).defaultNow().notNull(),
	respondedAt: timestamp("responded_at"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_sms_logs_phone").on(table.phone),
	index("idx_sms_logs_status").on(table.status),
]);
