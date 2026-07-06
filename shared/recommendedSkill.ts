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

const recommendedSkillBlockRegex = /```json\s*([\s\S]*?"recommendedSkill"[\s\S]*?)```/i;
const partialRecommendedSkillBlockRegex = /```json\s*[\s\S]*?"recommendedSkill"[\s\S]*$/i;

export function extractRecommendedSkill(content: string): RecommendedSkillExtraction {
  const match = content.match(recommendedSkillBlockRegex);

  if (!match) {
    const partialMatch = content.match(partialRecommendedSkillBlockRegex);
    if (partialMatch?.index !== undefined) {
      return {
        displayContent: content.slice(0, partialMatch.index).trim(),
        recommendedSkill: null,
      };
    }

    return {
      displayContent: content,
      recommendedSkill: null,
    };
  }

  try {
    const parsed = JSON.parse(match[1]);
    const recommendedSkill = normalizeRecommendedSkill(parsed?.recommendedSkill);

    return {
      displayContent: content.replace(match[0], "").trim(),
      recommendedSkill,
    };
  } catch {
    return {
      displayContent: content,
      recommendedSkill: null,
    };
  }
}

export function getRecommendedSkillCta(skill: RecommendedSkill): string {
  if (skill.status === "coming_soon") return "预约通知";
  return skill.cta?.trim() || "进入功能";
}

export function getRecommendedSkillHref(skill: RecommendedSkill): string {
  if (skill.status === "coming_soon") {
    return `/support?intent=skill-notify&skill=${encodeURIComponent(skill.key)}`;
  }

  if (skill.key === "nbg_growth_diagnosis") return "/diagnosis";
  if (skill.key === "support") return "/support";
  return "/toolbox";
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
