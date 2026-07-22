import { describe, expect, it } from "vitest";
import {
  extractRecommendedSkill,
  getRecommendedSkillCta,
  getRecommendedSkillHref,
  getRecommendedSkillTarget,
} from "./recommendedSkill";

describe("recommendedSkill extraction", () => {
  it("extracts structured skill data and removes the JSON block from display text", () => {
    const result = extractRecommendedSkill(`先做一个判断。

\`\`\`json
{
  "recommendedSkill": {
    "key": "nbg_growth_diagnosis",
    "name": "NBG 增长诊断",
    "status": "available",
    "reason": "需要先定位增长瓶颈",
    "cta": "进入诊断"
  }
}
\`\`\``);

    expect(result.displayContent).toBe("先做一个判断。");
    expect(result.recommendedSkill).toEqual({
      key: "nbg_growth_diagnosis",
      name: "NBG 增长诊断",
      status: "available",
      reason: "需要先定位增长瓶颈",
      cta: "进入诊断",
    });
    expect(getRecommendedSkillHref(result.recommendedSkill!)).toBe("/diagnosis/conversation");
    expect(getRecommendedSkillCta(result.recommendedSkill!)).toBe("进入诊断");
  });

  it("hides a partial streaming JSON block until it can be parsed", () => {
    const result = extractRecommendedSkill(`正文已经结束。

\`\`\`json
{ "recommendedSkill": {`);

    expect(result.displayContent).toBe("正文已经结束。");
    expect(result.recommendedSkill).toBeNull();
  });

  it("uses notify CTA and support route for coming soon skills", () => {
    const result = extractRecommendedSkill(`建议先预约。

\`\`\`json
{
  "recommendedSkill": {
    "key": "equity_structure",
    "name": "股权结构设计",
    "status": "coming_soon"
  }
}
\`\`\``);

    expect(result.recommendedSkill?.status).toBe("coming_soon");
    expect(getRecommendedSkillCta(result.recommendedSkill!)).toBe("即将开放");
    expect(getRecommendedSkillHref(result.recommendedSkill!)).toBe("/toolbox");
  });

  it.each([
    ["nbg_growth_diagnosis", "NBG 增长诊断", "available"],
    ["business_plan", "商业计划书", "coming_soon"],
    ["equity_structure", "股权架构设计", "coming_soon"],
    ["team_management", "团队管理", "coming_soon"],
    ["okr_management", "OKR 管理", "coming_soon"],
    ["ai_commercialization", "AI 商业化", "coming_soon"],
    ["support", "人工支持", "coming_soon"],
  ] as const)("parses the advisor recommendation fixture for %s", (key, name, status) => {
    const result = extractRecommendedSkill(`四段式正文。\n\n\`\`\`json
{
  "recommendedSkill": {
    "key": "${key}",
    "name": "${name}",
    "status": "${status}",
    "reason": "匹配当前问题"
  }
}
\`\`\``);

    expect(result.recommendedSkill).toMatchObject({ key, name, status });
    expect(result.displayContent).toBe("四段式正文。");
  });

  it("extracts a bare recommendation object without rendering raw JSON", () => {
    const result = extractRecommendedSkill(`先给出判断，再推荐下一步。

{
  "recommendedSkill": {
    "key": "nbg_growth_diagnosis",
    "name": "NBG 增长诊断",
    "status": "available",
    "reason": "需要系统定位增长瓶颈"
  }
}`);

    expect(result.displayContent).toBe("先给出判断，再推荐下一步。");
    expect(result.recommendedSkill?.key).toBe("nbg_growth_diagnosis");
  });

  it("extracts a recommendation-only response without exposing JSON", () => {
    const result = extractRecommendedSkill(`{
  "recommendedSkill": {
    "key": "nbg_growth_diagnosis",
    "name": "NBG 增长诊断",
    "status": "available"
  }
}`);

    expect(result.displayContent).toBe("");
    expect(result.recommendedSkill?.key).toBe("nbg_growth_diagnosis");
  });

  it("hides malformed recommendation JSON instead of exposing it as message text", () => {
    const result = extractRecommendedSkill(`正文判断。\n\n\`\`\`json
{ "recommendedSkill": { "key": "nbg_growth_diagnosis"
\`\`\``);

    expect(result.displayContent).toBe("正文判断。");
    expect(result.recommendedSkill).toBeNull();
  });

  it("resolves navigation and availability from the extensible target registry", () => {
    expect(getRecommendedSkillTarget("nbg_growth_diagnosis")).toMatchObject({
      href: "/diagnosis/conversation",
      available: true,
      cta: "进入诊断",
    });
    expect(getRecommendedSkillTarget("business_plan")).toMatchObject({
      available: false,
      cta: "即将开放",
    });
    expect(getRecommendedSkillTarget("unknown")).toBeNull();
  });
});
