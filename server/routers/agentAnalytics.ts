import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { agents, conversations, messages, users } from "../../drizzle/schema";
import { eq, sql, and, gte, desc, count, countDistinct } from "drizzle-orm";

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

// 时间范围枚举
const timeRangeSchema = z.enum(["today", "week", "month", "all"]);
type TimeRange = z.infer<typeof timeRangeSchema>;

// 获取时间范围的起始时间
function getStartDate(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case "today":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "week":
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      return weekAgo;
    case "month":
      const monthAgo = new Date(now);
      monthAgo.setDate(monthAgo.getDate() - 30);
      return monthAgo;
    case "all":
      return null;
  }
}

export const agentAnalyticsRouter = router({
  // 获取顾问热度排行榜
  getAgentRanking: adminProcedure
    .input(z.object({ timeRange: timeRangeSchema }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      const startDate = getStartDate(input.timeRange);

      // 获取所有顾问
      const allAgents = await db.select().from(agents);

      // 构建查询条件
      const dateCondition = startDate
        ? gte(conversations.createdAt, startDate.toISOString())
        : sql`1=1`;

      // 获取每个顾问的对话统计
      const conversationStats = await db
        .select({
          agentId: conversations.agentId,
          conversationCount: count(conversations.id),
          uniqueUsers: countDistinct(conversations.userId),
        })
        .from(conversations)
        .where(dateCondition)
        .groupBy(conversations.agentId);

      // 获取每个顾问的消息统计
      const messageStats = await db
        .select({
          agentId: conversations.agentId,
          messageCount: count(messages.id),
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(dateCondition)
        .groupBy(conversations.agentId);

      // 计算总对话数（用于计算占比）
      const totalConversations = conversationStats.reduce(
        (sum, stat) => sum + Number(stat.conversationCount),
        0
      );

      // 合并数据
      const agentRankings = allAgents.map((agent) => {
        const convStat = conversationStats.find((s) => s.agentId === agent.id);
        const msgStat = messageStats.find((s) => s.agentId === agent.id);

        const conversationCount = Number(convStat?.conversationCount || 0);
        const messageCount = Number(msgStat?.messageCount || 0);
        const uniqueUsers = Number(convStat?.uniqueUsers || 0);
        const avgRounds =
          conversationCount > 0
            ? Math.round((messageCount / conversationCount / 2) * 10) / 10
            : 0;
        const usagePercent =
          totalConversations > 0
            ? Math.round((conversationCount / totalConversations) * 1000) / 10
            : 0;

        return {
          id: agent.id,
          name: agent.name,
          icon: agent.icon,
          conversationCount,
          messageCount,
          uniqueUsers,
          avgRounds,
          usagePercent,
        };
      });

      // 按对话数排序
      agentRankings.sort((a, b) => b.conversationCount - a.conversationCount);

      // 添加排名和热度标签
      const rankedAgents = agentRankings.map((agent, index) => {
        let heatTag: "hot" | "rising" | "falling" | "cold" | "normal" = "normal";
        if (index < 3 && agent.conversationCount > 0) {
          heatTag = "hot";
        } else if (agent.conversationCount < 10) {
          heatTag = "cold";
        }

        return {
          ...agent,
          rank: index + 1,
          heatTag,
        };
      });

      return {
        agents: rankedAgents,
        totalConversations,
        timeRange: input.timeRange,
      };
    }),

  // 获取顾问7天趋势数据
  getAgentTrend: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "数据库连接失败",
      });
    }

    // 获取最近7天的日期列表
    const dates: string[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date.toISOString().split("T")[0]);
    }

    // 获取所有顾问
    const allAgents = await db.select({ id: agents.id, name: agents.name }).from(agents);

    // 获取最近7天每天每个顾问的对话数
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await db
      .select({
        agentId: conversations.agentId,
        date: sql<string>`DATE(${conversations.createdAt})`.as("date"),
        count: count(conversations.id),
      })
      .from(conversations)
      .where(gte(conversations.createdAt, sevenDaysAgo.toISOString()))
      .groupBy(conversations.agentId, sql`DATE(${conversations.createdAt})`);

    // 构建趋势数据
    const trendData = dates.map((date) => {
      const dayData: Record<string, number> = { date: new Date(date).getTime() };
      allAgents.forEach((agent) => {
        const stat = dailyStats.find(
          (s) => s.agentId === agent.id && s.date === date
        );
        dayData[`agent_${agent.id}`] = Number(stat?.count || 0);
      });
      return dayData;
    });

    // 计算每个顾问的7天总数和环比增长
    const agentTrends = allAgents.map((agent) => {
      const last7Days = dailyStats
        .filter((s) => s.agentId === agent.id)
        .reduce((sum, s) => sum + Number(s.count), 0);

      return {
        id: agent.id,
        name: agent.name,
        last7Days,
      };
    });

    // 按7天总数排序，取TOP5
    agentTrends.sort((a, b) => b.last7Days - a.last7Days);
    const top5Agents = agentTrends.slice(0, 5);

    return {
      dates,
      trendData,
      agents: allAgents,
      top5Agents,
    };
  }),

  // 获取单个顾问详情
  getAgentDetail: adminProcedure
    .input(z.object({ agentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "数据库连接失败",
        });
      }

      // 获取顾问信息
      const [agent] = await db
        .select()
        .from(agents)
        .where(eq(agents.id, input.agentId));

      if (!agent) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "顾问不存在",
        });
      }

      // 获取累计数据
      const [totalStats] = await db
        .select({
          conversationCount: count(conversations.id),
          uniqueUsers: countDistinct(conversations.userId),
        })
        .from(conversations)
        .where(eq(conversations.agentId, input.agentId));

      const [totalMessages] = await db
        .select({
          messageCount: count(messages.id),
        })
        .from(messages)
        .innerJoin(conversations, eq(messages.conversationId, conversations.id))
        .where(eq(conversations.agentId, input.agentId));

      // 获取今日数据
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const [todayStats] = await db
        .select({
          conversationCount: count(conversations.id),
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.agentId, input.agentId),
            gte(conversations.createdAt, today.toISOString())
          )
        );

      // 获取本周数据
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const [weekStats] = await db
        .select({
          conversationCount: count(conversations.id),
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.agentId, input.agentId),
            gte(conversations.createdAt, weekAgo.toISOString())
          )
        );

      // 获取本月数据
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const [monthStats] = await db
        .select({
          conversationCount: count(conversations.id),
        })
        .from(conversations)
        .where(
          and(
            eq(conversations.agentId, input.agentId),
            gte(conversations.createdAt, monthAgo.toISOString())
          )
        );

      // 获取首次使用该顾问的用户数（新用户使用率）
      const [firstUseStats] = await db
        .select({
          count: count(),
        })
        .from(
          db
            .select({
              userId: conversations.userId,
              firstAgentId: sql<number>`MIN(${conversations.agentId})`.as("firstAgentId"),
            })
            .from(conversations)
            .groupBy(conversations.userId)
            .as("first_conversations")
        )
        .where(sql`firstAgentId = ${input.agentId}`);

      const totalConversations = Number(totalStats.conversationCount);
      const totalMessageCount = Number(totalMessages.messageCount);
      const uniqueUsers = Number(totalStats.uniqueUsers);
      const avgRounds =
        totalConversations > 0
          ? Math.round((totalMessageCount / totalConversations / 2) * 10) / 10
          : 0;

      return {
        agent: {
          id: agent.id,
          name: agent.name,
          icon: agent.icon,
          description: agent.description,
        },
        stats: {
          total: {
            conversations: totalConversations,
            messages: totalMessageCount,
            uniqueUsers,
            avgRounds,
          },
          today: {
            conversations: Number(todayStats.conversationCount),
          },
          week: {
            conversations: Number(weekStats.conversationCount),
          },
          month: {
            conversations: Number(monthStats.conversationCount),
          },
          newUserRate:
            uniqueUsers > 0
              ? Math.round((Number(firstUseStats?.count || 0) / uniqueUsers) * 100)
              : 0,
        },
      };
    }),
});
