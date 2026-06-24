import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { createDiagnosis } from "../diagnosisService";
import { getDiagnosis } from "../diagnosisService";
import { convertQuestionnaireAnswers } from "../diagnosisIntake";
import { TRPCError } from "@trpc/server";
import { buildDiagnosisPreviewResult } from "../diagnosisProduct";
import {
  checkAndResetCredits,
  checkCredits,
  getUserCredits,
} from "../creditsManager";
import { getActionCredits } from "../pricingConfig";

const answerSchema = z.union([z.string(), z.array(z.string())]);
const submitSchema = z.object({
  answers: z.record(z.string(), answerSchema),
  customValues: z.record(z.string(), z.string()),
});

function serializeDiagnosis(diagnosis: Awaited<ReturnType<typeof getDiagnosis>>) {
  if (!diagnosis) return null;
  const fullAccess =
    diagnosis.productType === "full" && diagnosis.fullCreditsDeducted > 0;

  return {
    id: diagnosis.id,
    status: diagnosis.status,
    productType: diagnosis.productType,
    fullAccess,
    intake: diagnosis.intake,
    result: fullAccess
      ? diagnosis.result
      : buildDiagnosisPreviewResult(diagnosis.result),
    headline: diagnosis.headline,
    overallScore: diagnosis.overallScore,
    scoreLabel: diagnosis.scoreLabel,
    createdAt: diagnosis.createdAt,
  };
}

async function submitDiagnosis(
  userId: number,
  input: z.infer<typeof submitSchema>,
  productType: "preview" | "full"
) {
  if (productType === "full") {
    await checkAndResetCredits(userId);
    const required = await getActionCredits("diagnosis_full");
    const hasCredits = await checkCredits(userId, required);
    if (!hasCredits) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: JSON.stringify({
          error: "INSUFFICIENT_CREDITS",
          credits: await getUserCredits(userId),
          required,
        }),
      });
    }
  }

  const intake = convertQuestionnaireAnswers(
    input.answers,
    input.customValues
  );
  const diagnosisId = await createDiagnosis(userId, intake, productType);
  return { diagnosisId, productType };
}

export const diagnosisRouter = router({
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
    .input(submitSchema)
    .mutation(({ ctx, input }) =>
      submitDiagnosis(ctx.user.id, input, "full")
    ),
  submit: protectedProcedure
    .input(submitSchema)
    .mutation(({ ctx, input }) =>
      submitDiagnosis(ctx.user.id, input, "preview")
    ),
});
