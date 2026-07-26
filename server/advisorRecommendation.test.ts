import { describe, expect, it, vi } from "vitest";

import {
  classifyAdvisorRecommendation,
  recommendationClassificationSchema,
} from "./advisorRecommendation";

function llmResult(content: string) {
  return {
    id: "classification",
    created: 0,
    model: "deepseek-v4-flash",
    choices: [{
      index: 0,
      message: { role: "assistant" as const, content },
      finish_reason: "stop",
    }],
  };
}

describe("advisor recommendation classifier", () => {
  it("returns a validated recommendation and forces JSON non-thinking mode", async () => {
    const invoke = vi.fn(async () => llmResult(JSON.stringify({
      key: "nbg_growth_diagnosis",
      reason: "增长问题需要从多个经营维度定位。",
    })));

    await expect(classifyAdvisorRecommendation({
      question: "公司增长停滞，应该先查哪里？",
      history: [
        { role: "user", content: "最近经营有些问题。" },
        { role: "assistant", content: "具体是什么表现？" },
        { role: "user", content: "增长已经停了几个月。" },
        { role: "assistant", content: "主要影响了哪些产品？" },
        { role: "user", content: "核心产品也受影响。" },
      ],
      invoke,
    })).resolves.toEqual({
      key: "nbg_growth_diagnosis",
      reason: "增长问题需要从多个经营维度定位。",
    });

    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      responseFormat: { type: "json_object" },
      thinking: { type: "disabled" },
    }));
    expect(invoke.mock.calls[0][0].messages[0].content).toContain("nbg_growth_diagnosis");
    expect(invoke.mock.calls[0][0].messages[0].content).not.toContain("business_plan");
  });

  it("accepts none and rejects unavailable or unknown skills", () => {
    expect(recommendationClassificationSchema.safeParse({
      key: "none",
      reason: "本轮不适合推荐。",
    }).success).toBe(true);
    expect(recommendationClassificationSchema.safeParse({
      key: "business_plan",
      reason: "该技能尚未上线。",
    }).success).toBe(false);
    expect(recommendationClassificationSchema.safeParse({
      key: "made_up_skill",
      reason: "模型自行发明的能力。",
    }).success).toBe(false);
  });

  it("does not invoke the classifier before the third substantive user turn", async () => {
    const invoke = vi.fn(async () => llmResult(JSON.stringify({
      key: "nbg_growth_diagnosis",
      reason: "增长问题需要系统诊断。",
    })));

    await expect(classifyAdvisorRecommendation({
      question: "我的产品卖不动了。",
      history: [
        { role: "user", content: "我的产品卖不动了。" },
      ],
      invoke,
    })).resolves.toBeNull();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("counts the current question when anonymous history does not include it", async () => {
    const invoke = vi.fn(async () => llmResult(JSON.stringify({
      key: "none",
      reason: "当前仍不适合推荐。",
    })));

    await expect(classifyAdvisorRecommendation({
      question: "这是第三次实质提问。",
      history: [
        { role: "user", content: "第一次实质提问。" },
        { role: "assistant", content: "第一次回答。" },
        { role: "user", content: "第二次实质提问。" },
        { role: "assistant", content: "第二次回答。" },
      ],
      invoke,
    })).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("maps a valid none classification to no recommendation", async () => {
    const invoke = vi.fn(async () => llmResult(JSON.stringify({
      key: "none",
      reason: "这是单点管理问题，本轮不推荐。",
    })));

    await expect(classifyAdvisorRecommendation({
      question: "团队成员没有活力，怎么提升管理？",
      history: [
        { role: "user", content: "团队最近状态不好。" },
        { role: "assistant", content: "主要表现在哪？" },
        { role: "user", content: "成员缺乏主动性。" },
        { role: "assistant", content: "持续多久了？" },
        { role: "user", content: "已经三个月。" },
      ],
      invoke,
    })).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("retries once after invalid JSON and accepts the second valid result", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce(llmResult("not json"))
      .mockResolvedValueOnce(llmResult(JSON.stringify({
        key: "nbg_growth_diagnosis",
        reason: "问题涉及持续增长困境。",
      })));

    await expect(classifyAdvisorRecommendation({
      question: "公司业绩持续上不去，想系统解决。",
      history: [
        { role: "user", content: "公司增长遇到问题。" },
        { role: "assistant", content: "最明显的表现是什么？" },
        { role: "user", content: "销售额持续下降。" },
        { role: "assistant", content: "持续了多久？" },
        { role: "user", content: "已经半年。" },
      ],
      invoke,
    })).resolves.toMatchObject({ key: "nbg_growth_diagnosis" });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("returns null after two failed classifications", async () => {
    const invoke = vi.fn(async () => llmResult(JSON.stringify({
      key: "illegal",
      reason: "invalid",
    })));

    await expect(classifyAdvisorRecommendation({
      question: "随便聊聊",
      history: [
        { role: "user", content: "第一个问题。" },
        { role: "assistant", content: "第一个回答。" },
        { role: "user", content: "第二个问题。" },
        { role: "assistant", content: "第二个回答。" },
        { role: "user", content: "第三个问题。" },
      ],
      invoke,
    })).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
