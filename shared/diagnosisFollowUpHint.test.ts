import { describe, expect, it } from "vitest";
import {
  DIAGNOSIS_FOLLOW_UP_FIELDS,
  DIAGNOSIS_FOLLOW_UP_MIN_LENGTH,
  getDiagnosisFollowUpHint,
} from "./diagnosisFollowUpHint";

describe("getDiagnosisFollowUpHint", () => {
  it("keeps the enabled fields and threshold centrally configurable", () => {
    expect(DIAGNOSIS_FOLLOW_UP_FIELDS).toEqual([
      "company.top_anxiety",
      "business_model.how_earn_retain",
      "finance_basic.cost_structure",
      "business_model.revenue_sources",
    ]);
    expect(DIAGNOSIS_FOLLOW_UP_MIN_LENGTH).toBe(15);
  });

  it("suggests elaboration for a non-empty enabled answer shorter than 15 characters", () => {
    expect(getDiagnosisFollowUpHint("company.top_anxiety", "增长 最近 有点慢"))
      .toBe("能再具体说说吗?这会让诊断更准。");
  });

  it("does not show for blank answers or answers of at least 15 characters", () => {
    expect(getDiagnosisFollowUpHint("company.top_anxiety", "   \n ")).toBeNull();
    expect(getDiagnosisFollowUpHint("company.top_anxiety", "一二三四五六七八九十一二三四五"))
      .toBeNull();
  });

  it("never triggers for fields outside the configured list", () => {
    expect(getDiagnosisFollowUpHint("market.home_market", "北美"))
      .toBeNull();
    expect(getDiagnosisFollowUpHint("finance_basic.cash", "1"))
      .toBeNull();
  });
});
