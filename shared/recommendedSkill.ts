export type RecommendedSkillStatus = "available" | "coming_soon";

export interface RecommendedSkill {
  key: string;
  name: string;
  status: RecommendedSkillStatus;
  reason?: string;
  cta?: string;
}

export interface RecommendedSkillExtraction {
  displayContent: string;
  recommendedSkill: RecommendedSkill | null;
}

export interface RecommendedSkillTarget {
  key: string;
  name: string;
  description: string;
  available: boolean;
  href: string | null;
  cta: string;
}

export const RECOMMENDED_SKILL_KEYS = [
  "nbg_growth_diagnosis",
  "business_plan",
  "equity_structure",
  "team_management",
  "okr_management",
  "ai_commercialization",
  "support",
] as const;

export type RecommendedSkillKey = typeof RECOMMENDED_SKILL_KEYS[number];

export interface RecommendedSkillMetadata {
  key: RecommendedSkillKey;
  reason: string;
}

export const RECOMMENDED_SKILL_TARGETS: Record<string, RecommendedSkillTarget> = {
  nbg_growth_diagnosis: {
    key: "nbg_growth_diagnosis",
    name: "NBG 增长诊断",
    description: "从市场、竞争、商业模式、内部能力与财务五个维度定位增长瓶颈。",
    available: true,
    href: "/diagnosis/conversation",
    cta: "进入诊断",
  },
  business_plan: {
    key: "business_plan",
    name: "商业计划书",
    description: "梳理融资叙事、商业逻辑与关键经营数据。",
    available: false,
    href: null,
    cta: "即将开放",
  },
  equity_structure: {
    key: "equity_structure",
    name: "股权架构设计",
    description: "结合股东结构与公司阶段设计更稳健的股权方案。",
    available: false,
    href: null,
    cta: "即将开放",
  },
  team_management: {
    key: "team_management",
    name: "团队管理",
    description: "定位组织、人才与协作机制中的关键阻塞。",
    available: false,
    href: null,
    cta: "即将开放",
  },
  okr_management: {
    key: "okr_management",
    name: "目标与 OKR 管理",
    description: "建立目标对齐、拆解与复盘的管理闭环。",
    available: false,
    href: null,
    cta: "即将开放",
  },
  ai_commercialization: {
    key: "ai_commercialization",
    name: "AI 商业化",
    description: "识别 AI 在产品、效率与商业模式中的落地路径。",
    available: false,
    href: null,
    cta: "即将开放",
  },
  support: {
    key: "support",
    name: "人工支持",
    description: "处理账户、计费与需要人工协助的问题。",
    available: false,
    href: null,
    cta: "即将开放",
  },
};

const recommendedSkillBlockRegex = /```json\s*([\s\S]*?"recommendedSkill"[\s\S]*?)```/i;
const partialRecommendedSkillBlockRegex = /```json\s*[\s\S]*?"recommendedSkill"[\s\S]*$/i;

export function extractRecommendedSkill(content: string): RecommendedSkillExtraction {
  const match = content.match(recommendedSkillBlockRegex);

  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      return {
        displayContent: content.replace(match[0], "").trim(),
        recommendedSkill: normalizeRecommendedSkill(parsed?.recommendedSkill),
      };
    } catch {
      return {
        displayContent: content.replace(match[0], "").trim(),
        recommendedSkill: null,
      };
    }
  }

  const partialMatch = content.match(partialRecommendedSkillBlockRegex);
  if (partialMatch?.index !== undefined) {
    return {
      displayContent: content.slice(0, partialMatch.index).trim(),
      recommendedSkill: null,
    };
  }

  const trimmedContent = content.trim();
  const bareObjectStart = content.lastIndexOf("\n{");
  const candidateStart = trimmedContent.startsWith("{")
    ? content.indexOf("{")
    : bareObjectStart >= 0
      ? bareObjectStart + 1
      : -1;
  if (candidateStart >= 0) {
    const candidate = content.slice(candidateStart).trim();
    if (candidate.includes('"recommendedSkill"')) {
      try {
        const parsed = JSON.parse(candidate);
        return {
          displayContent: content.slice(0, candidateStart).trim(),
          recommendedSkill: normalizeRecommendedSkill(parsed?.recommendedSkill),
        };
      } catch {
        return {
          displayContent: content.slice(0, candidateStart).trim(),
          recommendedSkill: null,
        };
      }
    }
  }

  return { displayContent: content, recommendedSkill: null };
}

export function getRecommendedSkillCta(skill: RecommendedSkill): string {
  return getRecommendedSkillTarget(skill.key)?.cta ?? "了解更多";
}

export function getRecommendedSkillHref(skill: RecommendedSkill): string {
  return getRecommendedSkillTarget(skill.key)?.href ?? "/toolbox";
}

export function getRecommendedSkillTarget(key: string): RecommendedSkillTarget | null {
  return RECOMMENDED_SKILL_TARGETS[key] ?? null;
}

function normalizeRecommendedSkill(value: unknown): RecommendedSkill | null {
  if (!value || typeof value !== "object") return null;

  const source = value as Record<string, unknown>;
  const key = typeof source.key === "string" ? source.key.trim() : "";
  const name = typeof source.name === "string" ? source.name.trim() : "";
  const status = source.status;

  if (!key || !name || (status !== "available" && status !== "coming_soon")) {
    return null;
  }

  return {
    key,
    name,
    status,
    reason: typeof source.reason === "string" ? source.reason.trim() : undefined,
    cta: typeof source.cta === "string" ? source.cta.trim() : undefined,
  };
}
