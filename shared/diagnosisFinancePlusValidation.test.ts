import { describe, expect, it } from "vitest";
import { validateFinancePlusTableTotals } from "./diagnosisFinancePlusValidation";

describe("validateFinancePlusTableTotals", () => {
  it("rejects customer percentages totaling more than 100", () => {
    expect(validateFinancePlusTableTotals("finance_plus.customers", [
      { name: "客户 A", pct: "60" },
      { name: "客户 B", pct: 40.01 },
    ])).toBe("客户占比合计不能超过 100%");
  });

  it("allows customer percentages totaling exactly 100 or less", () => {
    expect(validateFinancePlusTableTotals("finance_plus.customers", [
      { name: "客户 A", pct: "60" },
      { name: "客户 B", pct: 40 },
    ])).toBeNull();
    expect(validateFinancePlusTableTotals("finance_plus.customers", [
      { name: "客户 A", pct: 0 },
    ])).toBeNull();
  });

  it("rejects filled product lines whose total revenue is zero", () => {
    expect(validateFinancePlusTableTotals("finance_plus.product_lines", [
      { name: "产品线 A", revenue: "0", total_cost: "100" },
      { name: "产品线 B", revenue: 0, total_cost: 0 },
    ])).toBe("产品线收入合计必须大于 0");
  });

  it("allows zero-revenue rows when total product-line revenue is positive", () => {
    expect(validateFinancePlusTableTotals("finance_plus.product_lines", [
      { name: "产品线 A", revenue: "0", total_cost: "100" },
      { name: "产品线 B", revenue: 1, total_cost: 1 },
    ])).toBeNull();
  });

  it("allows the optional product-line section to be skipped", () => {
    expect(validateFinancePlusTableTotals("finance_plus.product_lines", [])).toBeNull();
  });
});
