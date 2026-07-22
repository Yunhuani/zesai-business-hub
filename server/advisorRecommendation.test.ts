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
      history: [],
      invoke,
    })).resolves.toEqual({
      key: "nbg_growth_diagnosis",
      reason: "增长问题需要从多个经营维度定位。",
    });

    expect(invoke).toHaveBeenCalledWith(expect.objectContaining({
      responseFormat: { type: "json_object" },
      thinking: { type: "disabled" },
    }));
  });

  it("rejects keys outside the server registry", () => {
    expect(recommendationClassificationSchema.safeParse({
      key: "made_up_skill",
      reason: "模型自行发明的能力。",
    }).success).toBe(false);
  });

  it("retries once after invalid JSON and accepts the second valid result", async () => {
    const invoke = vi.fn()
      .mockResolvedValueOnce(llmResult("not json"))
      .mockResolvedValueOnce(llmResult(JSON.stringify({
        key: "business_plan",
        reason: "问题聚焦融资材料。",
      })));

    await expect(classifyAdvisorRecommendation({
      question: "帮我梳理商业计划书",
      history: [],
      invoke,
    })).resolves.toMatchObject({ key: "business_plan" });
    expect(invoke).toHaveBeenCalledTimes(2);
  });

  it("returns null after two failed classifications", async () => {
    const invoke = vi.fn(async () => llmResult(JSON.stringify({
      key: "illegal",
      reason: "invalid",
    })));

    await expect(classifyAdvisorRecommendation({
      question: "随便聊聊",
      history: [],
      invoke,
    })).resolves.toBeNull();
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
