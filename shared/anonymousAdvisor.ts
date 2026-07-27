export const ANONYMOUS_ADVISOR_LIMIT = 1;

export const ANONYMOUS_REGISTER_GUIDANCE =
  "继续深入聊下去，建议先注册——这样我们能记住你公司的背景，后面的建议会更准。";

export function getNextAnonymousTurnState(currentTurns: number) {
  const safeTurns = Math.max(0, Math.min(ANONYMOUS_ADVISOR_LIMIT, Math.floor(currentTurns || 0)));

  if (safeTurns >= ANONYMOUS_ADVISOR_LIMIT) {
    return {
      allowed: false,
      nextTurns: ANONYMOUS_ADVISOR_LIMIT,
      shouldAppendGuidance: false,
    };
  }

  const nextTurns = safeTurns + 1;
  return {
    allowed: true,
    nextTurns,
    shouldAppendGuidance: false,
  };
}

export function appendAnonymousGuidance(content: string) {
  const trimmed = content.trim();
  if (trimmed.includes(ANONYMOUS_REGISTER_GUIDANCE)) {
    return trimmed;
  }

  return `${trimmed}\n\n${ANONYMOUS_REGISTER_GUIDANCE}`;
}
