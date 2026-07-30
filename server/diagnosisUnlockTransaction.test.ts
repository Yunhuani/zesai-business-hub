import { beforeEach, describe, expect, it, vi } from "vitest";

type UserState = {
  id: number;
  creditsPurchased: number;
  creditsSubscription: number;
  creditsResetDate: Date;
};

type DiagnosisState = {
  id: number;
  userId: number;
  status: "done";
  productType: "preview" | "full";
  fullCreditsDeducted: number;
};

let user: UserState;
let diagnosis: DiagnosisState;
let transactions: unknown[];
let failDiagnosisUpdate: boolean;

function createDbMock() {
  const applyUserUpdate = (payload: Partial<UserState>) => {
    user = { ...user, ...payload };
  };

  const applyDiagnosisUpdate = (payload: Partial<DiagnosisState>) => {
    if (failDiagnosisUpdate) {
      throw new Error("diagnosis update failed");
    }
    diagnosis = { ...diagnosis, ...payload };
  };

  return {
    query: {
      diagnoses: {
        findFirst: vi.fn(async () => diagnosis),
      },
    },
    select: () => ({
      from: (table: { [key: symbol]: string }) => ({
        where: () => ({
          limit: async () => {
            const tableName = table[Symbol.for("drizzle:Name")];
            if (tableName === "users") return [user];
            if (tableName === "creditsTransactions") return [];
            return [];
          },
        }),
      }),
    }),
    update: (table: { [key: symbol]: string }) => ({
      set: (payload: Partial<UserState> | Partial<DiagnosisState>) => ({
        where: async () => {
          const tableName = table[Symbol.for("drizzle:Name")];
          if (tableName === "users") applyUserUpdate(payload as Partial<UserState>);
          if (tableName === "diagnoses") applyDiagnosisUpdate(payload as Partial<DiagnosisState>);
        },
      }),
    }),
    insert: () => ({
      values: async (payload: unknown) => {
        transactions.push(payload);
      },
    }),
    transaction: async <T>(callback: (tx: unknown) => Promise<T>) => {
      const userSnapshot = { ...user };
      const diagnosisSnapshot = { ...diagnosis };
      const transactionSnapshot = [...transactions];
      try {
        return await callback(createDbMock());
      } catch (error) {
        user = userSnapshot;
        diagnosis = diagnosisSnapshot;
        transactions = transactionSnapshot;
        throw error;
      }
    },
  };
}

vi.mock("./db", () => ({
  getDb: vi.fn(async () => createDbMock()),
  getUserSubscription: vi.fn(async () => ({ plan: "free" })),
}));

vi.mock("./pricingConfig", async importOriginal => {
  const actual = await importOriginal<typeof import("./pricingConfig")>();
  return {
    ...actual,
    getActionCredits: vi.fn(async () => 1000),
  };
});

describe("unlockDiagnosis transaction", () => {
  beforeEach(() => {
    user = {
      id: 7,
      creditsPurchased: 2000,
      creditsSubscription: 0,
      creditsResetDate: new Date(Date.now() + 60 * 60 * 1000),
    };
    diagnosis = {
      id: 42,
      userId: 7,
      status: "done",
      productType: "preview",
      fullCreditsDeducted: 0,
    };
    transactions = [];
    failDiagnosisUpdate = false;
  });

  it("rolls back the full-report charge when the unlock state update fails", async () => {
    failDiagnosisUpdate = true;
    const { unlockDiagnosis } = await import("./diagnosisService");

    await expect(unlockDiagnosis(42, 7)).rejects.toThrow("diagnosis update failed");

    expect(user.creditsPurchased).toBe(2000);
    expect(diagnosis.productType).toBe("preview");
    expect(diagnosis.fullCreditsDeducted).toBe(0);
    expect(transactions).toEqual([]);
  });
});
