import { z } from "zod";

export const financeRowAnswerSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.null()])
);

export const diagnosisDraftAnswerSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.array(financeRowAnswerSchema),
]);

export const diagnosisDraftSchema = z.object({
  stepIndex: z.number().int().nonnegative(),
  conversationUnitIndex: z.number().int().nonnegative().optional(),
  answers: z.record(z.string(), diagnosisDraftAnswerSchema),
  customValues: z.record(z.string(), z.string()),
}).strict();

export const conversationDiagnosisDraftSchema = diagnosisDraftSchema.extend({
  conversationUnitIndex: z.number().int().nonnegative(),
}).strict();

export type FinanceRowAnswer = z.infer<typeof financeRowAnswerSchema>;
export type DiagnosisDraftAnswer = z.infer<typeof diagnosisDraftAnswerSchema>;
export type DiagnosisDraft = z.infer<typeof diagnosisDraftSchema>;
export type ConversationDiagnosisDraft = z.infer<typeof conversationDiagnosisDraftSchema>;
