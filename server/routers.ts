import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";

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

  // Message routes
  message: router({
    send: protectedProcedure.input((val: unknown) => {
      if (typeof val === "object" && val !== null && "conversationId" in val && "content" in val && "userInputs" in val && typeof val.conversationId === "number" && typeof val.content === "string") {
        return val as { conversationId: number; content: string; userInputs?: Record<string, string> };
      }
      throw new Error("Invalid input: expected { conversationId: number, content: string, userInputs?: Record<string, string> }");
    }).mutation(async ({ ctx, input }) => {
      const { createMessage, getConversationMessages, getConversationById, getAgentById } = await import("./db");
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
