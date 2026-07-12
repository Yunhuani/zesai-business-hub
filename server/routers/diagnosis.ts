import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import {
  createDiagnosis,
  getDiagnosis,
  listUserDiagnoses,
  unlockDiagnosis,
} from "../diagnosisService";
import { convertQuestionnaireAnswers } from "../diagnosisIntake";
import { TRPCError } from "@trpc/server";
import { buildDiagnosisPreviewResult } from "../diagnosisProduct";
import { getUserCredits } from "../creditsManager";
import { getActionCredits } from "../pricingConfig";

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
  input: z.infer<typeof submitSchema>
) {
  const intake = convertQuestionnaireAnswers(
    input.answers,
    input.customValues
  );
  const diagnosisId = await createDiagnosis(userId, intake);
  return { diagnosisId, productType: "preview" as const };
}

export const diagnosisRouter = router({
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
      submitDiagnosis(ctx.user.id, input)
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
  submit: protectedProcedure
    .input(submitSchema)
    .mutation(({ ctx, input }) =>
      submitDiagnosis(ctx.user.id, input)
    ),
});
