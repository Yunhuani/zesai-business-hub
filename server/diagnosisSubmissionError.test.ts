import { describe, expect, it } from "vitest";
import { parseDiagnosisInsufficientCredits } from "../client/src/lib/diagnosisSubmissionError";

describe("diagnosis submission error", () => {
  it("parses the credit shortfall returned by the diagnosis API", () => {
    expect(
      parseDiagnosisInsufficientCredits({
        message: JSON.stringify({
          error: "INSUFFICIENT_CREDITS",
          required: 1_000,
          current: 400,
          missing: 600,
        }),
      })
    ).toEqual({
      required: 1_000,
      current: 400,
      missing: 600,
    });
  });

  it("ignores unrelated or malformed errors", () => {
    expect(parseDiagnosisInsufficientCredits(new Error("提交失败"))).toBeNull();
    expect(
      parseDiagnosisInsufficientCredits({
        message: '{"error":"INSUFFICIENT_CREDITS","required":"1000"}',
      })
    ).toBeNull();
  });
});
