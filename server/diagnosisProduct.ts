import type { ACTION_KEYS } from "./pricingConfig";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

export function buildDiagnosisPreviewResult(result: unknown): JsonObject {
  const source = object(result) ?? {};
  const scoreSummary = object(source.score_summary) ?? {};
  const synthesis = object(source.synthesis_output) ?? {};
  const dimensions = Array.isArray(source.dimension_outputs)
    ? source.dimension_outputs
    : [];
  const findings = Array.isArray(synthesis.three_key_findings)
    ? synthesis.three_key_findings
    : [];

  return {
    score_summary: {
      overall_score: scoreSummary.overall_score,
      score_label: scoreSummary.score_label,
    },
    dimension_outputs: dimensions.slice(0, 5).flatMap(rawDimension => {
      const dimension = object(rawDimension);
      if (!dimension) return [];
      const score = object(dimension.score) ?? {};
      return [{
        dimension: dimension.dimension,
        score: {
          value: score.value,
          label: score.label,
        },
      }];
    }),
    synthesis_output: {
      three_key_findings: findings.slice(0, 1).flatMap(rawFinding => {
        const finding = object(rawFinding);
        if (!finding) return [];
        return [{
          title: finding.title,
          why_surprising: finding.why_surprising,
        }];
      }),
    },
  };
}

export type DiagnosisProduct = "preview" | "full" | "pdf";
export type DiagnosisAction = keyof typeof ACTION_KEYS;

export function getDiagnosisProductCharge(
  product: DiagnosisProduct,
  alreadyPurchased: boolean
): DiagnosisAction | null {
  if (product === "preview") return null;
  if (product === "full") return "diagnosis_full";
  return alreadyPurchased ? "report_redownload" : "diagnosis_pdf";
}
