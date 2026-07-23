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

export type DiagnosisReportDataQualityDimension = {
  key: string;
  name: string;
  level: DataQualityLevel | null;
  missingInformation: string[];
  upgradeHook: string | null;
};

export type DiagnosisReportDataQuality = {
  overallLevel: DataQualityLevel | null;
  overallLabel: string | null;
  summary: string | null;
  dimensions: DiagnosisReportDataQualityDimension[];
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
  dataQuality: DiagnosisReportDataQuality | null;
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

type DataQualityLevel = "limited" | "partial" | "full";

const DATA_QUALITY_LEVEL_LABELS: Record<DataQualityLevel, string> = {
  limited: "信息有限",
  partial: "部分完整",
  full: "信息充分",
};

const DATA_QUALITY_FIELD_LABELS: Record<string, string> = {
  "competition.self_scores": "竞争力自评数据",
  "competition.unique_assets": "差异化资源与独特能力",
  "business_model.revenue_mix": "各业务收入结构",
  "capability.digital_keyperson": "数字化关键岗位与负责人情况",
  "finance.product_lines": "产品线收入与成本明细",
  "finance.customers": "客户结构与集中度数据",
  "finance.ar": "应收账款与账期",
};

const DATA_QUALITY_HOOK_FIELD_LABELS: Record<string, string> = {
  ...DATA_QUALITY_FIELD_LABELS,
  self_scores: "竞争力自评数据",
  unique_assets: "差异化资源与独特能力",
  revenue_mix: "各业务收入结构",
  digital_keyperson: "数字化关键岗位与负责人情况",
  product_lines: "产品线收入与成本明细",
  customers: "客户结构与集中度数据",
  ar: "应收账款与账期",
};

const INTERNAL_FIELD_PATTERN =
  /\b(?:[a-z][a-z0-9_]*\.[a-z][a-z0-9_.]*|[a-z][a-z0-9]*(?:_[a-z0-9]+)+)\b/i;

const INTERNAL_TERM_LABELS: Array<[RegExp, string]> = [
  [/\bmarket_brief\.market\b/g, "外部市场情报"],
  [/\bmarket_brief\.competition\b/g, "外部竞争情报"],
  [/\bcompetition\.self_scores\b/g, "竞争力自评数据"],
  [/\bfinance\.product_lines\b/g, "产品线盈利数据"],
  [/\bfinance\.customers\b/g, "客户集中度数据"],
  [/\bfinancial_facts\.cash_runway_months\b/g, "现金跑道"],
  [/\bself_scores\b/g, "竞争力自评数据"],
];

const CUSTOMER_SAFE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/未提供\s*外部市场情报/g, "市场判断采用结构性定性评估口径"],
  [/未提供\s*外部竞争情报/g, "竞争判断采用结构性定性评估口径"],
  [
    /未检索到\s*[,，]?\s*(?:留待补充)?|(?:该项|结论)?\s*(?:留待补充|待补充)/g,
    "该项可在方案深化阶段进一步细化",
  ],
  [/缺少\s*[^，。；;,\n]*?数据(?:\s*数据)?/g, "该部分可在方案深化阶段进一步量化"],
  [/未提供\s*[^，。；;,\n]*/g, "该项可在方案深化阶段进一步细化"],
  [/缺少\s*[^，。；;,\n]*/g, "该部分可在方案深化阶段进一步量化"],
  [/降级(?:判断|口径|处理)?/g, "结构性定性评估口径"],
];

export function sanitizeCustomerText(value: string): string {
  const labeledCopy = INTERNAL_TERM_LABELS.reduce(
    (copy, [pattern, label]) => copy.replace(pattern, label),
    value
  );
  const customerSafeCopy = CUSTOMER_SAFE_REPLACEMENTS.reduce(
    (copy, [pattern, replacement]) => copy.replace(pattern, replacement),
    labeledCopy
  );

  return customerSafeCopy.replace(
    /\b[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*)+\b/gi,
    "相关数据"
  );
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

function dataQualityLevel(value: unknown): DataQualityLevel | null {
  return value === "limited" || value === "partial" || value === "full"
    ? value
    : null;
}

function mappedMissingInformation(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return Array.from(new Set(value.flatMap(item => {
    if (typeof item !== "string") return [];
    const label = DATA_QUALITY_FIELD_LABELS[item.trim()];
    return label ? [sanitizeCustomerText(label)] : [];
  })));
}

function sentenceFingerprint(value: string): string {
  return value
    .replace(
      /若|如能|如果|补充|相关|数据|信息|后|可|将|能够|有助于|进一步|更准确地|准确地|更好地|提高|提升/g,
      ""
    )
    .replace(/[\s，。！？；、,.!?;：“”‘’（）()]/g, "");
}

function bigrams(value: string): Set<string> {
  const result = new Set<string>();
  for (let index = 0; index < value.length - 1; index += 1) {
    result.add(value.slice(index, index + 2));
  }
  return result;
}

function sentencesAreSimilar(left: string, right: string): boolean {
  const leftFingerprint = sentenceFingerprint(left);
  const rightFingerprint = sentenceFingerprint(right);
  if (!leftFingerprint || !rightFingerprint) return false;
  if (
    leftFingerprint === rightFingerprint ||
    leftFingerprint.includes(rightFingerprint) ||
    rightFingerprint.includes(leftFingerprint)
  ) {
    return true;
  }

  const leftBigrams = bigrams(leftFingerprint);
  const rightBigrams = bigrams(rightFingerprint);
  if (leftBigrams.size === 0 || rightBigrams.size === 0) return false;
  const overlap = Array.from(leftBigrams).filter(item =>
    rightBigrams.has(item)
  ).length;
  return (2 * overlap) / (leftBigrams.size + rightBigrams.size) >= 0.68;
}

function deduplicateSentences(value: string): string {
  const sentences = value.match(/[^。！？!?；;]+[。！？!?；;]?/g) ?? [];
  return sentences.reduce<string[]>((unique, sentence) => {
    const trimmed = sentence.trim();
    if (!trimmed || unique.some(item => sentencesAreSimilar(item, trimmed))) {
      return unique;
    }
    return [...unique, trimmed];
  }, []).join("");
}

function cleanDataQualityUpgradeHook(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;

  const translated = Object.entries(DATA_QUALITY_HOOK_FIELD_LABELS)
    .sort(([left], [right]) => right.length - left.length)
    .reduce(
      (copy, [field, label]) => copy.split(field).join(label),
      value.trim()
    );
  if (INTERNAL_FIELD_PATTERN.test(translated)) return null;

  const cleaned = deduplicateSentences(sanitizeCustomerText(translated));
  return cleaned && !INTERNAL_FIELD_PATTERN.test(cleaned) ? cleaned : null;
}

function buildDataQuality(value: unknown): DiagnosisReportDataQuality | null {
  const dataQuality = object(value);
  if (!dataQuality) return null;

  const level = dataQualityLevel(dataQuality.overall_level);
  const rawDimensions = Array.isArray(dataQuality.dimensions)
    ? dataQuality.dimensions
    : [];
  const dimensions = rawDimensions.flatMap(rawDimension => {
    const dimension = object(rawDimension);
    if (!dimension || typeof dimension.dimension !== "string") return [];
    const key = dimension.dimension.trim();
    const name = DIMENSION_NAMES[key];
    if (!name) return [];

    return [{
      key,
      name: sanitizeCustomerText(name),
      level: dataQualityLevel(dimension.level),
      missingInformation: mappedMissingInformation(dimension.missing_plus),
      upgradeHook: cleanDataQualityUpgradeHook(dimension.upgrade_hook),
    }];
  });

  return {
    overallLevel: level,
    overallLabel: level
      ? sanitizeCustomerText(DATA_QUALITY_LEVEL_LABELS[level])
      : null,
    summary: text(dataQuality.summary),
    dimensions,
  };
}

export function buildDiagnosisReport(input: unknown): DiagnosisReport {
  const diagnosis = object(input) ?? {};
  const intake = object(diagnosis.intake) ?? {};
  const company = object(intake.company) ?? {};
  const result = object(diagnosis.result) ?? {};
  const scoreSummary = object(result.score_summary) ?? {};
  const synthesis = object(result.synthesis_output) ?? {};
  const dataQuality = buildDataQuality(result.data_quality);
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
    dataQuality,
    keyFindings,
    transitionToSolution: text(synthesis.transition_to_solution),
  };
}
