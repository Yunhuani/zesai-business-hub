type FinanceBasicAnswers = Record<string, unknown>;

function trimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function validateFinanceBasicAnswers(
  answers: FinanceBasicAnswers,
  customValues: Record<string, string> = {}
): string | null {
  const netMarginBand =
    trimmedString(customValues["finance_basic.net_margin_band"]) ||
    trimmedString(answers["finance_basic.net_margin_band"]);
  if (!netMarginBand) {
    return "请选择「大致净利率区间？」";
  }

  if (!trimmedString(answers["finance_basic.cost_structure"])) {
    return "请填写「你的成本主要花在哪些地方？」";
  }

  const cash = trimmedString(answers["finance_basic.cash"]);
  if (cash) {
    const parsedCash = Number(cash);
    if (!Number.isFinite(parsedCash) || parsedCash < 0) {
      return "账上现金请输入非负数字";
    }
  }

  const monthlyFixed = trimmedString(answers["finance_basic.monthly_fixed"]);
  if (monthlyFixed) {
    const parsedMonthlyFixed = Number(monthlyFixed);
    if (!Number.isFinite(parsedMonthlyFixed) || parsedMonthlyFixed <= 0) {
      return "请填写实际支出（房租、工资等）";
    }
  }

  return null;
}
