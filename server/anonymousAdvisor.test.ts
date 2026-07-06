import { describe, expect, it } from "vitest";

import {
  ANONYMOUS_ADVISOR_GLOBAL_DAILY_LIMIT,
  createAnonymousDailyLimiter,
  createAnonymousRateLimiter,
  normalizeAnonymousHistory,
} from "./anonymousAdvisor";

describe("anonymous advisor backend helpers", () => {
  it("limits repeated requests within the same window", () => {
    const limiter = createAnonymousRateLimiter({ maxRequests: 2, windowMs: 1000 });

    expect(limiter.check("ip-a", 1000).allowed).toBe(true);
    expect(limiter.check("ip-a", 1100).allowed).toBe(true);
    expect(limiter.check("ip-a", 1200)).toMatchObject({
      allowed: false,
      remaining: 0,
    });
    expect(limiter.check("ip-a", 2100).allowed).toBe(true);
  });

  it("keeps only valid recent anonymous history messages", () => {
    const history = normalizeAnonymousHistory([
      { role: "system", content: "ignore" },
      { role: "user", content: "  one  " },
      { role: "assistant", content: "two" },
      { role: "assistant", content: "" },
      { role: "user", content: "three" },
      { role: "user", content: "four" },
      { role: "assistant", content: "five" },
      { role: "user", content: "six" },
      { role: "assistant", content: "seven" },
    ]);

    expect(history).toEqual([
      { role: "assistant", content: "two" },
      { role: "user", content: "three" },
      { role: "user", content: "four" },
      { role: "assistant", content: "five" },
      { role: "user", content: "six" },
      { role: "assistant", content: "seven" },
    ]);
  });

  it("limits total anonymous requests for each UTC day", () => {
    const limiter = createAnonymousDailyLimiter({ maxRequests: 2 });

    expect(limiter.check(Date.UTC(2026, 6, 6, 0, 0, 0))).toMatchObject({
      allowed: true,
      remaining: 1,
    });
    expect(limiter.check(Date.UTC(2026, 6, 6, 12, 0, 0))).toMatchObject({
      allowed: true,
      remaining: 0,
    });
    expect(limiter.check(Date.UTC(2026, 6, 6, 23, 0, 0))).toMatchObject({
      allowed: false,
      remaining: 0,
    });
    expect(limiter.check(Date.UTC(2026, 6, 7, 0, 0, 0))).toMatchObject({
      allowed: true,
      remaining: 1,
    });
  });

  it("uses a bounded default global daily limit", () => {
    expect(ANONYMOUS_ADVISOR_GLOBAL_DAILY_LIMIT).toBeGreaterThan(0);
    expect(ANONYMOUS_ADVISOR_GLOBAL_DAILY_LIMIT).toBeLessThanOrEqual(1000);
  });
});
