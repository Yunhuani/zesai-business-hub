import { mysqlTable, mysqlSchema, AnyMySqlColumn, int, varchar, text, timestamp, mysqlEnum, index, uniqueIndex, json, decimal } from "drizzle-orm/mysql-core"
import { sql } from "drizzle-orm"

export const agents = mysqlTable("agents", {
	id: int().autoincrement().primaryKey(),
	name: varchar({ length: 100 }).notNull(),
	description: text().notNull(),
	icon: varchar({ length: 50 }).notNull(),
	systemPrompt: text().notNull(),
	inputFields: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
	welcomeMessage: text(),
});

export const conversations = mysqlTable("conversations", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	agentId: int().notNull(),
	title: varchar({ length: 200 }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export const diagnoses = mysqlTable("diagnoses", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	productType: mysqlEnum(['preview','full']).default('preview').notNull(),
	intake: json().notNull(),
	status: mysqlEnum(['pending','running','done','error']).default('pending').notNull(),
	result: json(),
	headline: varchar({ length: 255 }),
	overallScore: decimal({ precision: 5, scale: 2, mode: 'number' }),
	scoreLabel: varchar({ length: 50 }),
	fullCreditsDeducted: int().default(0).notNull(),
	pdfPurchased: int().default(0).notNull(),
	pdfCreditsDeducted: int().default(0).notNull(),
	retryCount: int().default(0).notNull(),
	errorMessage: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export const creditsTransactions = mysqlTable("creditsTransactions", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	type: mysqlEnum(['consume','purchase','subscription_grant','refund']).notNull(),
	amount: int().notNull(),
	balancePurchased: int().notNull(),
	balanceSubscription: int().notNull(),
	description: text().notNull(),
	relatedOrderId: int(),
	relatedDiagnosisId: int(),
	billingKey: varchar({ length: 50 }),
	idempotencyKey: varchar({ length: 128 }),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	uniqueIndex("creditsTransactions_diagnosis_billing_unique").on(
		table.relatedDiagnosisId,
		table.billingKey
	),
	uniqueIndex("creditsTransactions_idempotency_unique").on(
		table.idempotencyKey
	),
]);

export const generatedDocuments = mysqlTable("generatedDocuments", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	conversationId: int().notNull(),
	agentId: int().notNull(),
	fileId: varchar({ length: 100 }).notNull(),
	fileName: varchar({ length: 255 }).notNull(),
	fileType: mysqlEnum(['heavy','medium','light']).notNull(),
	format: mysqlEnum(['pdf','word']).notNull(),
	fileUrl: text(),
	fileSize: int(),
	status: mysqlEnum(['pending','generating','completed','failed']).default('pending').notNull(),
	creditsDeducted: int().notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export const messages = mysqlTable("messages", {
	id: int().autoincrement().primaryKey(),
	conversationId: int().notNull(),
	role: mysqlEnum(['user','assistant','system']).notNull(),
	content: text().notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const orders = mysqlTable("orders", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	outTradeNo: varchar({ length: 64 }).notNull(),
	tradeNo: varchar({ length: 64 }),
	plan: varchar({ length: 50 }).notNull(),
	amount: int().notNull(),
	status: mysqlEnum(['pending','paid','cancelled','refunded']).default('pending').notNull(),
	paymentMethod: varchar({ length: 20 }).default('alipay').notNull(),
	paidAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
},
(table) => [
	index("orders_outTradeNo_unique").on(table.outTradeNo),
]);

export const pricingConfig = mysqlTable("pricingConfig", {
	id: int().autoincrement().primaryKey(),
	configKey: varchar({ length: 100 }).notNull(),
	category: mysqlEnum(['action','subscription','credit_pack']).notNull(),
	name: varchar({ length: 100 }).notNull(),
	credits: int(),
	priceCents: int(),
	monthlyCredits: int(),
	durationDays: int(),
	permanent: int().default(0).notNull(),
	enabled: int().default(1).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
},
(table) => [
	index("pricingConfig_configKey_unique").on(table.configKey),
]);

export const passwordResetTokens = mysqlTable("passwordResetTokens", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	token: varchar({ length: 64 }).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	used: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("token").on(table.token),
]);

export const subscriptions = mysqlTable("subscriptions", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	plan: mysqlEnum(['free','basic','professional','enterprise']).default('free').notNull(),
	monthlyLimit: int().default(0).notNull(),
	price: int().default(0).notNull(),
	status: mysqlEnum(['active','expired','cancelled']).default('active').notNull(),
	startDate: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	endDate: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export const supportTickets = mysqlTable("supportTickets", {
	id: int().autoincrement().primaryKey(),
	userId: int(),
	userName: varchar({ length: 100 }).notNull(),
	userEmail: varchar({ length: 320 }).notNull(),
	issueType: mysqlEnum(['technical','account','payment','feature','other']).notNull(),
	description: text().notNull(),
	attachmentUrl: text(),
	status: mysqlEnum(['pending','resolved']).default('pending').notNull(),
	internalNotes: text(),
	resolvedAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
	wechat: varchar({ length: 100 }).default('').notNull(),
});

export const usageRecords = mysqlTable("usageRecords", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	month: varchar({ length: 7 }).notNull(),
	usageCount: int().default(0).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

export const users = mysqlTable("users", {
	id: int().autoincrement().primaryKey(),
	openId: varchar({ length: 64 }),
	name: text(),
	email: varchar({ length: 320 }),
	phone: varchar({ length: 20 }),
	loginMethod: varchar({ length: 64 }),
	role: mysqlEnum(['user','admin']).default('user').notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
	lastSignedIn: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	creditsPurchased: int().default(0).notNull(),
	creditsSubscription: int().default(0).notNull(),
	trialCreditsGranted: int().default(0).notNull(),
	creditsResetDate: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	username: varchar({ length: 64 }),
	password: varchar({ length: 255 }),
	referralCode: varchar({ length: 20 }),
	commissionBalance: int().default(0).notNull(),
	bindPhonePrompted: int().default(0).notNull(),
	loginCount: int().default(0).notNull(),
},
(table) => [
		index("users_openId_unique").on(table.openId),
		index("users_email_unique").on(table.email),
		index("users_username_unique").on(table.username),
		index("users_phone_unique").on(table.phone),
	]);

/**
 * System configuration table - stores system-wide settings
 */
export const systemConfig = mysqlTable("systemConfig", {
	id: int().autoincrement().primaryKey(),
	key: varchar({ length: 100 }).notNull(),
	value: text().notNull(),
	description: text(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
},
(table) => [
	index("systemConfig_key_unique").on(table.key),
]);

/**
 * Referrals table - stores referral relationships between users
 */
export const referrals = mysqlTable("referrals", {
	id: int().autoincrement().primaryKey(),
	referrerId: int().notNull(),
	refereeId: int().notNull(),
	referralCode: varchar({ length: 20 }).notNull(),
	referrerCreditsRewarded: int().default(0).notNull(),
	refereeCreditsRewarded: int().default(0).notNull(),
	status: mysqlEnum(['pending','completed']).default('pending').notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
},
(table) => [
	index("referrals_refereeId_unique").on(table.refereeId),
]);

/**
 * Commissions table - stores referral commission records
 */
export const commissions = mysqlTable("commissions", {
	id: int().autoincrement().primaryKey(),
	referrerId: int().notNull(),
	refereeId: int().notNull(),
	orderId: varchar({ length: 64 }).notNull(),
	orderAmount: int().notNull(),
	commissionAmount: int().notNull(),
	commissionRate: int().default(10).notNull(),
	status: mysqlEnum(['pending','confirmed','paid','cancelled']).default('pending').notNull(),
	quarter: varchar({ length: 10 }),
	confirmedAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	availableAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	paidAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

/**
 * Withdrawals table - stores user withdrawal requests
 */
/**
 * SMS logs table - stores SMS sending records and tracking
 */
export const smsLogs = mysqlTable("smsLogs", {
	id: int().autoincrement().primaryKey(),
	phone: varchar({ length: 20 }).notNull(),
	type: mysqlEnum(['login','register','bind']).default('login').notNull(),
	code: varchar({ length: 6 }).notNull(),
	status: mysqlEnum(['pending','success','failed']).default('pending').notNull(),
	aliyunCode: varchar({ length: 20 }),
	aliyunMessage: text(),
	errorReason: text(),
	requestedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	respondedAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("smsLogs_phone_idx").on(table.phone),
	index("smsLogs_status_idx").on(table.status),
]);

/**
 * SMS verification codes table - stores phone verification codes
 */
export const smsCodes = mysqlTable("smsCodes", {
	id: int().autoincrement().primaryKey(),
	phone: varchar({ length: 20 }).notNull(),
	code: varchar({ length: 6 }).notNull(),
	type: mysqlEnum(['login','register','bind']).default('login').notNull(),
	used: int().default(0).notNull(),
	expiresAt: timestamp({ mode: 'string' }).notNull(),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
},
(table) => [
	index("smsCodes_phone_idx").on(table.phone),
]);

export const withdrawals = mysqlTable("withdrawals", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	amount: int().notNull(),
	method: mysqlEnum(['bank']).default('bank').notNull(),
	bankName: varchar({ length: 100 }).notNull(),
	bankBranch: varchar({ length: 200 }).notNull(),
	bankAccount: varchar({ length: 50 }).notNull(),
	realName: varchar({ length: 50 }).notNull(),
	idCard: varchar({ length: 18 }),
	status: mysqlEnum(['pending','processing','completed','rejected']).default('pending').notNull(),
	quarter: varchar({ length: 10 }),
	adminNote: text(),
	completedAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
});

/**
 * PPT Documents table - stores text-to-PPT generation tasks
 */
export const pptDocuments = mysqlTable("pptDocuments", {
	id: int().autoincrement().primaryKey(),
	userId: int().notNull(),
	title: varchar({ length: 255 }).notNull(),
	inputText: text().notNull(),
	themeStyle: varchar({ length: 50 }).default('business').notNull(),
	colorScheme: varchar({ length: 50 }).default('forest_gold').notNull(),
	slideCount: int().default(0).notNull(),
	fileUrl: text(),
	fileSize: int(),
	status: mysqlEnum(['pending','structuring','rendering','assembling','uploading','completed','failed']).default('pending').notNull(),
	errorMessage: text(),
	creditsDeducted: int().default(0).notNull(),
	outlineJson: text(),
	expiresAt: timestamp({ mode: 'string' }).default(sql`NULL`),
	createdAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).onUpdateNow().notNull(),
},
(table) => [
	index("pptDocuments_userId_idx").on(table.userId),
	index("pptDocuments_status_idx").on(table.status),
]);
