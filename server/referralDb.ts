import { eq, and, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import {
  referrals,
  commissions,
  withdrawals,
  systemConfig,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _client: ReturnType<typeof mysql.createPool> | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _client = mysql.createPool({
        uri: process.env.DATABASE_URL,
        ssl: {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true,
        },
      });
      _db = drizzle(_client) as unknown as ReturnType<typeof drizzle>;
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/**
 * 生成用户专属邀请码
 */
export function generateReferralCode(userId: number): string {
  const prefix = "ZESAI";
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${random}`;
}

/**
 * 获取或创建用户的邀请码
 */
export async function getOrCreateUserReferralCode(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user.length) throw new Error("User not found");

  if (user[0].referralCode) {
    return user[0].referralCode;
  }

  const code = generateReferralCode(userId);
  await db.update(users).set({ referralCode: code }).where(eq(users.id, userId));
  return code;
}

/**
 * 通过邀请码获取推荐人
 */
export async function getUserByReferralCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(users)
    .where(eq(users.referralCode, code))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * 创建推广关系
 */
export async function createReferral(
  referrerId: number,
  refereeId: number,
  referralCode: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(referrals).values({
    referrerId,
    refereeId,
    referralCode,
    status: "pending",
  });
}

/**
 * 获取推广关系（通过被推荐人ID）
 */
export async function getReferralByReferee(refereeId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(referrals)
    .where(eq(referrals.refereeId, refereeId))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

/**
 * 更新推广状态为已完成
 */
export async function completeReferral(referralId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(referrals)
    .set({ status: "completed" })
    .where(eq(referrals.id, referralId));
}

/**
 * 创建佣金记录
 */
export async function createCommission(data: {
  referrerId: number;
  refereeId: number;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  commissionRate: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(commissions).values({
    referrerId: data.referrerId,
    refereeId: data.refereeId,
    orderId: data.orderId,
    orderAmount: data.orderAmount.toString(),
    commissionAmount: data.commissionAmount.toString(),
    commissionRate: data.commissionRate.toString(),
    status: "pending",
    createdAt: new Date(),
  });
}

/**
 * 获取用户的推广统计数据
 */
export async function getReferralStats(userId: number) {
  const db = await getDb();
  if (!db) return null;

  // 获取推荐人数
  const referralList = await db
    .select()
    .from(referrals)
    .where(eq(referrals.referrerId, userId));

  const totalReferrals = referralList.length;
  const completedReferrals = referralList.filter((r) => r.status === "completed").length;

  // 获取佣金统计
  const commissionList = await db
    .select()
    .from(commissions)
    .where(eq(commissions.referrerId, userId));

  const totalCommission = commissionList.reduce(
    (sum, c) => sum + parseFloat(c.commissionAmount.toString()),
    0
  );

  const pendingCommission = commissionList
    .filter((c) => c.status === "pending")
    .reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0);

  const confirmedCommission = commissionList
    .filter((c) => c.status === "confirmed")
    .reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0);

  const paidCommission = commissionList
    .filter((c) => c.status === "paid")
    .reduce((sum, c) => sum + parseFloat(c.commissionAmount.toString()), 0);

  return {
    totalReferrals,
    completedReferrals,
    totalCommission,
    pendingCommission,
    confirmedCommission,
    paidCommission,
  };
}

/**
 * 获取用户的推荐列表
 */
export async function getUserReferrals(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const referralList = await db
    .select({
      id: referrals.id,
      refereeId: referrals.refereeId,
      status: referrals.status,
      createdAt: referrals.createdAt,
      refereeName: users.name,
      refereeEmail: users.email,
    })
    .from(referrals)
    .innerJoin(users, eq(referrals.refereeId, users.id))
    .where(eq(referrals.referrerId, userId))
    .orderBy(desc(referrals.createdAt));

  return referralList;
}

/**
 * 获取用户的佣金明细
 */
export async function getUserCommissions(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const commissionList = await db
    .select({
      id: commissions.id,
      orderId: commissions.orderId,
      orderAmount: commissions.orderAmount,
      commissionAmount: commissions.commissionAmount,
      status: commissions.status,
      confirmedAt: commissions.confirmedAt,
      availableAt: commissions.availableAt,
      createdAt: commissions.createdAt,
      refereeName: users.name,
    })
    .from(commissions)
    .innerJoin(users, eq(commissions.refereeId, users.id))
    .where(eq(commissions.referrerId, userId))
    .orderBy(desc(commissions.createdAt));

  return commissionList;
}

/**
 * 获取系统配置值
 */
export async function getSystemConfig(key: string): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, key))
    .limit(1);

  return result.length > 0 ? result[0].value : null;
}

/**
 * 设置系统配置值
 */
export async function setSystemConfig(key: string, value: string, description?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db
    .select()
    .from(systemConfig)
    .where(eq(systemConfig.key, key))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(systemConfig)
      .set({ value, description, updatedAt: new Date() })
      .where(eq(systemConfig.key, key));
  } else {
    await db.insert(systemConfig).values({
      key,
      value,
      description,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}

/**
 * 获取佣金比例（默认0.10=10%）
 */
export async function getCommissionRate(): Promise<number> {
  const rateStr = await getSystemConfig("commission_rate");
  return rateStr ? parseFloat(rateStr) : 0.1;
}

/**
 * 确认待处理的佣金（7天后）
 */
export async function confirmPendingCommissions() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // 查询7天前的pending佣金
  const pendingCommissions = await db
    .select()
    .from(commissions)
    .where(
      and(
        eq(commissions.status, "pending"),
        sql`${commissions.createdAt} < ${sevenDaysAgo}`
      )
    );

  for (const commission of pendingCommissions) {
    // 计算可提现时间（确认后3个月）
    const confirmedAt = new Date();
    const availableAt = new Date(confirmedAt.getTime() + 90 * 24 * 60 * 60 * 1000);

    await db
      .update(commissions)
      .set({
        status: "confirmed",
        confirmedAt,
        availableAt,
        updatedAt: new Date(),
      })
      .where(eq(commissions.id, commission.id));

    // 更新用户的可提现余额
    const user = await db
      .select()
      .from(users)
      .where(eq(users.id, commission.referrerId))
      .limit(1);

    if (user.length > 0) {
      const currentBalance = parseFloat(user[0].commissionBalance.toString());
      const newBalance = currentBalance + parseFloat(commission.commissionAmount.toString());

      await db
        .update(users)
        .set({ commissionBalance: newBalance.toString() })
        .where(eq(users.id, commission.referrerId));
    }
  }
}

/**
 * 创建提现申请
 */
export async function createWithdrawal(data: {
  userId: number;
  amount: number;
  bankName: string;
  bankBranch: string;
  bankAccount: string;
  realName: string;
  idCard?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(withdrawals).values({
    userId: data.userId,
    amount: data.amount.toString(),
    method: "bank",
    bankName: data.bankName,
    bankBranch: data.bankBranch,
    bankAccount: data.bankAccount,
    realName: data.realName,
    idCard: data.idCard,
    status: "pending",
    createdAt: new Date(),
  });
}

/**
 * 获取用户的提现记录
 */
export async function getUserWithdrawals(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const withdrawalList = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt));

  return withdrawalList;
}

/**
 * 获取所有待处理的提现申请（管理员）
 */
export async function getPendingWithdrawals() {
  const db = await getDb();
  if (!db) return [];

  const withdrawalList = await db
    .select({
      id: withdrawals.id,
      userId: withdrawals.userId,
      amount: withdrawals.amount,
      bankName: withdrawals.bankName,
      bankBranch: withdrawals.bankBranch,
      bankAccount: withdrawals.bankAccount,
      realName: withdrawals.realName,
      idCard: withdrawals.idCard,
      status: withdrawals.status,
      createdAt: withdrawals.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(withdrawals)
    .innerJoin(users, eq(withdrawals.userId, users.id))
    .where(eq(withdrawals.status, "pending"))
    .orderBy(desc(withdrawals.createdAt));

  return withdrawalList;
}

/**
 * 处理提现申请
 */
export async function processWithdrawal(
  withdrawalId: number,
  status: "completed" | "rejected",
  adminNote?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const completedAt = status === "completed" ? new Date() : null;

  await db
    .update(withdrawals)
    .set({
      status,
      adminNote,
      completedAt,
      updatedAt: new Date(),
    })
    .where(eq(withdrawals.id, withdrawalId));
}

/**
 * 取消佣金（用户退款时调用）
 */
export async function cancelCommission(orderId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const commission = await db
    .select()
    .from(commissions)
    .where(eq(commissions.orderId, orderId))
    .limit(1);

  if (commission.length > 0) {
    await db
      .update(commissions)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(commissions.orderId, orderId));

    // 如果已经确认，需要从用户余额中扣除
    if (commission[0].status === "confirmed") {
      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, commission[0].referrerId))
        .limit(1);

      if (user.length > 0) {
        const currentBalance = parseFloat(user[0].commissionBalance.toString());
        const newBalance = Math.max(
          0,
          currentBalance - parseFloat(commission[0].commissionAmount.toString())
        );

        await db
          .update(users)
          .set({ commissionBalance: newBalance.toString() })
          .where(eq(users.id, commission[0].referrerId));
      }
    }
  }
}


/**
 * 为用户添加积分（用于推广奖励）
 * 使用creditsManager.addPurchasedCredits确保交易记录被正确创建
 */
export async function addCredits(userId: number, amount: number, reason: string) {
  const { addPurchasedCredits } = await import("./creditsManager");
  await addPurchasedCredits(userId, amount);
  console.log(`[推荐奖励] 用户 ${userId} 获得 ${amount} 积分，原因：${reason}`);
}

/**
 * 创建推荐关系并发放奖励积分
 * @param referrerId 推荐人ID
 * @param refereeId 新用户ID
 * @param referralCode 推荐码
 */
export async function createReferralRelationship(
  referrerId: number,
  refereeId: number,
  referralCode: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // 1. 防止自己推荐自己
  if (referrerId === refereeId) {
    console.warn(`用户 ${referrerId} 尝试推荐自己，已阻止`);
    return;
  }

  // 2. 检查是否已存在推荐关系（防止重复奖励）
  const existing = await db
    .select()
    .from(referrals)
    .where(eq(referrals.refereeId, refereeId))
    .limit(1);

  if (existing.length > 0) {
    console.warn(`用户 ${refereeId} 已被推荐过，跳过奖励`);
    return;
  }

  // 3. 创建推荐关系记录
  await db.insert(referrals).values({
    referrerId,
    refereeId,
    referralCode,
    referrerCreditsRewarded: 200,
    refereeCreditsRewarded: 0,
    status: 'completed',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  // 4. 发放推荐人奖励（200积分）
  await addCredits(referrerId, 200, '推荐新用户奖励');
  console.log(`推荐人 ${referrerId} 获得200积分`);

  // 5. 新用户不再获得推荐积分奖励
  console.log(`新用户 ${refereeId} 注册成功（无推荐积分奖励）`);

  console.log(`推荐关系创建成功: 推荐人ID=${referrerId}, 新用户ID=${refereeId}`);
}
