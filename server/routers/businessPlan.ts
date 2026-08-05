import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";
import { BUSINESS_PLAN_SAMPLE } from "../businessPlanSample";
import {
  createBusinessPlan,
  getBusinessPlan,
  getBusinessPlanDraft,
  listUserBusinessPlans,
  retryBusinessPlan,
  saveBusinessPlanDraft,
} from "../businessPlanService";
import { getUserCredits } from "../creditsManager";
import { getActionCredits } from "../pricingConfig";

const jsonObjectSchema = z.record(z.string(), z.unknown());

function serializeBusinessPlan(
  businessPlan: Awaited<ReturnType<typeof getBusinessPlan>>
) {
  if (!businessPlan) return null;
  return {
    id: businessPlan.id,
    engineJobId: businessPlan.engineJobId,
    intake: businessPlan.intake,
    status: businessPlan.status,
    result: businessPlan.result,
    creditsDeducted: businessPlan.creditsDeducted,
    retryCount: businessPlan.retryCount,
    createdAt: businessPlan.createdAt,
    updatedAt: businessPlan.updatedAt,
    ...(businessPlan.status === "error"
      ? { errorMessage: businessPlan.errorMessage }
      : {}),
  };
}

export const businessPlanRouter = router({
  draft: router({
    get: protectedProcedure.query(({ ctx }) => getBusinessPlanDraft(ctx.user.id)),
    save: protectedProcedure
      .input(z.object({ payload: jsonObjectSchema }).strict())
      .mutation(async ({ ctx, input }) => {
        await saveBusinessPlanDraft(ctx.user.id, input.payload);
        return { success: true as const };
      }),
  }),
  list: protectedProcedure.query(({ ctx }) => listUserBusinessPlans(ctx.user.id)),
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const businessPlan = await getBusinessPlan(input.id);
      if (!businessPlan || businessPlan.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }
      return serializeBusinessPlan(businessPlan);
    }),
  submit: protectedProcedure
    .input(z.object({ bpIntake: jsonObjectSchema }).strict())
    .mutation(async ({ ctx, input }) => {
      const required = await getActionCredits("business_plan");
      const credits = await getUserCredits(ctx.user.id);
      if (credits.total < required) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: JSON.stringify({
            error: "INSUFFICIENT_CREDITS",
            required,
            current: credits.total,
            missing: required - credits.total,
          }),
        });
      }
      return {
        businessPlanId: await createBusinessPlan(ctx.user.id, input.bpIntake),
      };
    }),
  submitSample: adminProcedure
    .input(z.object({ skipBilling: z.boolean().default(false) }).strict())
    .mutation(async ({ ctx, input }) => {
      // Development-only debugging capability: this route must remain administrator-only
      // and skipBilling must never be exposed through a normal-user procedure.
      const businessPlanId = await createBusinessPlan(
        ctx.user.id,
        BUSINESS_PLAN_SAMPLE,
        { skipBilling: input.skipBilling }
      );
      return { businessPlanId, skipBilling: input.skipBilling };
    }),
  retry: protectedProcedure
    .input(z.object({ businessPlanId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await retryBusinessPlan(input.businessPlanId, ctx.user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Business plan not found") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (message === "Business plan retry limit reached") {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
        }
        if (
          message === "Business plan is not retryable" ||
          message === "Business plan intake is invalid"
        ) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message });
        }
        throw error;
      }
    }),
});
