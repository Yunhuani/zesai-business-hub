import { Response, Request } from "express";
import { sdk } from "./_core/sdk";
import jwt from "jsonwebtoken";
import { ENV } from "./_core/env";
import { getUserByOpenId } from "./db";
import { formatAdvisorSseEvent } from "../shared/advisorStream";
import { ZESAI_ADVISOR_AGENT_NAME, getZesaiAdvisorSystemPrompt } from "./zesaiAdvisor";

/**
 * Stream chat endpoint for real-time streaming responses
 * POST /api/chat/stream
 */
export async function handleStreamChat(req: Request, res: Response) {
  try {
    // Verify authentication - support both JWT token and Manus OAuth
    let user = null;
    
    // First try JWT token from Authorization header (for email/password login)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        const decoded = jwt.verify(token, ENV.jwtSecret) as { userId: number; openId: string };
        user = await getUserByOpenId(decoded.openId) || null;
      } catch (jwtError) {
        console.error('[StreamChat] JWT verification failed:', jwtError);
        user = null;
      }
    }
    
    // Fallback to Manus OAuth (for OAuth login)
    if (!user) {
      try {
        user = await sdk.authenticateRequest(req);
      } catch (error) {
        console.error('[StreamChat] OAuth authentication failed:', error);
        user = null;
      }
    }
    
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userId = user.id;

    // Parse request body
    const { conversationId, content, userInputs, requestId } = req.body;
    if (!conversationId || !content) {
      res.status(400).json({ error: "Missing conversationId or content" });
      return;
    }

    const { createMessage, getConversationMessages, getConversationById, getAgentByIdFull } = await import("./db");
    const { checkCredits, deductCreditsWithIdempotencyKey, checkAndResetCredits, getUserCredits } = await import("./creditsManager");
    const { getActionCredits } = await import("./pricingConfig");
    const chatCredits = await getActionCredits("chat");
    
    // Check and reset credits if needed
    await checkAndResetCredits(userId);
    
    // Check if user has enough credits
    const hasCredits = await checkCredits(userId, chatCredits);
    if (!hasCredits) {
      const credits = await getUserCredits(userId);
      res.status(403).json({
        error: "INSUFFICIENT_CREDITS",
        credits: credits,
        required: chatCredits
      });
      return;
    }

    // Get conversation and agent
    const conversation = await getConversationById(conversationId);
    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }
    if (conversation.userId !== userId) {
      res.status(403).json({ error: "Unauthorized" });
      return;
    }

    const agent = await getAgentByIdFull(conversation.agentId);
    if (!agent) {
      res.status(404).json({ error: "Agent not found" });
      return;
    }

    // Save user message
    const userMessage = await createMessage({
      conversationId,
      role: "user",
      content,
    });

    // Get conversation history
    const history = await getConversationMessages(conversationId);
    const messages = history.map(msg => ({
      role: msg.role as "system" | "user" | "assistant",
      content: msg.content,
    }));

    // Build system prompt with global rules + agent-specific prompt + user inputs
    const { getGlobalPromptRules } = await import("../shared/promptRules");
    const { searchKnowledge, buildRAGPrompt, saveMessageKnowledgeRefs } = await import("./_core/knowledge");
    
    const isZesaiAdvisor = agent.name === ZESAI_ADVISOR_AGENT_NAME;
    let systemPrompt = isZesaiAdvisor
      ? getZesaiAdvisorSystemPrompt()
      : `${getGlobalPromptRules()}\n\n## 专业角色\n${agent.systemPrompt}`;
    
    if (userInputs) {
      const inputFields = JSON.parse(agent.inputFields) as Array<{ name: string; label: string }>;
      const inputContext = inputFields
        .map((field: { name: string; label: string }) => `${field.label}: ${userInputs[field.name] || "未提供"}`) 
        .join("\n");
      systemPrompt = `${systemPrompt}\n\n## 用户提供的信息\n${inputContext}`;
    }
    
    // RAG: Search knowledge base for relevant content
    let knowledgeResults: Awaited<ReturnType<typeof searchKnowledge>> = [];
    try {
      knowledgeResults = await searchKnowledge(content, agent.id, 5);
      if (knowledgeResults.length > 0) {
        systemPrompt = buildRAGPrompt(content, knowledgeResults, systemPrompt);
        console.log(`[RAG] Found ${knowledgeResults.length} relevant knowledge chunks for agent ${agent.id}`);
      }
    } catch (ragError) {
      console.error('[RAG] Knowledge search failed:', ragError);
      // Continue without RAG enhancement
    }

    // Set up SSE (Server-Sent Events)
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { invokeLLMStream } = await import("./_core/llm");

    // Call LLM stream
    const stream = await invokeLLMStream({
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.filter(m => m.role !== "system"),
      ],
    });

    let fullContent = "";
    let streamCompleted = false;
    let streamFailed = false;
    let clientAborted = false;
    let streamReading = true;
    req.on("close", () => {
      if (streamReading && !streamCompleted) {
        clientAborted = true;
      }
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let providerBuffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        providerBuffer += decoder.decode(value, { stream: true });
        const lines = providerBuffer.split("\n");
        providerBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") {
              streamCompleted = true;
              continue;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullContent += delta;
                // Send delta to client
                res.write(formatAdvisorSseEvent({ type: "message.delta", delta }));
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (error) {
      streamFailed = true;
      console.error("Stream error:", error);
    } finally {
      streamReading = false;
    }

    const delivered =
      streamCompleted &&
      !streamFailed &&
      !clientAborted &&
      fullContent.trim().length > 0;

    if (delivered) {
      let recommendationMetadata = null;
      if (isZesaiAdvisor) {
        const { classifyAdvisorRecommendation } = await import("./advisorRecommendation");
        recommendationMetadata = await classifyAdvisorRecommendation({
          question: content,
          history: messages.filter((message): message is { role: "user" | "assistant"; content: string } =>
            message.role === "user" || message.role === "assistant"
          ),
        });
      }

      // Save assistant message
      await createMessage({
        conversationId,
        role: "assistant",
        content: fullContent,
        recommendationMetadata,
      });

      if (recommendationMetadata) {
        res.write(formatAdvisorSseEvent({ type: "recommendation", recommendation: recommendationMetadata }));
      }

      // Deduct credits
      const chatBillingKey = typeof requestId === "string" && requestId
        ? `chat:${userId}:${conversationId}:${requestId}`
        : `chat-message:${userMessage.id}`;
      await deductCreditsWithIdempotencyKey(
        userId,
        chatCredits,
        `基础对话 - Conversation #${conversationId}`,
        chatBillingKey
      );
    }

    // End stream
    res.write(formatAdvisorSseEvent(delivered
      ? { type: "done" }
      : { type: "done", warning: "回复未完成，未扣费" }
    ));
    res.end();
  } catch (error) {
    console.error("Stream chat error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(formatAdvisorSseEvent({ type: "done" }));
      res.end();
    }
  }
}
