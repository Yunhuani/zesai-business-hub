import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import {
  ADVISOR_SUGGESTED_PROMPTS,
  buildDocumentAnalysisPrompt,
  shouldShowAdvisorSuggestions,
} from "../client/src/lib/agentChatPresentation";

describe("agent chat presentation", () => {
  it("starts homepage advisor messages in exactly one new conversation", () => {
    const homeSource = readFileSync(
      new URL("../client/src/pages/Home.tsx", import.meta.url),
      "utf8",
    );
    const agentChatSource = readFileSync(
      new URL("../client/src/pages/AgentChat.tsx", import.meta.url),
      "utf8",
    );

    expect(homeSource).toContain(
      "`/agent/${advisorAgentId}?new=1&initial=${encodeURIComponent(query)}`",
    );
    expect(agentChatSource).toContain("hasRequestedNewConversationRef.current");
    expect(agentChatSource).toContain("if (isNewConversation && !hasRequestedNewConversationRef.current)");
  });

  it("provides the fixed advisor starter questions", () => {
    expect(ADVISOR_SUGGESTED_PROMPTS).toEqual([
      "我的获客成本越来越高，应该先排查什么？",
      "公司增长停滞，问题可能出在哪里？",
      "两个合伙人股权怎么分更合理？",
      "团队执行力差，应该先改组织还是目标？",
    ]);
  });

  it("shows starter questions only before the first user message", () => {
    expect(shouldShowAdvisorSuggestions([])).toBe(true);
    expect(shouldShowAdvisorSuggestions([{ role: "assistant" }])).toBe(true);
    expect(shouldShowAdvisorSuggestions([{ role: "user" }])).toBe(false);
  });

  it("puts extracted document text into the model prompt with a bounded length", () => {
    const prompt = buildDocumentAnalysisPrompt("经营数据.xlsx", "收入与成本".repeat(1000));

    expect(prompt).toContain("我上传了一份文档：经营数据.xlsx");
    expect(prompt).toContain("文档内容：");
    expect(prompt).toContain("收入与成本");
    expect(prompt).toContain("内容过长，已截断");
    expect(prompt.length).toBeLessThan(3100);
  });
});
