import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recoverInterruptedBusinessPlans = vi.fn();

vi.mock("./businessPlanService", () => ({
  recoverInterruptedBusinessPlans,
}));

describe("business plan recovery scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    recoverInterruptedBusinessPlans.mockReset();
  });

  afterEach(async () => {
    const { stopBusinessPlanRecoveryScheduler } = await import("./businessPlanRecoveryScheduler");
    stopBusinessPlanRecoveryScheduler();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs recovery every two minutes", async () => {
    recoverInterruptedBusinessPlans.mockResolvedValue(0);
    const { startBusinessPlanRecoveryScheduler } = await import("./businessPlanRecoveryScheduler");

    startBusinessPlanRecoveryScheduler();
    expect(recoverInterruptedBusinessPlans).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(recoverInterruptedBusinessPlans).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(recoverInterruptedBusinessPlans).toHaveBeenCalledTimes(2);
  });

  it("does not overlap recovery runs", async () => {
    let resolveRecovery!: () => void;
    recoverInterruptedBusinessPlans.mockReturnValue(
      new Promise<void>(resolve => {
        resolveRecovery = resolve;
      })
    );
    const { startBusinessPlanRecoveryScheduler } = await import("./businessPlanRecoveryScheduler");

    startBusinessPlanRecoveryScheduler();
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

    expect(recoverInterruptedBusinessPlans).toHaveBeenCalledTimes(1);

    resolveRecovery();
    await Promise.resolve();
    recoverInterruptedBusinessPlans.mockResolvedValue(0);

    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    expect(recoverInterruptedBusinessPlans).toHaveBeenCalledTimes(2);
  });

  it("logs and continues after recovery errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    recoverInterruptedBusinessPlans
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue(0);
    const { startBusinessPlanRecoveryScheduler } = await import("./businessPlanRecoveryScheduler");

    startBusinessPlanRecoveryScheduler();
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(2 * 60 * 1000);

    expect(consoleError).toHaveBeenCalledWith(
      "[BusinessPlanRecoveryScheduler] Recovery tick failed:",
      expect.any(Error)
    );
    expect(recoverInterruptedBusinessPlans).toHaveBeenCalledTimes(2);
  });
});
