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
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("一、身份与边界");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("七、测试用示例对话");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("四段式");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).not.toContain("recommendedSkill");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("禁止输出 JSON");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("禁止输出能力对比表");
  });

  it("keeps the model-evaluation redlines explicit in the system prompt", () => {
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("只给一个动作,不给清单");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("视为不合格,必须重写");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("这是唯一允许的拒绝分支");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).toContain("禁止虚构可验证的具体事实");
    expect(ZESAI_ADVISOR_SYSTEM_PROMPT).not.toContain("JSON 代码块格式必须严格如下");
  });
});
