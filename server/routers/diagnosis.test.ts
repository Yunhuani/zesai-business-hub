import { describe, expect, it, vi } from "vitest";

vi.mock("../diagnosisService", () => ({
  createDiagnosis: vi.fn(),
  getDiagnosis: vi.fn(),
  listUserDiagnoses: vi.fn(),
  retryDiagnosis: vi.fn(),
  unlockDiagnosis: vi.fn(),
}));

import { getDiagnosis, retryDiagnosis } from "../diagnosisService";
import { diagnosisRouter } from "./diagnosis";

const mockedGetDiagnosis = vi.mocked(getDiagnosis);
const mockedRetryDiagnosis = vi.mocked(retryDiagnosis);

function createCaller() {
  return diagnosisRouter.createCaller({
    user: { id: 7 },
    req: {},
    res: {},
  } as any);
}

function diagnosisRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 42,
    userId: 7,
    status: "done",
    productType: "preview",
    fullCreditsDeducted: 0,
    pdfPurchased: 0,
    intake: {},
    result: {},
    headline: "增长报告",
    overallScore: 6.2,
    scoreLabel: "稳健",
    createdAt: "2026-07-09 10:00:00",
    errorMessage: null,
    ...overrides,
  };
}

describe("diagnosis router serialization", () => {
  it("returns errorMessage only for failed diagnoses", async () => {
    mockedGetDiagnosis.mockResolvedValueOnce(
      diagnosisRow({
        status: "error",
        errorMessage: "engine redline failed: finance.product_lines missing",
      }) as any
    );

    await expect(createCaller().get({ id: 42 })).resolves.toMatchObject({
      id: 42,
      status: "error",
      errorMessage: "engine redline failed: finance.product_lines missing",
    });

    mockedGetDiagnosis.mockResolvedValueOnce(
      diagnosisRow({
        status: "done",
        errorMessage: "stale internal error",
      }) as any
    );

    const successResult = await createCaller().get({ id: 42 });

    expect(successResult.status).toBe("done");
    expect(successResult).not.toHaveProperty("errorMessage");
  });

  it("retries a failed diagnosis through the protected retry mutation", async () => {
    mockedRetryDiagnosis.mockResolvedValueOnce({
      diagnosisId: 42,
      status: "pending",
    });

    await expect(createCaller().retry({ diagnosisId: 42 })).resolves.toEqual({
      diagnosisId: 42,
      status: "pending",
    });

    expect(mockedRetryDiagnosis).toHaveBeenCalledWith(42, 7);
  });

  it("returns a retry limit error when the diagnosis has been retried too often", async () => {
    mockedRetryDiagnosis.mockRejectedValueOnce(
      new Error("Diagnosis retry limit reached")
    );

    await expect(createCaller().retry({ diagnosisId: 42 })).rejects.toMatchObject({
      code: "TOO_MANY_REQUESTS",
      message: "Diagnosis retry limit reached",
    });
  });
});
