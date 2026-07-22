import { z } from "zod";

import {
  RECOMMENDED_SKILL_KEYS,
  type RecommendedSkillMetadata,
} from "../shared/recommendedSkill";
import { invokeLLM, type InvokeParams, type InvokeResult } from "./_core/llm";

export const recommendationClassificationSchema = z.object({
  key: z.enum(RECOMMENDED_SKILL_KEYS),
  reason: z.string().trim().min(1).max(200),
}).strict();

type ClassificationMessage = { role: "user" | "assistant"; content: string };
type InvokeClassification = (params: InvokeParams) => Promise<InvokeResult>;

const CLASSIFIER_PROMPT = `你是泽思AI顾问的推荐路由分类器。只返回 JSON 对象，不要 Markdown，不要额外文字。
对象必须且只能包含 key 和 reason。key 必须是以下值之一：${RECOMMENDED_SKILL_KEYS.join(", ")}。
reason 用一句不超过 80 个汉字的话说明匹配原因。不要输出名称、状态、CTA 或 URL。`;

export async function classifyAdvisorRecommendation({
  question,
  history,
  invoke = invokeLLM,
}: {
  question: string;
  history: ClassificationMessage[];
  invoke?: InvokeClassification;
}): Promise<RecommendedSkillMetadata | null> {
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
      if (parsed.success) return parsed.data;
    } catch {
      // One retry is allowed; recommendation failure must not fail the answer.
    }
  }

  return null;
}
