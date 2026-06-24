import { describe, expect, it } from "vitest";
import { validateDiagnosisUnlock } from "./diagnosisUnlock";

describe("diagnosis unlock", () => {
  it("unlocks only an existing completed diagnosis owned by the user", () => {
    expect(
      validateDiagnosisUnlock(
        { userId: 7, status: "done", fullCreditsDeducted: 0 },
        7
      )
    ).toEqual({ alreadyUnlocked: false });
  });

  it("treats an already unlocked diagnosis as idempotent", () => {
    expect(
      validateDiagnosisUnlock(
        { userId: 7, status: "done", fullCreditsDeducted: 1500 },
        7
      )
    ).toEqual({ alreadyUnlocked: true });
  });

  it("rejects another user's or unfinished diagnosis", () => {
    expect(() =>
      validateDiagnosisUnlock(
        { userId: 8, status: "done", fullCreditsDeducted: 0 },
        7
      )
    ).toThrow("Diagnosis not found");

    expect(() =>
      validateDiagnosisUnlock(
        { userId: 7, status: "running", fullCreditsDeducted: 0 },
        7
      )
    ).toThrow("Diagnosis is not ready");
  });
});
