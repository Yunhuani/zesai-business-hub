import type { Request, Response } from "express";

import { getGlobalPromptRules } from "../shared/promptRules";
import { ZESAI_ADVISOR_SYSTEM_PROMPT } from "./zesaiAdvisor";

type AnonymousHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type RateLimitBucket = {
  windowStartedAt: number;
  count: number;
};

export function createAnonymousRateLimiter({
  maxRequests,
  windowMs,
}: {
  maxRequests: number;
  windowMs: number;
}) {
  const buckets = new Map<string, RateLimitBucket>();

  return {
    check(key: string, now = Date.now()) {
      const existing = buckets.get(key);
      if (!existing || now - existing.windowStartedAt >= windowMs) {
        buckets.set(key, { windowStartedAt: now, count: 1 });
        return { allowed: true, remaining: maxRequests - 1, retryAfterMs: 0 };
      }

      if (existing.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, windowMs - (now - existing.windowStartedAt)),
        };
      }

      existing.count += 1;
      return {
        allowed: true,
        remaining: Math.max(0, maxRequests - existing.count),
        retryAfterMs: 0,
      };
    },
  };
}

export function normalizeAnonymousHistory(input: unknown): AnonymousHistoryMessage[] {
  if (!Array.isArray(input)) return [];

  return input
    .flatMap((message): AnonymousHistoryMessage[] => {
      if (!message || typeof message !== "object") return [];
      const role = (message as { role?: unknown }).role;
      const content = (message as { content?: unknown }).content;
      if ((role !== "user" && role !== "assistant") || typeof content !== "string") return [];

      const trimmed = content.trim().slice(0, 4000);
      return trimmed ? [{ role, content: trimmed }] : [];
    })
    .slice(-6);
}

const anonymousAdvisorLimiter = createAnonymousRateLimiter({
  maxRequests: 12,
  windowMs: 10 * 60 * 1000,
});

function getRateLimitKey(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.trim()) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

export async function handleAnonymousAdvisorChat(req: Request, res: Response) {
  try {
    const rateLimit = anonymousAdvisorLimiter.check(getRateLimitKey(req));
    if (!rateLimit.allowed) {
      res.status(429).json({
        error: "RATE_LIMITED",
        retryAfterMs: rateLimit.retryAfterMs,
      });
      return;
    }

    const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
    if (!content) {
      res.status(400).json({ error: "Missing content" });
      return;
    }
    if (content.length > 2000) {
      res.status(400).json({ error: "Content too long" });
      return;
    }

    const history = normalizeAnonymousHistory(req.body?.history);
    const systemPrompt = `${getGlobalPromptRules()}\n\n## 专业角色\n${ZESAI_ADVISOR_SYSTEM_PROMPT}`;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const { invokeLLMStream } = await import("./_core/llm");
    const stream = await invokeLLMStream({
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content },
      ],
    });

    let fullContent = "";
    const reader = stream.getReader();
    const decoder = new TextDecoder();

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              res.write(`data: ${JSON.stringify({ delta, fullContent })}\n\n`);
            }
          } catch {
            // Ignore malformed provider chunks.
          }
        }
      }
    } catch (error) {
      console.error("[AnonymousAdvisor] Stream error:", error);
      res.write(`data: ${JSON.stringify({ error: "Stream failed" })}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error) {
    console.error("[AnonymousAdvisor] Chat error:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Internal server error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Internal server error" })}\n\n`);
      res.end();
    }
  }
}
