type JsonObject = Record<string, unknown>;

export type DiagnosisReportDimension = {
  key: string;
  name: string;
  score: number | null;
  scoreLabel: string | null;
  scoreBasis: string | null;
  judgment: string | null;
  reasoning: string[];
  evidence: Array<{
    claim: string;
    value: string | null;
    benchmark: string | null;
  }>;
  frameworks: string[];
  degraded: boolean;
  upgradeHook: string | null;
};

export type DiagnosisReport = {
  id: number;
  companyName: string;
  createdAt: string | null;
  headline: string | null;
  overallScore: number | null;
  scoreLabel: string | null;
  overallJudgment: string | null;
  dimensions: DiagnosisReportDimension[];
  keyFindings: Array<{
    id: string | null;
    title: string;
    detail: string | null;
  }>;
  transitionToSolution: string | null;
};

const DIMENSION_NAMES: Record<string, string> = {
  market: "市场与机会",
  competition: "竞争格局",
  business_model: "商业模式",
  capability: "内部能力",
  finance: "财务健康",
};

const INTERNAL_TERM_LABELS: Array<[RegExp, string]> = [
  [/\bmarket_brief\.market\b/g, "外部市场情报"],
  [/\bmarket_brief\.competition\b/g, "外部竞争情报"],
  [/\bcompetition\.self_scores\b/g, "竞争力自评数据"],
  [/\bfinance\.product_lines\b/g, "产品线盈利数据"],
  [/\bfinance\.customers\b/g, "客户集中度数据"],
  [/\bfinancial_facts\.cash_runway_months\b/g, "现金跑道"],
  [/\bself_scores\b/g, "竞争力自评数据"],
];

export function sanitizeCustomerText(value: string): string {
  return INTERNAL_TERM_LABELS.reduce(
    (copy, [pattern, label]) => copy.replace(pattern, label),
    value
  ).replace(/\b[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\b/gi, "相关数据");
}

function object(value: unknown): JsonObject | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : null;
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim()
    ? sanitizeCustomerText(value.trim())
    : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function textList(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map(text).filter((item): item is string => item !== null)
    : [];
}

export function buildDiagnosisReport(input: unknown): DiagnosisReport {
  const diagnosis = object(input) ?? {};
  const intake = object(diagnosis.intake) ?? {};
  const company = object(intake.company) ?? {};
  const result = object(diagnosis.result) ?? {};
  const scoreSummary = object(result.score_summary) ?? {};
  const synthesis = object(result.synthesis_output) ?? {};
  const rawDimensions = Array.isArray(result.dimension_outputs)
    ? result.dimension_outputs
    : [];

  const dimensions = rawDimensions.flatMap(rawDimension => {
    const dimension = object(rawDimension);
    if (!dimension) return [];

    const key = text(dimension.dimension) ?? "unknown";
    const score = object(dimension.score) ?? {};
    const degradation = object(dimension.degradation) ?? {};
    const rawEvidence = Array.isArray(dimension.evidence)
      ? dimension.evidence
      : [];

    return [{
      key,
      name: DIMENSION_NAMES[key] ?? key,
      score: number(score.value),
      scoreLabel: text(score.label),
      scoreBasis: text(score.rubric_basis),
      judgment: text(dimension.core_judgment),
      reasoning: textList(dimension.reasoning_chain),
      evidence: rawEvidence.flatMap(rawItem => {
        const item = object(rawItem);
        const claim = item ? text(item.claim) : null;
        if (!item || !claim) return [];

        return [{
          claim,
          value: text(item.value),
          benchmark: text(item.benchmark),
        }];
      }),
      frameworks: textList(dimension.framework),
      degraded: degradation.degraded === true,
      upgradeHook: text(degradation.upgrade_hook),
    }];
  });

  const rawFindings = Array.isArray(synthesis.three_key_findings)
    ? synthesis.three_key_findings
    : [];
  const keyFindings = rawFindings.flatMap(rawFinding => {
    const finding = object(rawFinding);
    const title = finding ? text(finding.title) : null;
    if (!finding || !title) return [];

    return [{
      id: text(finding.finding_id),
      title,
      detail: text(finding.why_surprising),
    }];
  });

  return {
    id: number(diagnosis.id) ?? 0,
    companyName: text(company.name) ?? "待确认公司",
    createdAt: text(diagnosis.createdAt),
    headline: text(synthesis.headline) ?? text(diagnosis.headline),
    overallScore:
      number(scoreSummary.overall_score) ?? number(diagnosis.overallScore),
    scoreLabel:
      text(scoreSummary.score_label) ?? text(diagnosis.scoreLabel),
    overallJudgment: text(synthesis.overall_judgment),
    dimensions,
    keyFindings,
    transitionToSolution: text(synthesis.transition_to_solution),
  };
}
