import type { RecommendedSkillMetadata } from "./recommendedSkill";

export type AdvisorStreamEvent =
  | { type: "message.delta"; delta: string }
  | { type: "recommendation"; recommendation: RecommendedSkillMetadata }
  | { type: "done"; warning?: string };

export function serializeAdvisorSseEvent(event: AdvisorStreamEvent) {
  return JSON.stringify(event);
}

export function parseAdvisorSseData(data: string): AdvisorStreamEvent | null {
  if (data === "[DONE]") return { type: "done" };

  try {
    const parsed = JSON.parse(data) as Record<string, unknown>;
    if (parsed.type === "message.delta" && typeof parsed.delta === "string") {
      return { type: "message.delta", delta: parsed.delta };
    }
    if (parsed.type === "done") return { type: "done" };
    if (parsed.type === "recommendation" && parsed.recommendation) {
      return parsed as AdvisorStreamEvent;
    }

    // Compatibility with streams started before the typed protocol rollout.
    if (typeof parsed.delta === "string") {
      return { type: "message.delta", delta: parsed.delta };
    }
  } catch {
    return null;
  }

  return null;
}

export function formatAdvisorSseEvent(event: AdvisorStreamEvent) {
  return `data: ${serializeAdvisorSseEvent(event)}\n\n`;
}
