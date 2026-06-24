export type QuestionnaireAnswer = string | string[];
export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>;
export type QuestionnaireCustomValues = Record<string, string>;

type StringMap = Record<string, string>;

export type DiagnosisIntake = {
  company: {
    name: string;
    industry_sub: string;
    region: string;
    revenue_band: string;
    revenue_trend: string;
    headcount_band: string;
    channels: string[];
    top_anxiety: string;
  };
  market: {
    home_market: string;
    expansion_intent: string | null;
    demand_shift: null;
  };
  competition: {
    competitors: string[];
    customer_values: string[];
    self_scores: null;
    unique_assets: string[] | null;
  };
  business_model: {
    revenue_sources: string;
    how_earn_retain: string;
    revenue_mix: null;
  };
  capability: {
    team_structure: StringMap;
    function_strength: StringMap;
    digital_keyperson: null;
  };
  finance_basic: {
    net_margin_band: string;
    cost_structure: string;
    cash: number | null;
    monthly_fixed: number | null;
  };
  finance_plus: null;
  availability_map: {
    plus_present: string[];
    plus_missing: string[];
  };
};

const TREND_VALUES: Record<string, string> = {
  持续增长: "up",
  基本持平: "flat",
  有所下滑: "down",
};

function normalizeRange(value: string): string {
  return value.replace(/[–—]/g, "-").trim();
}

function getString(
  answers: QuestionnaireAnswers,
  field: string
): string {
  const value = answers[field];
  return typeof value === "string" ? value.trim() : "";
}

function getStrings(
  answers: QuestionnaireAnswers,
  customValues: QuestionnaireCustomValues,
  field: string
): string[] {
  const value = answers[field];
  const preset = Array.isArray(value)
    ? value.map(item => item.trim()).filter(Boolean)
    : typeof value === "string" && value.trim()
      ? [value.trim()]
      : [];
  const custom = customValues[field]?.trim();
  return custom ? [...new Set([...preset, custom])] : preset;
}

function getSingleChoice(
  answers: QuestionnaireAnswers,
  customValues: QuestionnaireCustomValues,
  field: string
): string {
  const custom = customValues[field]?.trim();
  return custom || getString(answers, field);
}

function splitList(value: string): string[] {
  return value
    .split(/[\n,，;；、]+/)
    .map(item => item.trim())
    .filter(Boolean);
}

function optionalNumber(value: string, label: string): number | null {
  if (!value) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label}必须是数字`);
  }
  return parsed;
}

function matrixValues(
  answers: QuestionnaireAnswers,
  prefix: string,
  fields: Array<[string, string]>,
  customValue: string | undefined
): StringMap {
  const result: StringMap = {};

  for (const [key, field] of fields) {
    const value = getString(answers, `${prefix}.${field}`);
    if (value) result[key] = value;
  }

  const note = customValue?.trim();
  if (note) result["补充说明"] = note;
  return result;
}

export function convertQuestionnaireAnswers(
  answers: QuestionnaireAnswers,
  customValues: QuestionnaireCustomValues
): DiagnosisIntake {
  const uniqueAssets = splitList(
    getString(answers, "competition.unique_assets")
  );
  const plusPresent = uniqueAssets.length > 0
    ? ["competition.unique_assets"]
    : [];
  const plusMissing = [
    "finance.product_lines",
    "competition.self_scores",
    "finance.customers",
    ...(uniqueAssets.length > 0 ? [] : ["competition.unique_assets"]),
  ];

  return {
    company: {
      name: getString(answers, "company.name"),
      industry_sub: getString(answers, "company.industry_sub"),
      region: getStrings(answers, customValues, "company.region").join("、"),
      revenue_band: normalizeRange(
        getSingleChoice(answers, customValues, "company.revenue_band")
      ),
      revenue_trend:
        TREND_VALUES[
          getSingleChoice(answers, customValues, "company.revenue_trend")
        ] || getSingleChoice(answers, customValues, "company.revenue_trend"),
      headcount_band: normalizeRange(
        getSingleChoice(answers, customValues, "company.headcount_band")
      ),
      channels: getStrings(answers, customValues, "company.channels"),
      top_anxiety: getString(answers, "company.top_anxiety"),
    },
    market: {
      home_market: getString(answers, "market.home_market"),
      expansion_intent:
        getString(answers, "market.expansion_intent") || null,
      demand_shift: null,
    },
    competition: {
      competitors: splitList(
        getString(answers, "competition.competitors")
      ),
      customer_values: getStrings(
        answers,
        customValues,
        "competition.customer_values"
      ),
      self_scores: null,
      unique_assets: uniqueAssets.length > 0 ? uniqueAssets : null,
    },
    business_model: {
      revenue_sources: getString(
        answers,
        "business_model.revenue_sources"
      ),
      how_earn_retain: getString(
        answers,
        "business_model.how_earn_retain"
      ),
      revenue_mix: null,
    },
    capability: {
      team_structure: matrixValues(
        answers,
        "capability.team_structure",
        [
          ["研发", "研发"],
          ["生产", "生产"],
          ["销售", "销售"],
          ["职能", "职能"],
        ],
        customValues["team-structure"]
      ),
      function_strength: matrixValues(
        answers,
        "capability.function_strength",
        [
          ["product", "product"],
          ["supply_chain", "supply_chain"],
          ["channel", "channel"],
          ["marketing", "marketing"],
          ["finance", "finance"],
        ],
        customValues["function-strength"]
      ),
      digital_keyperson: null,
    },
    finance_basic: {
      net_margin_band: normalizeRange(
        getSingleChoice(answers, customValues, "finance_basic.net_margin_band")
      ),
      cost_structure: getString(answers, "finance_basic.cost_structure"),
      cash: optionalNumber(
        getString(answers, "finance_basic.cash"),
        "账上现金"
      ),
      monthly_fixed: optionalNumber(
        getString(answers, "finance_basic.monthly_fixed"),
        "每月刚性支出"
      ),
    },
    finance_plus: null,
    availability_map: {
      plus_present: plusPresent,
      plus_missing: plusMissing,
    },
  };
}
