import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  createDiagnosis,
  getDiagnosis,
  listUserDiagnoses,
  retryDiagnosis,
  unlockDiagnosis,
} from "../diagnosisService";
import { convertQuestionnaireAnswers } from "../diagnosisIntake";
import { TRPCError } from "@trpc/server";
import {
  buildDiagnosisPreviewResult,
  type DiagnosisProduct,
} from "../diagnosisProduct";
import { getUserCredits } from "../creditsManager";
import { getActionCredits } from "../pricingConfig";
import { conversationDiagnosisDraftSchema } from "../../shared/diagnosisDraft";
import {
  DIAGNOSIS_CONVERSATION_FLOW_KEY,
  getDiagnosisDraft,
  saveDiagnosisDraft,
} from "../diagnosisDraft";

const financeRowAnswerSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()])
);
const answerSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.array(financeRowAnswerSchema),
]);
const submitSchema = z.object({
  answers: z.record(z.string(), answerSchema),
  customValues: z.record(z.string(), z.string()),
});

function serializeDiagnosis(diagnosis: Awaited<ReturnType<typeof getDiagnosis>>) {
  if (!diagnosis) return null;
  const fullAccess =
    diagnosis.productType === "full" && diagnosis.fullCreditsDeducted > 0;
  const failedStatus =
    diagnosis.status === "error" || String(diagnosis.status) === "failed";

  return {
    id: diagnosis.id,
    status: diagnosis.status,
    productType: diagnosis.productType,
    fullAccess,
    pdfPurchased: diagnosis.pdfPurchased === 1,
    intake: diagnosis.intake,
    result: fullAccess
      ? diagnosis.result
      : buildDiagnosisPreviewResult(diagnosis.result),
    headline: fullAccess ? diagnosis.headline : null,
    overallScore: diagnosis.overallScore,
    scoreLabel: diagnosis.scoreLabel,
    createdAt: diagnosis.createdAt,
    ...(failedStatus ? { errorMessage: diagnosis.errorMessage } : {}),
  };
}

async function submitDiagnosis(
  userId: number,
  input: z.infer<typeof submitSchema>,
  productType: Exclude<DiagnosisProduct, "pdf">,
  options?: { clearDraftFlowKey?: string }
) {
  const required = await getActionCredits("diagnosis_full");
  const credits = await getUserCredits(userId);
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

  const intake = convertQuestionnaireAnswers(
    input.answers,
    input.customValues
  );
  const diagnosisId = options
    ? await createDiagnosis(userId, intake, productType, options)
    : await createDiagnosis(userId, intake, productType);
  return { diagnosisId, productType };
}

export const diagnosisRouter = router({
  draft: router({
    get: protectedProcedure.query(({ ctx }) => getDiagnosisDraft(ctx.user.id)),
    save: protectedProcedure
      .input(conversationDiagnosisDraftSchema)
      .mutation(async ({ ctx, input }) => {
        await saveDiagnosisDraft(ctx.user.id, input);
        return { success: true as const };
      }),
  }),
  list: protectedProcedure.query(({ ctx }) =>
    listUserDiagnoses(ctx.user.id)
  ),
  preview: publicProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      if (ENV.isProduction) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const diagnosis = await getDiagnosis(input.id);
      if (!diagnosis) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return serializeDiagnosis(diagnosis);
    }),
  get: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const diagnosis = await getDiagnosis(input.id);
      if (!diagnosis || diagnosis.userId !== ctx.user.id) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return serializeDiagnosis(diagnosis);
    }),
  submitPreview: protectedProcedure
    .input(submitSchema)
    .mutation(({ ctx, input }) =>
      submitDiagnosis(ctx.user.id, input, "preview")
    ),
  submitFull: protectedProcedure
    .input(z.object({ diagnosisId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return serializeDiagnosis(
          await unlockDiagnosis(input.diagnosisId, ctx.user.id)
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Diagnosis not found") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (message === "Diagnosis is not ready") {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message });
        }
        if (message === "INSUFFICIENT_CREDITS") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: JSON.stringify({
              error: "INSUFFICIENT_CREDITS",
              credits: await getUserCredits(ctx.user.id),
              required: await getActionCredits("diagnosis_full"),
            }),
          });
        }
        throw error;
      }
    }),
  retry: protectedProcedure
    .input(z.object({ diagnosisId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      try {
        return await retryDiagnosis(input.diagnosisId, ctx.user.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message === "Diagnosis not found") {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (message === "Diagnosis retry limit reached") {
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message });
        }
        if (
          message === "Diagnosis is not retryable" ||
          message === "Diagnosis intake is invalid"
        ) {
          throw new TRPCError({ code: "PRECONDITION_FAILED", message });
        }
        throw error;
      }
    }),
  submit: protectedProcedure
    .input(submitSchema)
    .mutation(({ ctx, input }) =>
      submitDiagnosis(ctx.user.id, input, "full")
    ),
  submitConversation: protectedProcedure
    .input(submitSchema)
    .mutation(({ ctx, input }) =>
      submitDiagnosis(ctx.user.id, input, "full", {
        clearDraftFlowKey: DIAGNOSIS_CONVERSATION_FLOW_KEY,
      })
    ),
});
