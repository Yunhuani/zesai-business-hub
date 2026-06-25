import { beforeEach, describe, expect, it, vi } from "vitest";

const staleRows = [
  { id: 11, status: "pending" },
  { id: 12, status: "running" },
];
const updates: Array<{ status: string; errorMessage: string }> = [];

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
      }),
    select: () => ({
      from: () => ({
        where: async () => staleRows,
      }),
    }),
    update: () => ({
      set: (payload: { status: string; errorMessage: string }) => ({
        where: async () => {
          updates.push(payload);
        },
      }),
    }),
  })),
}));

describe("diagnosis recovery", () => {
  beforeEach(() => {
    updates.length = 0;
  });

  it("marks stale pending and running diagnoses as error on startup recovery", async () => {
    const { recoverInterruptedDiagnoses } = await import("./diagnosisService");

    const recovered = await recoverInterruptedDiagnoses();

    expect(recovered).toBe(2);
    expect(updates).toEqual([
      {
        status: "error",
        errorMessage: "Diagnosis interrupted or timed out",
      },
      {
        status: "error",
        errorMessage: "Diagnosis interrupted or timed out",
      },
    ]);
  });
});
