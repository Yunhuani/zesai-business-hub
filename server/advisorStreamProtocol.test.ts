import { describe, expect, it } from "vitest";

import {
  parseAdvisorSseData,
  serializeAdvisorSseEvent,
} from "../shared/advisorStream";
import { getAssistantPresentation } from "../client/src/lib/agentChatStream";

describe("advisor SSE protocol", () => {
  it("serializes and parses typed delta, recommendation, and done events", () => {
    const events = [
      { type: "message.delta" as const, delta: "正文" },
      {
        type: "recommendation" as const,
        recommendation: {
          key: "nbg_growth_diagnosis" as const,
          reason: "适合系统定位增长瓶颈。",
        },
      },
      { type: "done" as const },
    ];

    expect(events.map(event => parseAdvisorSseData(serializeAdvisorSseEvent(event))))
      .toEqual(events);
  });

  it("renders a recommendation event as a trusted card presentation", () => {
    const event = parseAdvisorSseData(serializeAdvisorSseEvent({
      type: "recommendation",
      recommendation: {
        key: "nbg_growth_diagnosis",
        reason: "适合系统定位增长瓶颈。",
      },
    }));
    expect(event?.type).toBe("recommendation");
    if (!event || event.type !== "recommendation") throw new Error("expected recommendation event");

    const presentation = getAssistantPresentation({
      content: "这是正常正文。",
      recommendationMetadata: event.recommendation,
    });

    expect(presentation.displayContent).toBe("这是正常正文。");
    expect(presentation.recommendedSkill).toMatchObject({
      key: "nbg_growth_diagnosis",
      name: "NBG 增长诊断",
      status: "available",
      cta: "进入诊断",
    });
  });

  it("falls back to the legacy embedded JSON parser for historical messages", () => {
    const content = `历史正文\n\n\`\`\`json\n${JSON.stringify({
      recommendedSkill: {
        key: "nbg_growth_diagnosis",
        name: "NBG 增长诊断",
        status: "available",
        reason: "旧格式",
        cta: "进入诊断",
      },
    })}\n\`\`\``;

    const presentation = getAssistantPresentation({ content });
    expect(presentation.displayContent).toBe("历史正文");
    expect(presentation.recommendedSkill?.key).toBe("nbg_growth_diagnosis");
  });
});
