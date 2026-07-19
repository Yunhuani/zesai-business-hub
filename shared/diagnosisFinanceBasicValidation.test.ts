import { describe, expect, it } from "vitest";
import { validateFinanceBasicAnswers } from "./diagnosisFinanceBasicValidation";

describe("validateFinanceBasicAnswers", () => {
  const validAnswers = {
    "finance_basic.net_margin_band": "5%–10%",
    "finance_basic.cost_structure": "原材料和人工",
    "finance_basic.cash": "0",
    "finance_basic.monthly_fixed": "1",
  };

  it("requires net margin band", () => {
    expect(validateFinanceBasicAnswers({ ...validAnswers, "finance_basic.net_margin_band": "" }))
      .toBe("请选择「大致净利率区间？」");
  });

  it("requires a non-blank cost structure", () => {
    expect(validateFinanceBasicAnswers({ ...validAnswers, "finance_basic.cost_structure": "   " }))
      .toBe("请填写「你的成本主要花在哪些地方？」");
  });

  it.each(["-1", "不是数字"])("rejects invalid cash value %s", cash => {
    expect(validateFinanceBasicAnswers({ ...validAnswers, "finance_basic.cash": cash }))
      .toBe("账上现金请输入非负数字");
  });

  it.each(["0", "-1", "不是数字"])("rejects invalid monthly fixed value %s", monthlyFixed => {
    expect(validateFinanceBasicAnswers({ ...validAnswers, "finance_basic.monthly_fixed": monthlyFixed }))
      .toBe("请填写实际支出（房租、工资等）");
  });

  it("only validates finance basic fields in the current step when a scope is provided", () => {
    const answers = { ...validAnswers, "finance_basic.cash": "-1" };

    expect(validateFinanceBasicAnswers(
      answers,
      {},
      new Set(["finance_basic.net_margin_band", "finance_basic.cost_structure"])
    )).toBeNull();
    expect(validateFinanceBasicAnswers(
      answers,
      {},
      new Set(["finance_basic.cash", "finance_basic.monthly_fixed"])
    )).toBe("账上现金请输入非负数字");
  });

  it.each([
    ["", ""],
    ["0", "0.01"],
    ["100", "50"],
  ])("allows cash %s and monthly fixed %s", (cash, monthlyFixed) => {
    expect(validateFinanceBasicAnswers({
      ...validAnswers,
      "finance_basic.cash": cash,
      "finance_basic.monthly_fixed": monthlyFixed,
    })).toBeNull();
  });
});
