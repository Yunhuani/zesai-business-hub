import { describe, expect, it } from "vitest";
import {
  buildDiagnosisSupportHref,
  buildDiagnosisSupportPrefill,
} from "../client/src/pages/supportDiagnosisContext";

describe("diagnosis support context", () => {
  it("adds the diagnosis id to the support link", () => {
    expect(buildDiagnosisSupportHref(42)).toBe("/support?diagnosisId=42");
  });

  it("prefills a diagnosis consultation with its id and report link", () => {
    const prefill = buildDiagnosisSupportPrefill(
      "?diagnosisId=42",
      "https://www.zesiai.com"
    );

    expect(prefill).toContain("NBG 诊断");
    expect(prefill).toContain("诊断 ID：42");
    expect(prefill).toContain(
      "https://www.zesiai.com/diagnosis/42/report"
    );
  });

  it("leaves ordinary support tickets unchanged", () => {
    expect(buildDiagnosisSupportPrefill("", "https://www.zesiai.com")).toBe("");
    expect(
      buildDiagnosisSupportPrefill(
        "?diagnosisId=not-a-number",
        "https://www.zesiai.com"
      )
    ).toBe("");
  });
});
