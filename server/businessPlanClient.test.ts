import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: { nbgEngineUrl: "https://engine.example/api/" },
}));

describe("business plan engine client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("submits bp_intake and returns the completed job result", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ job_id: "bp-job-7" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "running" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        status: "done",
        result: { bp_title: "Acme BP", pending_items: [] },
      }), { status: 200 }));

    const { runBusinessPlanGeneration } = await import("./businessPlanClient");
    const pending = runBusinessPlanGeneration({ company: { name: "Acme" } });
    await vi.advanceTimersByTimeAsync(3_000);

    await expect(pending).resolves.toEqual({
      jobId: "bp-job-7",
      result: { bp_title: "Acme BP", pending_items: [] },
    });
    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "https://engine.example/api/business-plans",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ bp_intake: { company: { name: "Acme" } } }),
      })
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "https://engine.example/api/business-plans/bp-job-7",
      expect.any(Object)
    );
  });

  it("rejects an engine error with its detail", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ job_id: "bp-job-8" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ status: "error", error: "invalid intake" }), { status: 200 }));

    const { runBusinessPlanGeneration } = await import("./businessPlanClient");

    await expect(runBusinessPlanGeneration({})).rejects.toThrow(
      "Business plan bp-job-8 failed: invalid intake"
    );
  });
});
