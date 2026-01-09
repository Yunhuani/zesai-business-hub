import { describe, it, expect } from "vitest";

describe("日期注入功能", () => {
  it("GLOBAL_PROMPT_RULES应包含当前日期", async () => {
    const { GLOBAL_PROMPT_RULES } = await import("../../shared/promptRules");
    
    // 验证包含【当前日期】标记
    expect(GLOBAL_PROMPT_RULES).toContain("【当前日期】");
    
    // 验证包含年月日格式
    expect(GLOBAL_PROMPT_RULES).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/);
  });

  it("日期应该是2026年（当前年份）", async () => {
    const { GLOBAL_PROMPT_RULES } = await import("../../shared/promptRules");
    
    // 验证年份正确（2026年）
    expect(GLOBAL_PROMPT_RULES).toContain("2026年");
  });

  it("日期应该在系统信息部分", async () => {
    const { GLOBAL_PROMPT_RULES } = await import("../../shared/promptRules");
    
    // 验证系统信息部分存在
    expect(GLOBAL_PROMPT_RULES).toContain("## 系统信息");
    
    // 验证日期在系统信息之后、全局规则之前
    const systemInfoIndex = GLOBAL_PROMPT_RULES.indexOf("## 系统信息");
    const dateIndex = GLOBAL_PROMPT_RULES.indexOf("【当前日期】");
    const globalRulesIndex = GLOBAL_PROMPT_RULES.indexOf("## 全局规则");
    
    expect(dateIndex).toBeGreaterThan(systemInfoIndex);
    expect(dateIndex).toBeLessThan(globalRulesIndex);
  });
});
