type JsonObject = Record<string, unknown>;

export type BusinessPlanSourceType =
  | "client_provided"
  | "engine_rewrite"
  | "search_validation"
  | "pending_customer";

export type BusinessPlanPendingItem = {
  moduleId: number;
  fieldName: string;
  message: string | null;
};

export type BusinessPlanReportModule = {
  id: number;
  key: BusinessPlanModuleKey;
  title: string;
  headline: string | null;
  headlineSource: BusinessPlanSourceType | null;
  status: "success" | "error";
  errorMessage: string | null;
  fields: JsonObject;
  sources: Record<string, BusinessPlanSourceType>;
  pendingItems: BusinessPlanPendingItem[];
};

export type BusinessPlanReport = {
  id: number;
  title: string;
  cover: {
    companyName: string;
    slogan: string;
    date: string | null;
  };
  modules: BusinessPlanReportModule[];
  pendingItems: BusinessPlanPendingItem[];
};

type BusinessPlanModuleKey =
  | "demand"
  | "product_model"
  | "market"
  | "competition"
  | "current_state"
  | "plan"
  | "funding"
  | "team";

const MODULES: Array<{
  id: number;
  key: BusinessPlanModuleKey;
  title: string;
}> = [
  { id: 1, key: "demand", title: "需求" },
  { id: 2, key: "product_model", title: "产品与模式" },
  { id: 3, key: "market", title: "市场规模" },
  { id: 4, key: "competition", title: "竞争分析" },
  { id: 5, key: "current_state", title: "目前状况" },
  { id: 6, key: "plan", title: "未来规划" },
  { id: 7, key: "funding", title: "融资计划" },
  { id: 8, key: "team", title: "团队" },
];

const BODY_PROSE_PATH =
  /(?:^|\.)(?:target_customer|pain_points|why_now|solution|core_value|sales_model|market_narrative|differentiation|product_status|endorsements|objective|deliverables|description|background)(?:\[|\.|$)/;
const SENTENCE_END = /[。！？；：!?;:]$/;

function object(value: unknown): JsonObject | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function rawText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function normalizeBusinessPlanProse(value: string): string {
  const normalized = value
    .trim()
    .replace(/,/g, "，")
    .replace(/\.(?=\s|$)/g, "。");
  return normalized && !SENTENCE_END.test(normalized)
    ? `${normalized}。`
    : normalized;
}

export function parseBusinessPlanNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value !== "string") return 0;
  const match = value.replace(/,/g, "").match(/-?[\d.]+/);
  if (!match) return 0;
  const amount = Number(match[0]);
  if (!Number.isFinite(amount)) return 0;
  return value.includes("亿") ? amount * 10_000 : amount;
}

export type BusinessPlanCoverage = {
  regions: Array<{ name: string; value: number }>;
  fallbackText: string | null;
};

export function parseBusinessPlanCoverage(
  value: unknown
): BusinessPlanCoverage {
  const text = rawText(value);
  if (!text) return { regions: [], fallbackText: null };

  const coveragePart = /([^、，,\d\s]+)\s*(\d+(?:\.\d+)?)%/g;
  const regions = [...text.matchAll(coveragePart)]
    .map(match => ({ name: match[1], value: Number(match[2]) }))
    .filter(region => Number.isFinite(region.value) && region.value >= 0);
  const unparsed = text
    .replace(coveragePart, "")
    .replace(/[、，,；;\s]/g, "");

  return regions.length > 0 && !unparsed
    ? { regions, fallbackText: null }
    : { regions: [], fallbackText: text };
}

function sourceType(value: unknown): BusinessPlanSourceType | null {
  return value === "client_provided" ||
    value === "engine_rewrite" ||
    value === "search_validation" ||
    value === "pending_customer"
    ? value
    : null;
}

function isFieldOutput(value: unknown): value is JsonObject {
  const candidate = object(value);
  return Boolean(
    candidate && "value" in candidate && sourceType(candidate.source_type)
  );
}

function pathFor(parent: string, child: string): string {
  return parent ? `${parent}.${child}` : child;
}

function unwrapFieldValue(
  value: unknown,
  path: string,
  sources: Record<string, BusinessPlanSourceType>,
  inheritedSource: BusinessPlanSourceType | null = null
): unknown {
  if (isFieldOutput(value)) {
    const ownSource = sourceType(value.source_type);
    if (ownSource && path) sources[path] = ownSource;
    return unwrapFieldValue(value.value, path, sources, ownSource);
  }

  if (Array.isArray(value)) {
    return value.map((item, index) =>
      unwrapFieldValue(item, `${path}[${index}]`, sources, inheritedSource)
    );
  }

  const record = object(value);
  if (record) {
    return Object.fromEntries(
      Object.entries(record).map(([key, child]) => [
        key,
        unwrapFieldValue(child, pathFor(path, key), sources, inheritedSource),
      ])
    );
  }

  if (
    typeof value === "string" &&
    inheritedSource === "client_provided" &&
    BODY_PROSE_PATH.test(path)
  ) {
    return normalizeBusinessPlanProse(value);
  }
  return value;
}

function unwrapModuleFields(value: unknown) {
  const module = object(value);
  const rawFields = object(module?.fields) ?? {};
  const sources: Record<string, BusinessPlanSourceType> = {};
  const fields = unwrapFieldValue(rawFields, "", sources);
  return {
    fields: object(fields) ?? {},
    sources,
  };
}

function isSearchOnlyPending(fieldName: string): boolean {
  return (
    fieldName === "market_validation" ||
    /(?:^|\.)competitors\[\d+\]\.public_evidence$/.test(fieldName)
  );
}

function buildPendingItems(value: unknown): BusinessPlanPendingItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const pending = object(item);
    const moduleId = number(pending?.module_id);
    const fieldName = rawText(pending?.field_name);
    if (moduleId === null || !fieldName || isSearchOnlyPending(fieldName))
      return [];
    return [
      {
        moduleId,
        fieldName,
        message: rawText(pending?.message),
      },
    ];
  });
}

function moduleStatus(value: unknown, moduleId: number) {
  const statuses = object(value);
  const status = object(statuses?.[String(moduleId)]);
  return {
    status:
      status?.status === "error" ? ("error" as const) : ("success" as const),
    errorMessage: rawText(status?.error_message),
  };
}

export function buildBusinessPlanReport(input: unknown): BusinessPlanReport {
  const record = object(input) ?? {};
  const result = object(record.result) ?? {};
  const overview = unwrapModuleFields(result.project_overview).fields;
  const pendingItems = buildPendingItems(result.pending_items);

  return {
    id: number(record.id) ?? 0,
    title: rawText(result.bp_title) ?? "商业计划书",
    cover: {
      companyName: rawText(overview.company_name) ?? "待确认公司",
      slogan: rawText(overview.slogan) ?? "",
      date: rawText(record.createdAt),
    },
    modules: MODULES.map(definition => {
      const rawModule = object(result[definition.key]);
      const content = unwrapModuleFields(rawModule);
      const status = moduleStatus(result.module_statuses, definition.id);
      const headlineSources: Record<string, BusinessPlanSourceType> = {};
      const headlineValue = unwrapFieldValue(
        rawModule?.headline ?? object(rawModule?.fields)?.headline,
        "headline",
        headlineSources
      );
      const headlineSource = headlineSources.headline ?? null;
      const headline =
        headlineSource === "pending_customer" ? null : rawText(headlineValue);
      return {
        ...definition,
        ...status,
        ...content,
        headline,
        headlineSource,
        pendingItems: pendingItems.filter(
          item => item.moduleId === definition.id
        ),
      };
    }),
    pendingItems,
  };
}
