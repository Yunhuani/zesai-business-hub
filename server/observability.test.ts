import { describe, expect, it } from "vitest";
import { buildStructuredErrorLog } from "./observability";

describe("structured error logs", () => {
  it("includes timestamp, category, ids, and error message", () => {
    const log = buildStructuredErrorLog(
      {
        category: "engine_invocation_failed",
        userId: 7,
        orderId: "order-1",
        diagnosisId: 9,
        error: new Error("engine timeout"),
      },
      new Date("2026-06-25T10:00:00.000Z")
    );

    expect(log).toEqual({
      timestamp: "2026-06-25T10:00:00.000Z",
      level: "error",
      category: "engine_invocation_failed",
      userId: 7,
      orderId: "order-1",
      diagnosisId: 9,
      errorMessage: "engine timeout",
    });
  });
});
