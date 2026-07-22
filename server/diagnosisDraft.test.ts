import { beforeEach, describe, expect, it, vi } from "vitest";

const selectedRows: unknown[][] = [];
const insertedRows: unknown[] = [];
const upsertUpdates: unknown[] = [];
const deletedDrafts: unknown[] = [];

const dbMock = {
  select: () => ({
    from: () => ({
      where: () => ({
        limit: async () => selectedRows.shift() ?? [],
      }),
    }),
  }),
  insert: () => ({
    values: (payload: unknown) => ({
      onDuplicateKeyUpdate: async (update: unknown) => {
        insertedRows.push(payload);
        upsertUpdates.push(update);
      },
    }),
  }),
  delete: () => ({
    where: async (condition: unknown) => {
      deletedDrafts.push(condition);
    },
  }),
};

vi.mock("./db", () => ({
  getDb: vi.fn(async () => dbMock),
}));

import {
  DIAGNOSIS_CONVERSATION_FLOW_KEY,
  deleteDiagnosisDraft,
  getDiagnosisDraft,
  saveDiagnosisDraft,
} from "./diagnosisDraft";

const payload = {
  stepIndex: 2,
  conversationUnitIndex: 5,
  answers: { "company.name": "示例公司" },
  customValues: { industry: "机器人" },
};

describe("diagnosis draft persistence", () => {
  beforeEach(() => {
    selectedRows.length = 0;
    insertedRows.length = 0;
    upsertUpdates.length = 0;
    deletedDrafts.length = 0;
  });

  it("loads only the requested user's conversation draft", async () => {
    selectedRows.push([{ payload, updatedAt: "2026-07-21 10:00:00" }]);

    await expect(getDiagnosisDraft(7)).resolves.toEqual({
      payload,
      updatedAt: "2026-07-21 10:00:00",
    });
  });

  it("upserts one conversation draft per user and flow", async () => {
    await saveDiagnosisDraft(7, payload);

    expect(insertedRows).toEqual([
      {
        userId: 7,
        flowKey: DIAGNOSIS_CONVERSATION_FLOW_KEY,
        payload,
      },
    ]);
    expect(upsertUpdates).toEqual([
      expect.objectContaining({
        set: expect.objectContaining({ payload }),
      }),
    ]);
  });

  it("deletes the conversation draft through the supplied transaction", async () => {
    const transaction = { delete: dbMock.delete };

    await deleteDiagnosisDraft(7, DIAGNOSIS_CONVERSATION_FLOW_KEY, transaction as never);

    expect(deletedDrafts).toHaveLength(1);
  });
});
