import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";

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
  }),

  // Admin routes
  admin: router({
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

  // Message routes
  message: router({
    send: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "conversationId" in val && "content" in val && "userInputs" in val && typeof val.conversationId === "number" && typeof val.content === "string") {
        return val as { conversationId: number; content: string; userInputs?: Record<string, string> };
      }
      throw new Error("Invalid input: expected { conversationId: number, content: string, userInputs?: Record<string, string> }");
    }).mutation(async ({ ctx, input }) => {
      const { createMessage, getConversationMessages, getConversationById, getAgentById, checkUsageLimit, incrementUsage } = await import("./db");
      
      // Check usage limit
      const usageCheck = await checkUsageLimit(ctx.user.id);
      if (!usageCheck.allowed) {
        throw new Error("您的本月咨询次数已用完,请升级套餐以继续使用。");
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
      
      // Increment usage count
      await incrementUsage(ctx.user.id);

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
});

export type AppRouter = typeof appRouter;
