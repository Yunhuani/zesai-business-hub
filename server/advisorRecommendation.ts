import { z } from "zod";

import {
  RECOMMENDED_SKILL_TARGETS,
  type RecommendedSkillKey,
  type RecommendedSkillMetadata,
} from "../shared/recommendedSkill";
import { invokeLLM, type InvokeParams, type InvokeResult } from "./_core/llm";

const availableSkillTargets = Object.values(RECOMMENDED_SKILL_TARGETS)
  .filter(target => target.available);
const availableSkillKeys = new Set(availableSkillTargets.map(target => target.key));

export const recommendationClassificationSchema = z.object({
  key: z.string().refine(
    key => key === "none" || availableSkillKeys.has(key),
    "key must be none or an available recommended skill",
  ),
  reason: z.string().trim().min(1).max(200),
}).strict();

type ClassificationMessage = { role: "user" | "assistant"; content: string };
type InvokeClassification = (params: InvokeParams) => Promise<InvokeResult>;

const availableSkillPrompt = availableSkillTargets
  .map(target => `${target.key}（${target.name}）：${target.description}`)
  .join("\n");

const CLASSIFIER_PROMPT = `你是泽思AI顾问的推荐路由分类器。只返回 JSON 对象，不要 Markdown，不要额外文字。
只允许推荐当前已上线可用的技能：
${availableSkillPrompt || "当前没有已上线可用的技能。"}

只有当客户的问题明显属于以下经营困境之一，才返回对应的已上线技能：业务不增长/业绩上不去、经营陷入困境、产品卖不动、竞争太激烈、公司面临转型、明确想找顾问系统解决难题。
寒暄、简单问题、单点问题、以及不匹配上述困境的，一律返回 none。
对象必须且只能包含 key 和 reason。key 必须是以上已上线技能的 key 或 none。
reason 用一句不超过 80 个汉字的话说明判断原因。不要输出名称、状态、CTA 或 URL。`;

export async function classifyAdvisorRecommendation({
  question,
  history,
  invoke = invokeLLM,
}: {
  question: string;
  history: ClassificationMessage[];
  invoke?: InvokeClassification;
}): Promise<RecommendedSkillMetadata | null> {
  const userMessages = history.filter(message => message.role === "user");
  const currentQuestionAlreadyIncluded =
    userMessages.at(-1)?.content.trim() === question.trim();
  const userTurnCount = userMessages.length + (currentQuestionAlreadyIncluded ? 0 : 1);
  if (userTurnCount < 5) return null;

  const context = history
    .slice(-6)
    .map(message => `${message.role}: ${message.content.slice(0, 1200)}`)
    .join("\n");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const result = await invoke({
        messages: [
          { role: "system", content: CLASSIFIER_PROMPT },
          { role: "user", content: `当前问题：${question.slice(0, 2000)}\n\n必要上下文：\n${context || "无"}` },
        ],
        responseFormat: { type: "json_object" },
        thinking: { type: "disabled" },
        maxTokens: 300,
      });
      const content = result.choices[0]?.message?.content;
      if (typeof content !== "string") continue;
      const parsed = recommendationClassificationSchema.safeParse(JSON.parse(content));
      if (!parsed.success) continue;
      if (parsed.data.key === "none") return null;
      return {
        key: parsed.data.key as RecommendedSkillKey,
        reason: parsed.data.reason,
      };
    } catch {
      // One retry is allowed; recommendation failure must not fail the answer.
    }
  }

  return null;
}
