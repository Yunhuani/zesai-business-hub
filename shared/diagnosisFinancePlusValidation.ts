type FinancePlusRow = Record<string, unknown>;

export function validateFinancePlusTableTotals(
  field: string,
  rows: FinancePlusRow[]
): string | null {
  if (field === "finance_plus.customers") {
    const totalPct = rows.reduce((total, row) => total + Number(row.pct), 0);
    return totalPct > 100 ? "客户占比合计不能超过 100%" : null;
  }

  if (field === "finance_plus.product_lines" && rows.length > 0) {
    const totalRevenue = rows.reduce(
      (total, row) => total + Number(row.revenue),
      0
    );
    return totalRevenue > 0 ? null : "产品线收入合计必须大于 0";
  }

  return null;
}
