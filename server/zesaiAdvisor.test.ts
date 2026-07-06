import { describe, expect, it } from "vitest";

import {
  ZESAI_ADVISOR_AGENT,
  ZESAI_ADVISOR_AGENT_NAME,
  ZESAI_ADVISOR_SYSTEM_PROMPT,
} from "./zesaiAdvisor";

describe("Zesai advisor agent", () => {
  it("defines the homepage advisor agent with the full prompt and structured recommendation contract", () => {
    expect(ZESAI_ADVISOR_AGENT_NAME).toBe("泽思AI顾问");
    expect(ZESAI_ADVISOR_AGENT.name).toBe(ZESAI_ADVISOR_AGENT_NAME);
    expect(ZESAI_ADVISOR_AGENT.systemPrompt).toBe(ZESAI_ADVISOR_SYSTEM_PROMPT);
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("一、身份与边界");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("七、测试用示例对话");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("recommendedSkill");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("四段式");
  });
});
