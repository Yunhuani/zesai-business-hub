import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const recoverInterruptedDiagnoses = vi.fn();

vi.mock("./diagnosisService", () => ({
  recoverInterruptedDiagnoses,
}));

describe("diagnosis recovery scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    recoverInterruptedDiagnoses.mockReset();
  });

  afterEach(async () => {
    const { stopDiagnosisRecoveryScheduler } = await import("./diagnosisRecoveryScheduler");
    stopDiagnosisRecoveryScheduler();
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs recovery every five minutes", async () => {
    recoverInterruptedDiagnoses.mockResolvedValue(0);
    const { startDiagnosisRecoveryScheduler } = await import("./diagnosisRecoveryScheduler");

    startDiagnosisRecoveryScheduler();
    expect(recoverInterruptedDiagnoses).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(recoverInterruptedDiagnoses).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(recoverInterruptedDiagnoses).toHaveBeenCalledTimes(2);
  });

  it("does not overlap recovery runs", async () => {
    let resolveRecovery!: () => void;
    recoverInterruptedDiagnoses.mockReturnValue(
      new Promise<void>(resolve => {
        resolveRecovery = resolve;
      })
    );
    const { startDiagnosisRecoveryScheduler } = await import("./diagnosisRecoveryScheduler");

    startDiagnosisRecoveryScheduler();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(recoverInterruptedDiagnoses).toHaveBeenCalledTimes(1);

    resolveRecovery();
    await Promise.resolve();
    recoverInterruptedDiagnoses.mockResolvedValue(0);

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    expect(recoverInterruptedDiagnoses).toHaveBeenCalledTimes(2);
  });

  it("logs and continues after recovery errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    recoverInterruptedDiagnoses
      .mockRejectedValueOnce(new Error("database unavailable"))
      .mockResolvedValue(0);
    const { startDiagnosisRecoveryScheduler } = await import("./diagnosisRecoveryScheduler");

    startDiagnosisRecoveryScheduler();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000);

    expect(consoleError).toHaveBeenCalledWith(
      "[DiagnosisRecoveryScheduler] Recovery tick failed:",
      expect.any(Error)
    );
    expect(recoverInterruptedDiagnoses).toHaveBeenCalledTimes(2);
  });
});
