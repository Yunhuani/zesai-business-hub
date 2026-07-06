import { describe, expect, it } from "vitest";
import {
  extractRecommendedSkill,
  getRecommendedSkillCta,
  getRecommendedSkillHref,
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
    expect(getRecommendedSkillHref(result.recommendedSkill!)).toBe("/diagnosis");
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
    "key": "equity_design",
    "name": "股权结构设计",
    "status": "coming_soon"
  }
}
\`\`\``);

    expect(result.recommendedSkill?.status).toBe("coming_soon");
    expect(getRecommendedSkillCta(result.recommendedSkill!)).toBe("预约通知");
    expect(getRecommendedSkillHref(result.recommendedSkill!)).toBe(
      "/support?intent=skill-notify&skill=equity_design",
    );
  });
});
