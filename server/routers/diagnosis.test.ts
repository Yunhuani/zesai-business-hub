import { describe, expect, it, vi } from "vitest";

vi.mock("../diagnosisService", () => ({
  createDiagnosis: vi.fn(),
  getDiagnosis: vi.fn(),
  listUserDiagnoses: vi.fn(),
  unlockDiagnosis: vi.fn(),
}));

import { getDiagnosis } from "../diagnosisService";
import { diagnosisRouter } from "./diagnosis";

const mockedGetDiagnosis = vi.mocked(getDiagnosis);

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
});
