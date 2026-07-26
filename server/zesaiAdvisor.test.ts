import { describe, expect, it } from "vitest";

import {
  ZESAI_ADVISOR_AGENT,
  ZESAI_ADVISOR_AGENT_NAME,
  ZESAI_ADVISOR_SYSTEM_PROMPT,
} from "./zesaiAdvisor";

describe("Zesai advisor agent", () => {
  it("defines a body-only homepage advisor prompt", () => {
    expect(ZESAI_ADVISOR_AGENT_NAME).toBe("泽思AI顾问");
    expect(ZESAI_ADVISOR_AGENT.name).toBe(ZESAI_ADVISOR_AGENT_NAME);
    expect(ZESAI_ADVISOR_AGENT.systemPrompt).toBe(ZESAI_ADVISOR_SYSTEM_PROMPT);
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("泽思AI顾问 系统提示词 V1");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("【你的角色】");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("【对话永远可以继续】");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("前 2-3 轮实质对话内绝不推荐");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("不输出任何标签、代码、JSON 或系统标记");
  });

  it("keeps recommendation restraint explicit in the system prompt", () => {
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("大多数对话就到这里，不需要推荐任何东西");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("不推荐 NBG 增长诊断以外的任何服务");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).not.toContain("[[SKILL_RECOMMENDATION]]");
  });
});
