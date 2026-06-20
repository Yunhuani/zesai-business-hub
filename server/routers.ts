import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { getWechatAuthUrl, getWechatAccessToken, getWechatUserInfo } from "./wechat";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { paymentRouter } from "./routers/payment";
import { exportRouter } from "./routers/export";
import { documentRouter } from "./routers/document";
import { adminRouter } from "./routers/admin";
import { supportRouter } from "./routers/support";
import { passwordResetRouter } from "./routers/passwordReset";
import { wechatPayCallbackRouter } from "./routers/wechatPayCallback";
import { referralRouter } from "./routers/referral";
import { sentryRouter } from "./routers/sentry";
import { agentAnalyticsRouter } from "./routers/agentAnalytics";
import { knowledgeRouter } from "./routers/knowledge";
import { pptGenerationRouter } from "./routers/pptGeneration";


const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "仅管理员可访问" });
  }
  return next({ ctx });
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    getWechatAuthUrl: publicProcedure
      .input(z.object({ redirectUri: z.string() }))
      .query(({ input }) => {
        return { url: getWechatAuthUrl(input.redirectUri) };
      }),
    wechatCallback: publicProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        try {
          const { upsertUser, getUserByOpenId } = await import("./db");
          
          // Exchange code for access token
          const { access_token, openid } = await getWechatAccessToken(input.code);
          
          // Get user info
          const userInfo = await getWechatUserInfo(access_token, openid);
          
          // Create or update user
          const wechatOpenId = `wechat_${userInfo.openid}`;
          await upsertUser({
            openId: wechatOpenId,
            name: userInfo.nickname,
            loginMethod: "wechat",
            lastSignedIn: new Date(),
          });
          
          // Get user from database
          const user = await getUserByOpenId(wechatOpenId);
          if (!user) {
            throw new Error("Failed to create user");
          }
          
          // Create session token and set cookie
          const sessionToken = await sdk.createSessionToken(wechatOpenId, {
            name: userInfo.nickname || "",
            expiresInMs: ONE_YEAR_MS,
          });
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          
          return { success: true, user };
        } catch (error) {
          console.error("WeChat login error:", error);
          throw new Error("WeChat login failed");
        }
      }),
    // Email/Password registration
    registerWithEmail: publicProcedure
      .input(z.object({ 
        email: z.string().email("请输入有效的邮箱地址"),
        password: z.string().min(6, "密码至少6位").max(50),
        name: z.string().optional(),
        referralCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { registerUserWithEmail } = await import("./passwordAuth");
        
        try {
          // Register user with email and password
          const result = await registerUserWithEmail(input.email, input.password, input.name, input.referralCode);
          
          if (!result || !result.user) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "注册失败",
            });
          }
          
          // Return token instead of setting cookie
          return { success: true, user: result.user, token: result.token };
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "注册失败",
          });
        }
      }),
    // Email/Password login
    loginWithEmail: publicProcedure
      .input(z.object({ 
        email: z.string().email("请输入有效的邮箱地址"),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { loginUserWithEmail } = await import("./passwordAuth");
        
        try {
          // Login user with email and password
          const result = await loginUserWithEmail(input.email, input.password);
          
          if (!result || !result.user) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "邮箱或密码错误",
            });
          }
          
          // Return token instead of setting cookie
          return { success: true, user: result.user, token: result.token };
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "登录失败",
          });
        }
      }),
    // Username/Password registration
    register: publicProcedure
      .input(z.object({ 
        username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/, "用户名只能包含字母、数字和下划线"),
        password: z.string().min(6).max(50),
        name: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { registerUser } = await import("./passwordAuth");
        
        try {
          // Register user
          const result = await registerUser(input.username, input.password, input.name);
          
          if (!result || !result.user) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "注册失败",
            });
          }
          
          // Return token instead of setting cookie
          return { success: true, user: result.user, token: result.token };
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "注册失败",
          });
        }
      }),
    // Username/Password login
    login: publicProcedure
      .input(z.object({ 
        username: z.string(),
        password: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { loginUser } = await import("./passwordAuth");
        
        try {
          // Login user
          const result = await loginUser(input.username, input.password);
          
          if (!result || !result.user) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "用户名或密码错误",
            });
          }
          
          // Return token instead of setting cookie
          return { success: true, user: result.user, token: result.token };
        } catch (error) {
          if (error instanceof Error) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: error.message,
            });
          }
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "登录失败",
          });
        }
      }),

  }),

  // Admin routes
  admin: router({
    ...adminRouter._def.procedures,
    // Agent management
    agents: router({
      list: adminProcedure.query(async () => {
        const { getAllAgents } = await import("./db");
        return getAllAgents();
      }),
      update: adminProcedure.input((val: unknown) => {
        if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "number") {
          return val as { id: number; name?: string; description?: string; icon?: string; systemPrompt?: string; inputFields?: string };
        }
        throw new Error("Invalid input");
      }).mutation(async ({ input }) => {
        const { updateAgent } = await import("./db");
        await updateAgent(input.id, input);
        return { success: true };
      }),
    }),
    // User statistics
    stats: router({
      overview: adminProcedure.query(async () => {
        const { getDb } = await import("./db");
        const { users, conversations, subscriptions } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) return { totalUsers: 0, totalConversations: 0, activeSubscriptions: 0 };

        const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
        const [convCount] = await db.select({ count: sql<number>`count(*)` }).from(conversations);
        const [subCount] = await db.select({ count: sql<number>`count(*)` }).from(subscriptions).where(sql`status = 'active'`);

        return {
          totalUsers: Number(userCount.count),
          totalConversations: Number(convCount.count),
          activeSubscriptions: Number(subCount.count),
        };
      }),
      dashboard: adminProcedure.query(async () => {
        const { getDb } = await import("./db");
        const { users, conversations, subscriptions, orders } = await import("../drizzle/schema");
        const { sql } = await import("drizzle-orm");
        const { startOfDay, startOfWeek, startOfMonth, subDays, format } = await import("date-fns");
        const db = await getDb();
        if (!db) {
          return {
            users: { total: 0, today: 0, thisWeek: 0, thisMonth: 0, weekOverWeek: 0 },
            conversations: { total: 0, today: 0, thisWeek: 0, thisMonth: 0, weekOverWeek: 0 },
            revenue: { total: 0, today: 0, thisWeek: 0, thisMonth: 0, weekOverWeek: 0 },
            subscriptions: { free: 0, basic: 0, professional: 0, enterprise: 0 },
            dailyTrend: [],
            revenueTrend: [],
            conversionRate: 0,
          };
        }

        const today = startOfDay(new Date());
        const thisWeek = startOfWeek(new Date(), { weekStartsOn: 1 });
        const thisMonth = startOfMonth(new Date());
        const lastWeekStart = startOfWeek(subDays(new Date(), 7), { weekStartsOn: 1 });
        const lastWeekEnd = thisWeek;

        const todayISO = today.toISOString();
        const weekISO = thisWeek.toISOString();
        const monthISO = thisMonth.toISOString();
        const lastWeekStartISO = lastWeekStart.toISOString();
        const lastWeekEndISO = lastWeekEnd.toISOString();

        // Core metrics: users
        const [totalUsersRow] = await db.select({ count: sql<number>`count(*)` }).from(users);
        const usersTotal = Number(totalUsersRow.count);
        const [usersTodayRow] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`created_at >= ${todayISO}`);
        const [usersWeekRow] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`created_at >= ${weekISO}`);
        const [usersMonthRow] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`created_at >= ${monthISO}`);
        const [usersLastWeekRow] = await db.select({ count: sql<number>`count(*)` }).from(users)
          .where(sql`created_at >= ${lastWeekStartISO} and created_at < ${lastWeekEndISO}`);

        // Core metrics: conversations
        const [totalConvRow] = await db.select({ count: sql<number>`count(*)` }).from(conversations);
        const convTotal = Number(totalConvRow.count);
        const [convTodayRow] = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(sql`created_at >= ${todayISO}`);
        const [convWeekRow] = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(sql`created_at >= ${weekISO}`);
        const [convMonthRow] = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(sql`created_at >= ${monthISO}`);
        const [convLastWeekRow] = await db.select({ count: sql<number>`count(*)` }).from(conversations)
          .where(sql`created_at >= ${lastWeekStartISO} and created_at < ${lastWeekEndISO}`);

        // Core metrics: revenue (from paid orders, amount in cents)
        const [revenueTotalRow] = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(orders).where(sql`status = 'paid'`);
        const [revenueTodayRow] = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(orders).where(sql`status = 'paid' and paid_at >= ${todayISO}`);
        const [revenueWeekRow] = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(orders).where(sql`status = 'paid' and paid_at >= ${weekISO}`);
        const [revenueMonthRow] = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(orders).where(sql`status = 'paid' and paid_at >= ${monthISO}`);
        const [revenueLastWeekRow] = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(orders)
          .where(sql`status = 'paid' and paid_at >= ${lastWeekStartISO} and paid_at < ${lastWeekEndISO}`);

        const revenueTotal = Number(revenueTotalRow.sum);
        const revenueToday = Number(revenueTodayRow.sum);
        const revenueThisWeek = Number(revenueWeekRow.sum);
        const revenueThisMonth = Number(revenueMonthRow.sum);
        const revenueLastWeek = Number(revenueLastWeekRow.sum);

        // Week-over-week percentages
        const usersLastWeekCount = Number(usersLastWeekRow.count);
        const convLastWeekCount = Number(convLastWeekRow.count);
        const usersWow = usersLastWeekCount ? Math.round(((Number(usersWeekRow.count) - usersLastWeekCount) / Math.max(usersLastWeekCount, 1)) * 100) : 0;
        const convWow = convLastWeekCount ? Math.round(((Number(convWeekRow.count) - convLastWeekCount) / Math.max(convLastWeekCount, 1)) * 100) : 0;
        const revenueWow = revenueLastWeek ? Math.round(((revenueThisWeek - revenueLastWeek) / Math.max(revenueLastWeek, 1)) * 100) : 0;

        // Subscription distribution
        const subDist = await db.select({ plan: subscriptions.plan, count: sql<number>`count(*)` }).from(subscriptions).where(sql`status = 'active'`).groupBy(subscriptions.plan);
        const subMap: Record<string, number> = { free: 0, basic: 0, professional: 0, enterprise: 0 };
        for (const row of subDist) subMap[row.plan] = Number(row.count);

        // 7-day daily trend
        const dailyTrend: Array<{ date: string; newUsers: number; conversations: number; revenue: number }> = [];
        for (let i = 6; i >= 0; i--) {
          const dayStart = startOfDay(subDays(new Date(), i));
          const dayEnd = startOfDay(subDays(new Date(), i - 1));
          const dateStr = format(dayStart, "MM/dd");
          const dsISO = dayStart.toISOString();
          const deISO = dayEnd.toISOString();

          const [u] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`created_at >= ${dsISO} and created_at < ${deISO}`);
          const [c] = await db.select({ count: sql<number>`count(*)` }).from(conversations).where(sql`created_at >= ${dsISO} and created_at < ${deISO}`);
          const [r] = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(orders)
            .where(sql`status = 'paid' and paid_at >= ${dsISO} and paid_at < ${deISO}`);

          dailyTrend.push({ date: dateStr, newUsers: Number(u.count), conversations: Number(c.count), revenue: Number(r.sum) });
        }

        // 30-day revenue trend
        const revenueTrend: Array<{ date: string; amount: number }> = [];
        for (let i = 29; i >= 0; i--) {
          const dayStart = startOfDay(subDays(new Date(), i));
          const dayEnd = startOfDay(subDays(new Date(), i - 1));
          const dateStr = format(dayStart, "MM/dd");
          const dsISO = dayStart.toISOString();
          const deISO = dayEnd.toISOString();

          const [r] = await db.select({ sum: sql<number>`coalesce(sum(amount), 0)` }).from(orders)
            .where(sql`status = 'paid' and paid_at >= ${dsISO} and paid_at < ${deISO}`);

          revenueTrend.push({ date: dateStr, amount: Number(r.sum) });
        }

        // Conversion rate: paid users / total users
        const [paidUsersRow] = await db.select({ count: sql<number>`count(distinct user_id)` }).from(orders).where(sql`status = 'paid'`);
        const conversionRate = usersTotal > 0 ? Number((Number(paidUsersRow.count) / usersTotal * 100).toFixed(1)) : 0;

        return {
          users: { total: usersTotal, today: Number(usersTodayRow.count), thisWeek: Number(usersWeekRow.count), thisMonth: Number(usersMonthRow.count), weekOverWeek: usersWow },
          conversations: { total: convTotal, today: Number(convTodayRow.count), thisWeek: Number(convWeekRow.count), thisMonth: Number(convMonthRow.count), weekOverWeek: convWow },
          revenue: { total: revenueTotal, today: revenueToday, thisWeek: revenueThisWeek, thisMonth: revenueThisMonth, weekOverWeek: revenueWow },
          subscriptions: subMap,
          dailyTrend,
          revenueTrend,
          conversionRate,
        };
      }),
      users: adminProcedure.query(async () => {
        const { getDb } = await import("./db");
        const { users, subscriptions } = await import("../drizzle/schema");
        const db = await getDb();
        if (!db) return [];
        
        const allUsers = await db.select().from(users).orderBy(users.createdAt);
        const allSubs = await db.select().from(subscriptions);
        
        return allUsers.map(user => {
          const sub = allSubs.find(s => s.userId === user.id);
          return {
            ...user,
            subscription: sub || null,
          };
        });
      }),
    }),
    // Agent analytics
    agentAnalytics: agentAnalyticsRouter,
  }),

  // Agent routes
  agent: router({
    list: publicProcedure.query(async () => {
      const { getAllAgents } = await import("./db");
      return getAllAgents();
    }),
    getById: publicProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "number") {
        return val as { id: number };
      }
      throw new Error("Invalid input: expected { id: number }");
    }).query(async ({ input }) => {
      const { getAgentById } = await import("./db");
      return getAgentById(input.id);
    }),
  }),

  // Conversation routes
  conversation: router({
    create: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "agentId" in val && "title" in val && typeof val.agentId === "number" && typeof val.title === "string") {
        return val as { agentId: number; title: string };
      }
      throw new Error("Invalid input: expected { agentId: number, title: string }");
    }).mutation(async ({ ctx, input }) => {
      const { createConversation } = await import("./db");
      return createConversation({
        userId: ctx.user.id,
        agentId: input.agentId,
        title: input.title,
      });
    }),
    list: protectedProcedure.query(async ({ ctx }) => {
      const { getUserConversations } = await import("./db");
      return getUserConversations(ctx.user.id);
    }),
    getById: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "id" in val && typeof val.id === "number") {
        return val as { id: number };
      }
      throw new Error("Invalid input: expected { id: number }");
    }).query(async ({ ctx, input }) => {
      const { getConversationById } = await import("./db");
      const conversation = await getConversationById(input.id);
      // 安全：校验对话是否属于当前用户
      if (conversation && conversation.userId !== ctx.user.id) {
        throw new Error("Unauthorized: 无权访问此对话");
      }
      return conversation;
    }),
    getLatestByAgent: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "agentId" in val && typeof val.agentId === "number") {
        return val as { agentId: number };
      }
      throw new Error("Invalid input: expected { agentId: number }");
    }).query(async ({ ctx, input }) => {
      const { getLatestConversationByAgent } = await import("./db");
      return getLatestConversationByAgent(ctx.user.id, input.agentId);
    }),
  }),

  // Subscription routes
  subscription: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSubscription } = await import("./db");
      const { getUserCredits, PLAN_CREDITS } = await import("./creditsManager");
      const subscription = await getUserSubscription(ctx.user.id);
      const credits = await getUserCredits(ctx.user.id);
      
      // Get plan credits limit
      const plan = subscription?.plan || "free";
      const planCreditsLimit = PLAN_CREDITS[plan as keyof typeof PLAN_CREDITS] || PLAN_CREDITS.free;
      
      return { 
        subscription, 
        credits: {
          purchased: credits.purchased,
          subscription: credits.subscription,
          total: credits.total,
          planLimit: planCreditsLimit,
          resetDate: credits.resetDate,
          nextResetIn: credits.nextResetIn,
        }
      };
    }),
    upgrade: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "plan" in val && typeof val.plan === "string") {
        return val as { plan: "basic" | "professional" | "enterprise" };
      }
      throw new Error("Invalid input: expected { plan: 'basic' | 'professional' | 'enterprise' }");
    }).mutation(async ({ ctx, input }) => {
      const { createOrUpdateSubscription } = await import("./db");
      
      const plans = {
        basic: { limit: 10, price: 9900 },
        professional: { limit: 50, price: 29900 },
        enterprise: { limit: 0, price: 99900 },
      };
      
      const plan = plans[input.plan];
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      
      await createOrUpdateSubscription({
        userId: ctx.user.id,
        plan: input.plan,
        // monthlyLimit removed - using credits system
        price: plan.price,
        endDate,
      });
      
      return { success: true };
    }),
  }),

  // Payment routes
  payment: paymentRouter,
  
  // WeChat Pay callback routes
  wechatPayCallback: wechatPayCallbackRouter,

  // Export routes
  export: exportRouter,
  
  // Document routes
  document: documentRouter,

  // Support routes
  support: supportRouter,

  // Message routes
  message: router({
    sendWelcome: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "conversationId" in val && "agentId" in val && typeof val.conversationId === "number" && typeof val.agentId === "number") {
        return val as { conversationId: number; agentId: number };
      }
      throw new Error("Invalid input: expected { conversationId: number, agentId: number }");
    }).mutation(async ({ ctx, input }) => {
      const { createMessage, getAgentById } = await import("./db");
      
      const agent = await getAgentById(input.agentId);
      if (!agent) throw new Error("Agent not found");
      
      // 如果agent有welcomeMessage，使用它；否则不发送欢迎消息
      if (!agent.welcomeMessage) {
        return { content: null };
      }
      
      // 保存欢迎消息
      await createMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: agent.welcomeMessage,
      });
      
      return { content: agent.welcomeMessage };
    }),
    send: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "conversationId" in val && "content" in val && typeof val.conversationId === "number" && typeof val.content === "string") {
        return val as { conversationId: number; content: string; userInputs?: Record<string, string> };
      }
      throw new Error("Invalid input: expected { conversationId: number, content: string, userInputs?: Record<string, string> }");
    }).mutation(async ({ ctx, input }) => {
      const { createMessage, getConversationMessages, getConversationById, getAgentByIdFull } = await import("./db");
      const { checkCredits, deductCredits, CREDITS_COST, checkAndResetCredits, getUserCredits } = await import("./creditsManager");
      
      // Check and reset credits if needed
      await checkAndResetCredits(ctx.user.id);
      
      // Check if user has enough credits
      const hasCredits = await checkCredits(ctx.user.id, CREDITS_COST.BASIC_CHAT);
      if (!hasCredits) {
        const credits = await getUserCredits(ctx.user.id);
        throw new TRPCError({ 
          code: "FORBIDDEN", 
          message: JSON.stringify({
            error: "INSUFFICIENT_CREDITS",
            credits: credits,
            required: CREDITS_COST.BASIC_CHAT
          })
        });
      }
      
      const { invokeLLM } = await import("./_core/llm");

      // Get conversation and agent
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) throw new Error("Conversation not found");
      if (conversation.userId !== ctx.user.id) throw new Error("Unauthorized");

      const agent = await getAgentByIdFull(conversation.agentId);
      if (!agent) throw new Error("Agent not found");

      // Save user message
      await createMessage({
        conversationId: input.conversationId,
        role: "user",
        content: input.content,
      });

      // Get conversation history
      const history = await getConversationMessages(input.conversationId);
      const messages = history.map(msg => ({
        role: msg.role as "system" | "user" | "assistant",
        content: msg.content,
      }));

      // Build system prompt with global rules + agent-specific prompt + user inputs
      const { getGlobalPromptRules } = await import("../shared/promptRules");
      
      let systemPrompt = `${getGlobalPromptRules()}\n\n## 专业角色\n${agent.systemPrompt}`;
      
      if (input.userInputs) {
        const inputFields = JSON.parse(agent.inputFields) as Array<{ name: string; label: string }>;
        const inputContext = inputFields
          .map(field => `${field.label}: ${input.userInputs![field.name] || "未提供"}`) 
          .join("\n");
        systemPrompt = `${systemPrompt}\n\n## 用户提供的信息\n${inputContext}`;
      }

      // Call LLM
      const response = await invokeLLM({
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.filter(m => m.role !== "system"),
        ],
      });

      const rawContent = response.choices[0]?.message?.content;
      const assistantMessage = typeof rawContent === "string" ? rawContent : "抱歉,我无法生成回复。";

      // Save assistant message
      await createMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: assistantMessage,
      });
      
      // Deduct credits
      await deductCredits(ctx.user.id, CREDITS_COST.BASIC_CHAT, `基础对话 - Conversation #${input.conversationId}`);

      return { content: assistantMessage };
    }),
    list: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "conversationId" in val && typeof val.conversationId === "number") {
        return val as { conversationId: number };
      }
      throw new Error("Invalid input: expected { conversationId: number }");
    }).query(async ({ ctx, input }) => {
      const { getConversationMessages, getConversationById } = await import("./db");
      
      // Verify ownership
      const conversation = await getConversationById(input.conversationId);
      if (!conversation) throw new Error("Conversation not found");
      if (conversation.userId !== ctx.user.id) throw new Error("Unauthorized");

      return getConversationMessages(input.conversationId);
    }),
  }),
  
  // Credits management
  credits: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getUserCredits } = await import("./creditsManager");
      return await getUserCredits(ctx.user.id);
    }),
    history: protectedProcedure
      .input(z.object({ limit: z.number().optional(), offset: z.number().optional() }).optional())
      .query(async ({ ctx, input }) => {
        const { getTransactionHistory } = await import("./creditsManager");
        return await getTransactionHistory(ctx.user.id, input || {});
      }),
    subscription: protectedProcedure.query(async ({ ctx }) => {
      const { subscriptions } = await import("../drizzle/schema");
      const { eq, desc } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) return null;
      
      const [subscription] = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .orderBy(desc(subscriptions.createdAt))
        .limit(1);
      
      return subscription || null;
    }),
  }),
  
  // Order management
  order: router({
    list: adminProcedure.query(async () => {
      const { orders, users } = await import("../drizzle/schema");
      const { desc, eq } = await import("drizzle-orm");
      const db = await (await import("./db")).getDb();
      if (!db) return [];
      
      // Join orders with users to get user information
      const result = await db
        .select({
          id: orders.id,
          userId: orders.userId,
          userName: users.name,
          userEmail: users.email,
          outTradeNo: orders.outTradeNo,
          plan: orders.plan,
          amount: orders.amount,
          paymentMethod: orders.paymentMethod,
          status: orders.status,
          createdAt: orders.createdAt,
          updatedAt: orders.updatedAt,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt));
      
      // 确保日期以ISO格式字符串返回，避免时区转换问题
      return result.map(order => ({
        ...order,
        createdAt: order.createdAt instanceof Date ? order.createdAt.toISOString() : order.createdAt,
        updatedAt: order.updatedAt instanceof Date ? order.updatedAt.toISOString() : order.updatedAt,
      }));
    }),
  }),
  
  /// Password reset routes
  passwordReset: passwordResetRouter,
  // Referral system routes
  referral: referralRouter,
  sentry: sentryRouter,
  // Knowledge base routes
  knowledge: knowledgeRouter,
  // PPT generation routes
  pptGeneration: pptGenerationRouter,

});

export type AppRouter = typeof appRouter;

// SMS logs router
const smsLogsRouter = router({
  // 查询短信发送日志（仅管理员）
  list: adminProcedure
    .input(z.object({
      phone: z.string().optional(),
      status: z.enum(['pending', 'success', 'failed']).optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const { phone, status, limit, offset } = input;
      
      let query = sdk.db.select().from(sdk.smsLogs);
      
      if (phone) {
        query = query.where(eq(sdk.smsLogs.phone, phone));
      }
      
      if (status) {
        query = query.where(eq(sdk.smsLogs.status, status));
      }
      
      const logs = await query
        .orderBy(desc(sdk.smsLogs.createdAt))
        .limit(limit)
        .offset(offset);
      
      return logs;
    }),
  
  // 获取短信发送统计（仅管理员）
  stats: adminProcedure.query(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const stats = await sdk.db
      .select({
        status: sdk.smsLogs.status,
        count: count(sdk.smsLogs.id),
      })
      .from(sdk.smsLogs)
      .where(gte(sdk.smsLogs.createdAt, today.toISOString()))
      .groupBy(sdk.smsLogs.status);
    
    return stats;
  }),
});
