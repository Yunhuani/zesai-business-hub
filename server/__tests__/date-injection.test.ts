import { describe, it, expect } from "vitest";

describe("日期注入功能", () => {
  it("getGlobalPromptRules应返回包含当前日期的规则", async () => {
    const { getGlobalPromptRules } = await import("../../shared/promptRules");
    
    const rules = getGlobalPromptRules();
    
    // 验证包含【当前日期】标记
    expect(rules).toContain("【当前日期】");
    
    // 验证包含年月日格式
    expect(rules).toMatch(/\d{4}年\d{1,2}月\d{1,2}日/);
  });

  it("日期应该是2026年（当前年份）", async () => {
    const { getGlobalPromptRules } = await import("../../shared/promptRules");
    
    const rules = getGlobalPromptRules();
    
    // 验证年份正确（2026年）
    expect(rules).toContain("2026年");
  });

  it("日期应该在系统信息部分", async () => {
    const { getGlobalPromptRules } = await import("../../shared/promptRules");
    
    const rules = getGlobalPromptRules();
    
    // 验证系统信息部分存在
    expect(rules).toContain("## 系统信息");
    
    // 验证日期在系统信息之后、全局规则之前
    const systemInfoIndex = rules.indexOf("## 系统信息");
    const dateIndex = rules.indexOf("【当前日期】");
    const globalRulesIndex = rules.indexOf("## 全局规则");
    
    expect(dateIndex).toBeGreaterThan(systemInfoIndex);
    expect(dateIndex).toBeLessThan(globalRulesIndex);
  });

  it("getCurrentBeijingDate应返回正确格式的日期", async () => {
    const { getCurrentBeijingDate } = await import("../../shared/promptRules");
    
    const date = getCurrentBeijingDate();
    
    // 验证格式：YYYY年M月D日
    expect(date).toMatch(/^\d{4}年\d{1,2}月\d{1,2}日$/);
    
    // 验证年份
    expect(date).toContain("2026年");
  });

  it("每次调用getGlobalPromptRules应获取最新日期", async () => {
    const { getGlobalPromptRules, getCurrentBeijingDate } = await import("../../shared/promptRules");
    
    const rules = getGlobalPromptRules();
    const currentDate = getCurrentBeijingDate();
    
    // 验证规则中包含当前日期
    expect(rules).toContain(currentDate);
  });
});
