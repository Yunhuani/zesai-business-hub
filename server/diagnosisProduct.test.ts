import { describe, expect, it } from "vitest";
import {
  buildDiagnosisPreviewResult,
  getDiagnosisProductCharge,
} from "./diagnosisProduct";

const result = {
  score_summary: {
    overall_score: 6.2,
    score_label: "稳健",
    internal_note: "hidden",
  },
  dimension_outputs: [
    { dimension: "market", score: { value: 7, label: "良好" }, core_judgment: "hidden" },
    { dimension: "competition", score: { value: 6, label: "稳健" }, reasoning_chain: ["hidden"] },
    { dimension: "business_model", score: { value: 5, label: "一般" }, evidence: [{ claim: "hidden" }] },
    { dimension: "capability", score: { value: 6, label: "稳健" }, framework: ["hidden"] },
    { dimension: "finance", score: { value: 7, label: "良好" }, degradation: { upgrade_hook: "hidden" } },
  ],
  synthesis_output: {
    headline: "增长基础尚可",
    overall_judgment: "hidden",
    three_key_findings: [
      { finding_id: "F01", title: "第一个发现", why_surprising: "保留第一条摘要" },
      { finding_id: "F02", title: "第二个发现", why_surprising: "hidden" },
    ],
    transition_to_solution: "hidden",
  },
};

describe("diagnosis products", () => {
  it("returns only five dimension scores and one key finding for preview", () => {
    expect(buildDiagnosisPreviewResult(result)).toEqual({
      score_summary: {
        overall_score: 6.2,
        score_label: "稳健",
      },
      dimension_outputs: [
        { dimension: "market", score: { value: 7, label: "良好" } },
        { dimension: "competition", score: { value: 6, label: "稳健" } },
        { dimension: "business_model", score: { value: 5, label: "一般" } },
        { dimension: "capability", score: { value: 6, label: "稳健" } },
        { dimension: "finance", score: { value: 7, label: "良好" } },
      ],
      synthesis_output: {
        three_key_findings: [
          { title: "第一个发现", why_surprising: "保留第一条摘要" },
        ],
      },
    });
  });

  it("charges only full diagnosis and first PDF purchase", () => {
    expect(getDiagnosisProductCharge("preview", false)).toBeNull();
    expect(getDiagnosisProductCharge("full", false)).toBe("diagnosis_full");
    expect(getDiagnosisProductCharge("pdf", false)).toBe("diagnosis_pdf");
    expect(getDiagnosisProductCharge("pdf", true)).toBe("report_redownload");
  });
});
