import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../businessPlanService", () => ({
  createBusinessPlan: vi.fn(),
  getBusinessPlan: vi.fn(),
  getBusinessPlanDraft: vi.fn(),
  listUserBusinessPlans: vi.fn(),
  retryBusinessPlan: vi.fn(),
  saveBusinessPlanDraft: vi.fn(),
}));

vi.mock("../creditsManager", () => ({ getUserCredits: vi.fn() }));
vi.mock("../pricingConfig", () => ({ getActionCredits: vi.fn() }));

import {
  createBusinessPlan,
  getBusinessPlan,
  getBusinessPlanDraft,
  retryBusinessPlan,
  saveBusinessPlanDraft,
} from "../businessPlanService";
import { getUserCredits } from "../creditsManager";
import { getActionCredits } from "../pricingConfig";
import { businessPlanRouter } from "./businessPlan";

function createCaller() {
  return businessPlanRouter.createCaller({ user: { id: 7, role: "user" }, req: {}, res: {} } as any);
}

function createAdminCaller() {
  return businessPlanRouter.createCaller({ user: { id: 9, role: "admin" }, req: {}, res: {} } as any);
}

describe("business plan router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActionCredits).mockResolvedValue(1_500);
    vi.mocked(getUserCredits).mockResolvedValue({
      purchased: 1_000,
      subscription: 1_000,
      total: 2_000,
      free: 0,
      resetDate: new Date("2026-09-01T00:00:00Z"),
      nextResetIn: 1,
    });
  });

  it("stores drafts under the authenticated user", async () => {
    const payload = { stepIndex: 2, answers: { company: "Acme" } };
    vi.mocked(getBusinessPlanDraft).mockResolvedValue({ payload, updatedAt: "2026-08-05" } as never);

    await expect(createCaller().draft.get()).resolves.toEqual({ payload, updatedAt: "2026-08-05" });
    await expect(createCaller().draft.save({ payload })).resolves.toEqual({ success: true });
    expect(getBusinessPlanDraft).toHaveBeenCalledWith(7);
    expect(saveBusinessPlanDraft).toHaveBeenCalledWith(7, payload);
  });

  it("prechecks the configured business plan price before creating a record", async () => {
    vi.mocked(getUserCredits).mockResolvedValueOnce({
      purchased: 400,
      subscription: 500,
      total: 900,
      free: 0,
      resetDate: new Date("2026-09-01T00:00:00Z"),
      nextResetIn: 1,
    });

    await expect(createCaller().submit({ bpIntake: { company: { name: "Acme" } } }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getActionCredits).toHaveBeenCalledWith("business_plan");
    expect(createBusinessPlan).not.toHaveBeenCalled();
  });

  it("submits and retries only for the authenticated user", async () => {
    vi.mocked(createBusinessPlan).mockResolvedValue(51);
    vi.mocked(retryBusinessPlan).mockResolvedValue({ businessPlanId: 51, status: "pending" });

    await expect(createCaller().submit({ bpIntake: { company: { name: "Acme" } } }))
      .resolves.toEqual({ businessPlanId: 51 });
    await expect(createCaller().retry({ businessPlanId: 51 }))
      .resolves.toEqual({ businessPlanId: 51, status: "pending" });
    expect(createBusinessPlan).toHaveBeenCalledWith(7, { company: { name: "Acme" } });
    expect(retryBusinessPlan).toHaveBeenCalledWith(51, 7);
  });

  it("does not expose another user's business plan", async () => {
    vi.mocked(getBusinessPlan).mockResolvedValue({ id: 51, userId: 8 } as never);

    await expect(createCaller().get({ id: 51 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("allows only an administrator to submit the sample with explicit billing control", async () => {
    vi.mocked(createBusinessPlan).mockResolvedValue(88);

    await expect(createCaller().submitSample({ skipBilling: true }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(createBusinessPlan).not.toHaveBeenCalled();

    await expect(createAdminCaller().submitSample({ skipBilling: true }))
      .resolves.toEqual({ businessPlanId: 88, skipBilling: true });
    expect(createBusinessPlan).toHaveBeenCalledWith(
      9,
      expect.objectContaining({
        project_overview: expect.objectContaining({
          company_name: "深圳智造云科技有限公司",
        }),
      }),
      { skipBilling: true }
    );
  });

  it("charges sample submissions by default", async () => {
    vi.mocked(createBusinessPlan).mockResolvedValue(89);

    await expect(createAdminCaller().submitSample({}))
      .resolves.toEqual({ businessPlanId: 89, skipBilling: false });
    expect(createBusinessPlan).toHaveBeenCalledWith(
      9,
      expect.any(Object),
      { skipBilling: false }
    );
  });
});
