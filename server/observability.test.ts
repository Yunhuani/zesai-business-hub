import { afterEach, describe, expect, it, vi } from "vitest";
import { buildStructuredErrorLog, notifyOps } from "./observability";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

  it("does not send an ops alert when webhook is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      notifyOps({ category: "payment", message: "callback failed" }, "")
    ).resolves.toEqual({ sent: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends an ops alert to the configured webhook", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      notifyOps(
        { category: "payment", message: "callback failed", orderId: "o1" },
        "https://ops.example/webhook"
      )
    ).resolves.toEqual({ sent: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://ops.example/webhook",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/json" },
      })
    );
  });
});
