import { describe, it, expect } from "vitest";
import { GLOBAL_PROMPT_RULES, getPromptRules, CATEGORY_RULES } from "../shared/promptRules";

describe("Global Prompt Rules System", () => {
  it("should have global prompt rules defined", () => {
    expect(GLOBAL_PROMPT_RULES).toBeTruthy();
    expect(GLOBAL_PROMPT_RULES.length).toBeGreaterThan(100);
  });

  it("should include key sections in global rules", () => {
    expect(GLOBAL_PROMPT_RULES).toContain("输出格式要求");
    expect(GLOBAL_PROMPT_RULES).toContain("专业标准");
    expect(GLOBAL_PROMPT_RULES).toContain("互动方式");
    expect(GLOBAL_PROMPT_RULES).toContain("语言风格");
    expect(GLOBAL_PROMPT_RULES).toContain("禁止事项");
    expect(GLOBAL_PROMPT_RULES).toContain("输出长度控制");
  });

  it("should include markdown formatting guidelines", () => {
    expect(GLOBAL_PROMPT_RULES).toContain("Markdown");
    expect(GLOBAL_PROMPT_RULES).toContain("###");
    expect(GLOBAL_PROMPT_RULES).toContain("**加粗**");
    expect(GLOBAL_PROMPT_RULES).toContain("表格");
  });

  it("should include professional standards", () => {
    expect(GLOBAL_PROMPT_RULES).toContain("麦肯锡");
    expect(GLOBAL_PROMPT_RULES).toContain("可落地");
    expect(GLOBAL_PROMPT_RULES).toContain("可执行");
  });

  it("should include prohibited topics", () => {
    expect(GLOBAL_PROMPT_RULES).toContain("政治");
    expect(GLOBAL_PROMPT_RULES).toContain("法律");
    expect(GLOBAL_PROMPT_RULES).toContain("医疗");
  });

  it("should have category-specific rules", () => {
    expect(CATEGORY_RULES.strategy).toBeTruthy();
    expect(CATEGORY_RULES.marketing).toBeTruthy();
    expect(CATEGORY_RULES.operation).toBeTruthy();
    expect(CATEGORY_RULES.investment).toBeTruthy();
  });

  it("should include strategy-specific frameworks", () => {
    expect(CATEGORY_RULES.strategy).toContain("SWOT");
    expect(CATEGORY_RULES.strategy).toContain("PEST");
    expect(CATEGORY_RULES.strategy).toContain("五力模型");
  });

  it("should include marketing-specific frameworks", () => {
    expect(CATEGORY_RULES.marketing).toContain("STP");
    expect(CATEGORY_RULES.marketing).toContain("4P");
    expect(CATEGORY_RULES.marketing).toContain("ROI");
  });

  it("should combine global rules with category rules", () => {
    const strategyRules = getPromptRules("strategy");
    expect(strategyRules).toContain("全局规则");
    expect(strategyRules).toContain("战略类顾问特定规则");
    expect(strategyRules).toContain("SWOT");
  });

  it("should return only global rules when no category specified", () => {
    const rules = getPromptRules();
    expect(rules).toEqual(GLOBAL_PROMPT_RULES);
  });

  it("should handle invalid category gracefully", () => {
    const rules = getPromptRules("invalid" as any);
    expect(rules).toEqual(GLOBAL_PROMPT_RULES);
  });
});
