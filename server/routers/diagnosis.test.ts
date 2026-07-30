import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../diagnosisService", () => ({
  createDiagnosis: vi.fn(),
  getDiagnosis: vi.fn(),
  listUserDiagnoses: vi.fn(),
  retryDiagnosis: vi.fn(),
  unlockDiagnosis: vi.fn(),
}));

vi.mock("../diagnosisDraft", () => ({
  DIAGNOSIS_CONVERSATION_FLOW_KEY: "diagnosis_conversation_v1",
  getDiagnosisDraft: vi.fn(),
  saveDiagnosisDraft: vi.fn(),
}));

vi.mock("../db", () => ({
  getUserSubscription: vi.fn(),
}));

import { createDiagnosis, getDiagnosis, retryDiagnosis } from "../diagnosisService";
import { getDiagnosisDraft, saveDiagnosisDraft } from "../diagnosisDraft";
import { getUserSubscription } from "../db";
import { diagnosisRouter } from "./diagnosis";

const mockedGetDiagnosis = vi.mocked(getDiagnosis);
const mockedRetryDiagnosis = vi.mocked(retryDiagnosis);
const mockedCreateDiagnosis = vi.mocked(createDiagnosis);
const mockedGetDiagnosisDraft = vi.mocked(getDiagnosisDraft);
const mockedSaveDiagnosisDraft = vi.mocked(saveDiagnosisDraft);
const mockedGetUserSubscription = vi.mocked(getUserSubscription);

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
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetUserSubscription.mockResolvedValue({ plan: "basic" } as never);
  });

  it("gets and saves drafts for the authenticated user only", async () => {
    const draft = {
      stepIndex: 2,
      conversationUnitIndex: 5,
      answers: { "company.name": "示例公司" },
      customValues: {},
    };
    mockedGetDiagnosisDraft.mockResolvedValueOnce({
      payload: draft,
      updatedAt: "2026-07-21 10:00:00",
    } as never);

    await expect(createCaller().draft.get()).resolves.toEqual({
      payload: draft,
      updatedAt: "2026-07-21 10:00:00",
    });
    await expect(createCaller().draft.save(draft)).resolves.toEqual({ success: true });

    expect(mockedGetDiagnosisDraft).toHaveBeenCalledWith(7);
    expect(mockedSaveDiagnosisDraft).toHaveBeenCalledWith(7, draft);
  });

  it("rejects client-supplied user identity in a draft payload", async () => {
    await expect(createCaller().draft.save({
      stepIndex: 0,
      conversationUnitIndex: 0,
      answers: {},
      customValues: {},
      userId: 99,
    } as never)).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(mockedSaveDiagnosisDraft).not.toHaveBeenCalled();
  });

  it("uses the conversation submission path that clears the matching draft", async () => {
    mockedCreateDiagnosis.mockResolvedValueOnce(103);
    const input = {
      answers: { "company.name": "示例公司" },
      customValues: {},
    };

    await expect(createCaller().submitConversation(input)).resolves.toEqual({
      diagnosisId: 103,
      productType: "full",
    });
    expect(mockedCreateDiagnosis).toHaveBeenCalledWith(
      7,
      expect.any(Object),
      "full",
      { clearDraftFlowKey: "diagnosis_conversation_v1" }
    );
  });

  it("uses full product type for formal submissions and preview only for previews", async () => {
    mockedCreateDiagnosis.mockResolvedValueOnce(101).mockResolvedValueOnce(102);
    const input = {
      answers: { "company.name": "甬辉卫浴" },
      customValues: {},
    };

    await expect(createCaller().submit(input)).resolves.toEqual({
      diagnosisId: 101,
      productType: "full",
    });
    expect(mockedCreateDiagnosis).toHaveBeenNthCalledWith(
      1,
      7,
      expect.any(Object),
      "full"
    );

    await expect(createCaller().submitPreview(input)).resolves.toEqual({
      diagnosisId: 102,
      productType: "preview",
    });
    expect(mockedCreateDiagnosis).toHaveBeenNthCalledWith(
      2,
      7,
      expect.any(Object),
      "preview"
    );
  });

  it.each([
    ["no subscription", undefined],
    ["free plan", { plan: "free" }],
  ])("rejects diagnosis submission for %s", async (_case, subscription) => {
    mockedGetUserSubscription.mockResolvedValue(subscription as never);
    const input = {
      answers: { "company.name": "示例公司" },
      customValues: {},
    };

    await expect(createCaller().submit(input)).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "NBG诊断仅套餐会员可用，请先开通套餐",
    });
    expect(mockedCreateDiagnosis).not.toHaveBeenCalled();
  });

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
