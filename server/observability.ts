import { logger } from "./lib/logger";
import { ENV } from "./_core/env";

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

export type OpsEvent = {
  category: "payment" | "engine" | "refund" | "diagnosis_recovery";
  message: string;
  userId?: number;
  orderId?: number | string;
  diagnosisId?: number;
  details?: Record<string, unknown>;
};

export async function notifyOps(
  event: OpsEvent,
  webhookUrl: string = ENV.opsAlertWebhook
): Promise<{ sent: boolean }> {
  const payload = {
    timestamp: new Date().toISOString(),
    ...event,
  };

  if (!webhookUrl) {
    logger.warn("OpsAlert", JSON.stringify({ ...payload, skipped: "webhook_not_configured" }));
    return { sent: false };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      logger.errorJson({
        timestamp: new Date().toISOString(),
        level: "error",
        category: "ops_alert_failed",
        errorMessage: `OPS_ALERT_WEBHOOK returned ${response.status}`,
      });
      return { sent: false };
    }
    return { sent: true };
  } catch (error) {
    logger.errorJson({
      timestamp: new Date().toISOString(),
      level: "error",
      category: "ops_alert_failed",
      errorMessage: error instanceof Error ? error.message : String(error),
    });
    return { sent: false };
  }
}
