import {
  extractRecommendedSkill,
  getRecommendedSkillTarget,
  type RecommendedSkill,
  type RecommendedSkillMetadata,
} from "@shared/recommendedSkill";

export function getAssistantPresentation(message: {
  content: string;
  recommendationMetadata?: RecommendedSkillMetadata | null;
}) {
  if (message.recommendationMetadata) {
    const target = getRecommendedSkillTarget(message.recommendationMetadata.key);
    if (target) {
      const recommendedSkill: RecommendedSkill = {
        key: target.key,
        name: target.name,
        status: target.available ? "available" : "coming_soon",
        reason: message.recommendationMetadata.reason,
        cta: target.cta,
      };
      return { displayContent: message.content, recommendedSkill };
    }
  }

  return extractRecommendedSkill(message.content);
}
