import { beforeEach, describe, expect, it, vi } from "vitest";

const insertedDiagnoses: unknown[] = [];
const transactionExecutors: unknown[] = [];
const deleteDiagnosisDraft = vi.fn(async () => undefined);

const transactionExecutor = {
  insert: () => ({
    values: async (payload: unknown) => {
      insertedDiagnoses.push(payload);
      return [{ insertId: 321 }];
    },
  }),
  delete: vi.fn(),
};

const dbMock = {
  transaction: async <T>(callback: (tx: typeof transactionExecutor) => Promise<T>) => {
    transactionExecutors.push(transactionExecutor);
    return callback(transactionExecutor);
  },
  update: () => ({
    set: () => ({ where: async () => undefined }),
  }),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => dbMock),
}));

vi.mock("./diagnosisDraft", async importOriginal => {
  const actual = await importOriginal<typeof import("./diagnosisDraft")>();
  return { ...actual, deleteDiagnosisDraft };
});

vi.mock("./nbgClient", () => ({
  runNbgDiagnosis: vi.fn(async () => ({
    synthesis_output: {},
    score_summary: {},
  })),
}));

vi.mock("./creditsManager", async importOriginal => {
  const actual = await importOriginal<typeof import("./creditsManager")>();
  return {
    ...actual,
    refundDiagnosisFullIfCharged: vi.fn(async () => ({ refunded: false, amount: 0 })),
  };
});

describe("conversation diagnosis submission", () => {
  beforeEach(() => {
    insertedDiagnoses.length = 0;
    transactionExecutors.length = 0;
    deleteDiagnosisDraft.mockClear();
  });

  it("creates the diagnosis and deletes its draft inside the same transaction", async () => {
    const { createDiagnosis } = await import("./diagnosisService");
    const { DIAGNOSIS_CONVERSATION_FLOW_KEY } = await import("./diagnosisDraft");

    await expect(
      createDiagnosis(7, { company: { name: "示例公司" } }, "full", {
        clearDraftFlowKey: DIAGNOSIS_CONVERSATION_FLOW_KEY,
      })
    ).resolves.toBe(321);

    expect(transactionExecutors).toHaveLength(1);
    expect(insertedDiagnoses).toEqual([
      expect.objectContaining({ userId: 7, productType: "full", status: "pending" }),
    ]);
    expect(deleteDiagnosisDraft).toHaveBeenCalledWith(
      7,
      DIAGNOSIS_CONVERSATION_FLOW_KEY,
      transactionExecutor
    );
  });
});
