import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_ADVISOR_LIMIT,
  getNextAnonymousTurnState,
} from "./anonymousAdvisor";

describe("anonymous advisor turn limit", () => {
  it("allows the first turn without registration guidance", () => {
    expect(getNextAnonymousTurnState(0)).toEqual({
      allowed: true,
      nextTurns: 1,
      shouldAppendGuidance: false,
    });
  });

  it("blocks turns after the anonymous limit", () => {
    expect(getNextAnonymousTurnState(ANONYMOUS_ADVISOR_LIMIT)).toEqual({
      allowed: false,
      nextTurns: ANONYMOUS_ADVISOR_LIMIT,
      shouldAppendGuidance: false,
    });
  });
});
