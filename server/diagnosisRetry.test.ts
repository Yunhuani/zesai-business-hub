import { beforeEach, describe, expect, it, vi } from "vitest";

const diagnosisRows: unknown[] = [];
const transactionUpdates: unknown[] = [];
const nonTransactionUpdates: unknown[] = [];

vi.mock("./db", () => ({
  getDb: vi.fn(async () => ({
    query: {
      diagnoses: {
        findFirst: vi.fn(async () => diagnosisRows.shift() ?? null),
      },
    },
    transaction: async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        update: () => ({
          set: (payload: unknown) => ({
            where: async () => {
              transactionUpdates.push(payload);
            },
          }),
        }),
      }),
    update: () => ({
      set: (payload: unknown) => ({
        where: async () => {
          nonTransactionUpdates.push(payload);
        },
      }),
    }),
  })),
}));

vi.mock("./nbgClient", () => ({
  runNbgDiagnosis: vi.fn(async () => ({
    synthesis_output: { headline: "重跑成功" },
    score_summary: { overall_score: 7.1, score_label: "改善" },
  })),
}));

vi.mock("./creditsManager", async importOriginal => {
  const actual = await importOriginal<typeof import("./creditsManager")>();
  return {
    ...actual,
    deductCreditsOnce: vi.fn(),
    refundDiagnosisFullIfCharged: vi.fn(async () => ({ refunded: false, amount: 0 })),
  };
});

describe("diagnosis retry", () => {
  beforeEach(() => {
    diagnosisRows.length = 0;
    transactionUpdates.length = 0;
    nonTransactionUpdates.length = 0;
    vi.clearAllMocks();
  });

  it("resets an owned failed diagnosis and reruns the stored intake without charging credits", async () => {
    diagnosisRows.push({
      id: 42,
      userId: 7,
      status: "error",
      retryCount: 1,
      intake: { company: { name: "海拓精密" } },
    });
    const { retryDiagnosis } = await import("./diagnosisService");
    const { runNbgDiagnosis } = await import("./nbgClient");
    const { deductCreditsOnce, refundDiagnosisFullIfCharged } = await import("./creditsManager");

    await expect(retryDiagnosis(42, 7)).resolves.toEqual({
      diagnosisId: 42,
      status: "pending",
    });

    expect(transactionUpdates[0]).toEqual({
      status: "pending",
      errorMessage: null,
      result: null,
      headline: null,
      overallScore: null,
      scoreLabel: null,
      productType: "preview",
      fullCreditsDeducted: 0,
      pdfPurchased: 0,
      pdfCreditsDeducted: 0,
      retryCount: 2,
    });
    await vi.waitFor(() => {
      expect(runNbgDiagnosis).toHaveBeenCalledWith({ company: { name: "海拓精密" } });
    });
    expect(deductCreditsOnce).not.toHaveBeenCalled();
    expect(refundDiagnosisFullIfCharged).not.toHaveBeenCalled();
  });

  it("rejects retry after three attempts", async () => {
    diagnosisRows.push({
      id: 42,
      userId: 7,
      status: "error",
      retryCount: 3,
      intake: {},
    });
    const { retryDiagnosis } = await import("./diagnosisService");

    await expect(retryDiagnosis(42, 7)).rejects.toThrow("Diagnosis retry limit reached");
    expect(transactionUpdates).toEqual([]);
  });

  it("rejects retry for another user's diagnosis", async () => {
    diagnosisRows.push({
      id: 42,
      userId: 8,
      status: "error",
      retryCount: 0,
      intake: {},
    });
    const { retryDiagnosis } = await import("./diagnosisService");

    await expect(retryDiagnosis(42, 7)).rejects.toThrow("Diagnosis not found");
    expect(transactionUpdates).toEqual([]);
  });
});
