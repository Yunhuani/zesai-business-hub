import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, subscriptions, conversations, messages, agents, diagnoses } from "../../drizzle/schema";
import { eq, desc, sql, count, countDistinct, and, gte, like, or } from "drizzle-orm";
import { addPurchasedCredits, deductCredits } from "../creditsManager";
import { getFailedOrders, getUserAccessStats } from "../db";
import { getDiagnosis, retryDiagnosisAsAdmin } from "../diagnosisService";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "需要管理员权限",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  listDiagnoses: adminProcedure
    .input(
      z.object({
        status: z.enum(["pending", "running", "done", "error"]).optional(),
        keyword: z.string().trim().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const conditions = [];
      if (input.status) {
        conditions.push(eq(diagnoses.status, input.status));
      }
      if (input.keyword) {
        const keyword = `%${input.keyword}%`;
        const diagnosisId = Number(input.keyword);
        const keywordCondition = Number.isInteger(diagnosisId) && diagnosisId > 0
          ? or(
              eq(diagnoses.id, diagnosisId),
              like(users.email, keyword),
              like(users.name, keyword)
            )
          : or(like(users.email, keyword), like(users.name, keyword));
        if (keywordCondition) conditions.push(keywordCondition);
      }
      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const [items, totalRows] = await Promise.all([
        db
          .select({
            id: diagnoses.id,
            userId: diagnoses.userId,
            userName: users.name,
            userEmail: users.email,
            productType: diagnoses.productType,
            status: diagnoses.status,
            headline: diagnoses.headline,
            overallScore: diagnoses.overallScore,
            scoreLabel: diagnoses.scoreLabel,
            retryCount: diagnoses.retryCount,
            fullCreditsDeducted: diagnoses.fullCreditsDeducted,
            pdfPurchased: diagnoses.pdfPurchased,
            pdfCreditsDeducted: diagnoses.pdfCreditsDeducted,
            errorMessage: diagnoses.errorMessage,
            createdAt: diagnoses.createdAt,
            updatedAt: diagnoses.updatedAt,
          })
          .from(diagnoses)
          .leftJoin(users, eq(diagnoses.userId, users.id))
          .where(where)
          .orderBy(desc(diagnoses.createdAt))
          .limit(input.limit)
          .offset(input.offset),
        db
          .select({ total: count(diagnoses.id) })
          .from(diagnoses)
          .leftJoin(users, eq(diagnoses.userId, users.id))
          .where(where),
      ]);

      return {
        items: items.map(item => ({
          ...item,
          pdfPurchased: item.pdfPurchased === 1,
        })),
        total: Number(totalRows[0]?.total ?? 0),
      };
    }),

  getDiagnosisReport: adminProcedure
    .input(z.object({ diagnosisId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const diagnosis = await getDiagnosis(input.diagnosisId);
      if (!diagnosis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "诊断不存在" });
      }

      return {
        id: diagnosis.id,
        status: diagnosis.status,
        productType: diagnosis.productType,
        fullAccess: true,
        pdfPurchased: diagnosis.pdfPurchased === 1,
        intake: diagnosis.intake,
        result: diagnosis.result,
        headline: diagnosis.headline,
        overallScore: diagnosis.overallScore,
        scoreLabel: diagnosis.scoreLabel,
        createdAt: diagnosis.createdAt,
        ...(diagnosis.status === "error"
          ? { errorMessage: diagnosis.errorMessage }
          : {}),
      };
    }),

  retryDiagnosis: adminProcedure
    .input(z.object({ diagnosisId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      try {
        return await retryDiagnosisAsAdmin(input.diagnosisId);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Diagnosis not found") {
          throw new TRPCError({ code: "NOT_FOUND", message });
        }
        if (message === "Diagnosis retry limit reached") {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
        }
        if (
          message === "Diagnosis is not retryable" ||
          message === "Diagnosis intake is invalid"
        ) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message });
        }
        throw error;
      }
    }),

  listUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "数据库连接失败",
      });
    }

    // Get all users
    const allUsers = await db.select().from(users);
    
    // Get all active subscriptions
    const allSubscriptions = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
    
    // Merge user data with subscription data
    const usersWithSubscriptions = allUsers.map(user => {
      const userSubscription = allSubscriptions.find(sub => sub.userId === user.id);
      return {
        ...user,
        subscription: userSubscription || null,
      };
    });
    
    return usersWithSubscriptions;
  }),

  adjustUserCredits: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        amount: z.number().min(-10000, "单次最多扣附10000积分").max(10000, "单次最多增加10000积分"),
        reason: z.string().min(1, "请填写操作备注"),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, amount, reason } = input;

      // Validate amount is not zero
      if (amount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "调整积分数量不能为0",
        });
      }

      if (amount > 0) {
        // Add purchased credits
        await addPurchasedCredits(userId, amount);
      } else if (amount < 0) {
        // Deduct credits
        const result = await deductCredits(userId, Math.abs(amount), reason);
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "积分不足，无法扣除",
          });
        }
      }

      return {
        success: true,
      };
    }),

  getFailedOrders: adminProcedure.query(async () => {
    const failedOrders = await getFailedOrders();
    const db = await getDb();
    if (!db) return [];
    
    // Enrich with user info
    const ordersWithUsers = await Promise.all(
      failedOrders.map(async (order) => {
        const user = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
        return {
          ...order,
          user: user[0] || null,
        };
      })
    );
    
    return ordersWithUsers;
  }),

  getUserAccessStats: adminProcedure.query(async () => {
    const stats = await getUserAccessStats();
    return stats;
  }),

  // 获取用户详情（包含Agent访问记录）
  getUserDetail: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 获取用户基本信息
      const [user] = await db.select().from(users).where(eq(users.id, input.userId));
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "用户不存在",
        });
      }

      // 获取用户订阅信息
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(and(eq(subscriptions.userId, input.userId), eq(subscriptions.status, "active")));

      // 获取用户的Agent访问记录（按Agent分组统计）
      const agentStats = await db
        .select({
          agentId: conversations.agentId,
          agentName: agents.name,
          agentIcon: agents.icon,
          conversationCount: count(conversations.id),
          lastVisit: sql<string>`MAX(${conversations.createdAt})`.as("lastVisit"),
        })
        .from(conversations)
        .innerJoin(agents, eq(conversations.agentId, agents.id))
        .where(eq(conversations.userId, input.userId))
        .groupBy(conversations.agentId, agents.name, agents.icon)
        .orderBy(desc(sql`MAX(${conversations.createdAt})`));

      // 获取每个Agent的消息数
      const messageStats = await db
        .select({
          agentId: conversations.agentId,
          messageCount: count(messages.id),
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(eq(conversations.userId, input.userId))
        .groupBy(conversations.agentId);

      // 合并数据
      const agentVisits = agentStats.map((stat) => {
        const msgStat = messageStats.find((m) => m.agentId === stat.agentId);
        return {
          agentId: stat.agentId,
          agentName: stat.agentName,
          agentIcon: stat.agentIcon,
          conversationCount: Number(stat.conversationCount),
          messageCount: Number(msgStat?.messageCount || 0),
          lastVisit: stat.lastVisit,
        };
      });

      // 获取最近10条对话记录
      const recentConversations = await db
        .select({
          id: conversations.id,
          agentId: conversations.agentId,
          agentName: agents.name,
          agentIcon: agents.icon,
          title: conversations.title,
          createdAt: conversations.createdAt,
        })
        .from(conversations)
        .innerJoin(agents, eq(conversations.agentId, agents.id))
        .where(eq(conversations.userId, input.userId))
        .orderBy(desc(conversations.createdAt))
        .limit(10);

      // 统计总数据
      const totalConversations = agentVisits.reduce((sum, a) => sum + a.conversationCount, 0);
      const totalMessages = agentVisits.reduce((sum, a) => sum + a.messageCount, 0);

      return {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          lastSignedIn: user.lastSignedIn,
          creditsSubscription: user.creditsSubscription,
          creditsPurchased: user.creditsPurchased,
        },
        subscription: subscription || null,
        stats: {
          totalConversations,
          totalMessages,
          agentCount: agentVisits.length,
        },
        agentVisits,
        recentConversations,
      };
    }),
});
