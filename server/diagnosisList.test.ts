import { describe, expect, it } from "vitest";
import { serializeDiagnosisListItem } from "./diagnosisList";

describe("diagnosis list", () => {
  it("returns only the minimal list fields and derives full access", () => {
    expect(
      serializeDiagnosisListItem({
        id: 42,
        headline: "增长路径需要重构",
        createdAt: "2026-06-24 10:00:00",
        overallScore: 6.2,
        scoreLabel: "稳健",
        status: "done",
        productType: "full",
        fullCreditsDeducted: 1500,
        result: { hidden: true },
      })
    ).toEqual({
      id: 42,
      headline: "增长路径需要重构",
      createdAt: "2026-06-24 10:00:00",
      overallScore: 6.2,
      scoreLabel: "稳健",
      status: "done",
      fullAccess: true,
    });
  });
});
