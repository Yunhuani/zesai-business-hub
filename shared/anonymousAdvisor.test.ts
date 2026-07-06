import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_ADVISOR_LIMIT,
  ANONYMOUS_REGISTER_GUIDANCE,
  appendAnonymousGuidance,
  getNextAnonymousTurnState,
} from "./anonymousAdvisor";

describe("anonymous advisor turn limit", () => {
  it("allows the first three turns and marks the third for registration guidance", () => {
    expect(getNextAnonymousTurnState(0)).toEqual({
      allowed: true,
      nextTurns: 1,
      shouldAppendGuidance: false,
    });
    expect(getNextAnonymousTurnState(2)).toEqual({
      allowed: true,
      nextTurns: ANONYMOUS_ADVISOR_LIMIT,
      shouldAppendGuidance: true,
    });
  });

  it("blocks turns after the anonymous limit", () => {
    expect(getNextAnonymousTurnState(3)).toEqual({
      allowed: false,
      nextTurns: ANONYMOUS_ADVISOR_LIMIT,
      shouldAppendGuidance: false,
    });
  });

  it("appends registration guidance once", () => {
    const content = "先判断问题。";
    expect(appendAnonymousGuidance(content)).toBe(`${content}\n\n${ANONYMOUS_REGISTER_GUIDANCE}`);
    expect(appendAnonymousGuidance(`${content}\n\n${ANONYMOUS_REGISTER_GUIDANCE}`)).toBe(
      `${content}\n\n${ANONYMOUS_REGISTER_GUIDANCE}`,
    );
  });
});
