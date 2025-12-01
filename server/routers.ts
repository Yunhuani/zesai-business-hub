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
    // Email verification code login
    sendVerificationCode: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const { checkRateLimit, generateVerificationCode, saveVerificationCode, sendVerificationEmail } = await import("./emailVerification");
        
        // Check rate limit
        const rateCheck = checkRateLimit(input.email);
        if (!rateCheck.allowed) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `请稍后再试，还需等待 ${rateCheck.remainingSeconds} 秒`,
          });
        }
        
        // Generate and save verification code
        const code = generateVerificationCode();
        saveVerificationCode(input.email, code);
        
        // Send email
        try {
          await sendVerificationEmail(input.email, code);
          return { success: true, message: "验证码已发送到您的邮箱" };
        } catch (error) {
          console.error("[Email] Failed to send verification code:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "发送验证码失败，请稍后重试",
          });
        }
      }),
    verifyEmailCode: publicProcedure
      .input(z.object({ email: z.string().email(), code: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        const { verifyCode } = await import("./emailVerification");
        const { upsertEmailUser } = await import("./dbEmail");
        
        // Verify code
        const verifyResult = verifyCode(input.email, input.code);
        if (!verifyResult.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: verifyResult.message || "验证码错误",
          });
        }
        
        // Create or update user
        const user = await upsertEmailUser(input.email);
        if (!user) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "创建用户失败",
          });
        }
        
        // Create session token using email as identifier
        const sessionToken = await sdk.createSessionToken(`email_${input.email}`, {
          name: user.name || "",
          expiresInMs: ONE_YEAR_MS,
        });
        
        // Set cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
        
        return { success: true, user };
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
          const user = await registerUser(input.username, input.password, input.name);
          
          if (!user) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "注册失败",
            });
          }
          
          // Create session token
          const sessionToken = await sdk.createSessionToken(`username_${input.username}`, {
            name: user.name || "",
            expiresInMs: ONE_YEAR_MS,
          });
          
          // Set cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          
          return { success: true, user };
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
          const user = await loginUser(input.username, input.password);
          
          if (!user) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "用户名或密码错误",
            });
          }
          
          // Create session token
          const sessionToken = await sdk.createSessionToken(`username_${input.username}`, {
            name: user.name || "",
            expiresInMs: ONE_YEAR_MS,
          });
          
          // Set cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          ctx.res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
          
          return { success: true, user };
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
    }).query(async ({ input }) => {
      const { getConversationById } = await import("./db");
      return getConversationById(input.id);
    }),
  }),

  // Subscription routes
  subscription: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const { getUserSubscription, checkUsageLimit } = await import("./db");
      const subscription = await getUserSubscription(ctx.user.id);
      const usage = await checkUsageLimit(ctx.user.id);
      return { subscription, usage };
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
        monthlyLimit: plan.limit,
        price: plan.price,
        endDate,
      });
      
      return { success: true };
    }),
  }),

  // Payment routes
  payment: paymentRouter,

  // Export routes
  export: exportRouter,
  
  // Document routes
  document: documentRouter,

  // Message routes
  message: router({
    sendWelcome: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "conversationId" in val && "agentId" in val && typeof val.conversationId === "number" && typeof val.agentId === "number") {
        return val as { conversationId: number; agentId: number };
      }
      throw new Error("Invalid input: expected { conversationId: number, agentId: number }");
    }).mutation(async ({ ctx, input }) => {
      const { createMessage, getAgentById } = await import("./db");
      const { getWelcomeMessage } = await import("./welcomeMessages");
      
      const agent = await getAgentById(input.agentId);
      if (!agent) throw new Error("Agent not found");
      
      // 获取欢迎语
      const welcomeMessage = getWelcomeMessage(agent.name, agent.description);
      
      // 保存欢迎消息
      await createMessage({
        conversationId: input.conversationId,
        role: "assistant",
        content: welcomeMessage,
      });
      
      return { content: welcomeMessage };
    }),
    send: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "conversationId" in val && "content" in val && typeof val.conversationId === "number" && typeof val.content === "string") {
        return val as { conversationId: number; content: string; userInputs?: Record<string, string> };
      }
      throw new Error("Invalid input: expected { conversationId: number, content: string, userInputs?: Record<string, string> }");
    }).mutation(async ({ ctx, input }) => {
      const { createMessage, getConversationMessages, getConversationById, getAgentById } = await import("./db");
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

      const agent = await getAgentById(conversation.agentId);
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

      // Build system prompt with user inputs if provided
      let systemPrompt = agent.systemPrompt;
      if (input.userInputs) {
        const inputFields = JSON.parse(agent.inputFields) as Array<{ name: string; label: string }>;
        const inputContext = inputFields
          .map(field => `${field.label}: ${input.userInputs![field.name] || "未提供"}`) 
          .join("\n");
        systemPrompt = `${agent.systemPrompt}\n\n用户提供的信息:\n${inputContext}`;
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
    history: protectedProcedure.query(async ({ ctx }) => {
      const { getTransactionHistory } = await import("./creditsManager");
      return await getTransactionHistory(ctx.user.id);
    }),
  }),
});

export type AppRouter = typeof appRouter;
