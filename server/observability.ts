import { logger } from "./lib/logger";

export type StructuredErrorCategory =
  | "engine_invocation_failed"
  | "diagnosis_recovery_mark_error"
  | "diagnosis_refund_triggered"
  | "alipay_callback_failed"
  | "alipay_signature_failed"
  | "credit_deduction_failed";

export type StructuredErrorContext = {
  category: StructuredErrorCategory;
  userId?: number;
  orderId?: number | string;
  diagnosisId?: number;
  error: unknown;
  details?: Record<string, unknown>;
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildStructuredErrorLog(
  context: StructuredErrorContext,
  now: Date = new Date()
) {
  return {
    timestamp: now.toISOString(),
    level: "error" as const,
    category: context.category,
    userId: context.userId,
    orderId: context.orderId,
    diagnosisId: context.diagnosisId,
    errorMessage: getErrorMessage(context.error),
    ...(context.details ? { details: context.details } : {}),
  };
}

export function logStructuredError(context: StructuredErrorContext): void {
  logger.errorJson(buildStructuredErrorLog(context));
}
