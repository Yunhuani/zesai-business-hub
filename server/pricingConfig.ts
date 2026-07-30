import { eq } from "drizzle-orm";
import { pricingConfig } from "../drizzle/schema";
import { getDb } from "./db";

export type PricingCategory = "action" | "subscription" | "credit_pack";

export type PricingEntry = {
  key: string;
  category: PricingCategory;
  name: string;
  credits: number | null;
  priceCents: number | null;
  monthlyCredits: number | null;
  durationDays: number | null;
  permanent: boolean;
};

export type PricingConfig = Record<string, PricingEntry>;

type PricingDbExecutor = Pick<
  NonNullable<Awaited<ReturnType<typeof getDb>>>,
  "select"
>;

export const ACTION_KEYS = {
  chat: "action.chat",
  quick_analysis: "action.quick_analysis",
  diagnosis_full: "action.diagnosis_full",
  diagnosis_pdf: "action.diagnosis_pdf",
  business_plan: "action.business_plan",
  equity_structure: "action.equity_structure",
  report_redownload: "action.report_redownload",
} as const;

const DEFAULT_ROWS: PricingEntry[] = [
  { key: ACTION_KEYS.chat, category: "action", name: "对话", credits: 10, priceCents: null, monthlyCredits: null, durationDays: null, permanent: false },
  { key: ACTION_KEYS.quick_analysis, category: "action", name: "快速分析", credits: 200, priceCents: null, monthlyCredits: null, durationDays: null, permanent: false },
  { key: ACTION_KEYS.diagnosis_full, category: "action", name: "诊断（在线生成查看）", credits: 1000, priceCents: null, monthlyCredits: null, durationDays: null, permanent: false },
  { key: ACTION_KEYS.diagnosis_pdf, category: "action", name: "诊断下载 PDF", credits: 0, priceCents: null, monthlyCredits: null, durationDays: null, permanent: false },
  { key: ACTION_KEYS.business_plan, category: "action", name: "商业计划书", credits: 1800, priceCents: null, monthlyCredits: null, durationDays: null, permanent: false },
  { key: ACTION_KEYS.equity_structure, category: "action", name: "股权架构", credits: 1800, priceCents: null, monthlyCredits: null, durationDays: null, permanent: false },
  { key: ACTION_KEYS.report_redownload, category: "action", name: "重下已购报告", credits: 0, priceCents: null, monthlyCredits: null, durationDays: null, permanent: false },
  { key: "subscription.free", category: "subscription", name: "免费版", credits: null, priceCents: 0, monthlyCredits: 0, durationDays: 30, permanent: false },
  { key: "subscription.basic", category: "subscription", name: "基础版", credits: null, priceCents: 9900, monthlyCredits: 1800, durationDays: 30, permanent: false },
  { key: "subscription.professional", category: "subscription", name: "专业版", credits: null, priceCents: 49900, monthlyCredits: 6000, durationDays: 30, permanent: false },
  { key: "subscription.enterprise", category: "subscription", name: "旗舰版", credits: null, priceCents: 99900, monthlyCredits: 15000, durationDays: 30, permanent: false },
  { key: "credit_pack.pack_500", category: "credit_pack", name: "入门包", credits: 500, priceCents: 4900, monthlyCredits: null, durationDays: null, permanent: true },
  { key: "credit_pack.pack_1200", category: "credit_pack", name: "超值包", credits: 1200, priceCents: 9900, monthlyCredits: null, durationDays: null, permanent: true },
  { key: "credit_pack.pack_3000", category: "credit_pack", name: "专业包", credits: 3000, priceCents: 19900, monthlyCredits: null, durationDays: null, permanent: true },
  { key: "credit_pack.pack_8000", category: "credit_pack", name: "企业包", credits: 8000, priceCents: 39900, monthlyCredits: null, durationDays: null, permanent: true },
];

export const DEFAULT_PRICING_CONFIG: PricingConfig = Object.fromEntries(
  DEFAULT_ROWS.map(row => [row.key, row])
);

export function getSeedPricingRows(): PricingEntry[] {
  return DEFAULT_ROWS.map(row => ({ ...row }));
}

function requireEntry(
  config: PricingConfig,
  key: string,
  category: PricingCategory
): PricingEntry {
  const entry = config[key];
  if (!entry || entry.category !== category) {
    throw new Error(`Missing pricing config: ${key}`);
  }
  return entry;
}

export function resolveActionCredits(
  config: PricingConfig,
  action: keyof typeof ACTION_KEYS
): number {
  const entry = requireEntry(config, ACTION_KEYS[action], "action");
  if (entry.credits === null) throw new Error(`Missing credits for ${entry.key}`);
  return entry.credits;
}

export function resolveSubscriptionPlan(config: PricingConfig, planId: string) {
  const entry = requireEntry(config, `subscription.${planId}`, "subscription");
  if (
    entry.priceCents === null ||
    entry.monthlyCredits === null ||
    entry.durationDays === null
  ) {
    throw new Error(`Incomplete subscription pricing: ${entry.key}`);
  }
  return {
    id: planId,
    name: entry.name,
    priceCents: entry.priceCents,
    monthlyCredits: entry.monthlyCredits,
    durationDays: entry.durationDays,
  };
}

export function resolveCreditPack(config: PricingConfig, packId: string) {
  const entry = requireEntry(config, `credit_pack.${packId}`, "credit_pack");
  if (entry.priceCents === null || entry.credits === null) {
    throw new Error(`Incomplete credit pack pricing: ${entry.key}`);
  }
  return {
    id: packId,
    name: entry.name,
    priceCents: entry.priceCents,
    credits: entry.credits,
    permanent: entry.permanent,
  };
}

export async function seedPricingConfig(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const row of DEFAULT_ROWS) {
    await db
      .insert(pricingConfig)
      .values({
        configKey: row.key,
        category: row.category,
        name: row.name,
        credits: row.credits,
        priceCents: row.priceCents,
        monthlyCredits: row.monthlyCredits,
        durationDays: row.durationDays,
        permanent: row.permanent ? 1 : 0,
        enabled: 1,
      })
      .onDuplicateKeyUpdate({
        set: {
          category: row.category,
          name: row.name,
          credits: row.credits,
          priceCents: row.priceCents,
          monthlyCredits: row.monthlyCredits,
          durationDays: row.durationDays,
          permanent: row.permanent ? 1 : 0,
          enabled: 1,
        },
      });
  }
}

export async function getPricingConfig(
  executor?: PricingDbExecutor
): Promise<PricingConfig> {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select()
    .from(pricingConfig)
    .where(eq(pricingConfig.enabled, 1));

  return Object.fromEntries(
    rows.map(row => [
      row.configKey,
      {
        key: row.configKey,
        category: row.category,
        name: row.name,
        credits: row.credits,
        priceCents: row.priceCents,
        monthlyCredits: row.monthlyCredits,
        durationDays: row.durationDays,
        permanent: row.permanent === 1,
      },
    ])
  );
}

export async function getActionCredits(
  action: keyof typeof ACTION_KEYS
): Promise<number> {
  return resolveActionCredits(await getPricingConfig(), action);
}

export async function getSubscriptionPlan(
  planId: string,
  executor?: PricingDbExecutor
) {
  return resolveSubscriptionPlan(await getPricingConfig(executor), planId);
}

export async function getCreditPack(packId: string) {
  return resolveCreditPack(await getPricingConfig(), packId);
}
