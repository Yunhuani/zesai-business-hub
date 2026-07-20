import { and, desc, eq, inArray, lt } from "drizzle-orm";
import { diagnoses } from "../drizzle/schema";
import { getDb } from "./db";
import { runNbgDiagnosis } from "./nbgClient";
import {
  checkAndResetCredits,
  deductCreditsOnceInTx,
  refundDiagnosisFullIfCharged,
} from "./creditsManager";
import { getActionCredits } from "./pricingConfig";
import { validateDiagnosisUnlock } from "./diagnosisUnlock";
import { serializeDiagnosisListItem } from "./diagnosisList";
import type { DiagnosisProduct } from "./diagnosisProduct";
import { logStructuredError, notifyOps } from "./observability";

type JsonObject = Record<string, unknown>;
// Stale recovery threshold. This depends on the diagnosis engine's 10 minute
// timeout; if the engine timeout is increased, update this threshold together.
const DIAGNOSIS_TIMEOUT_MS = 15 * 60 * 1000;
const INTERRUPTED_DIAGNOSIS_ERROR = "Diagnosis interrupted or timed out";
const MAX_DIAGNOSIS_RETRY_COUNT = 3;

const TRANSIENT_DATABASE_ERROR_CODES = new Set([
  "ECONNRESET",
  "ETIMEDOUT",
  "HANDSHAKE_SSL_ERROR",
  "PROTOCOL_CONNECTION_LOST",
]);

function getObject(value: unknown): JsonObject | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : undefined;
}

function getErrorCode(error: unknown): string | undefined {
  let current = error;

  while (current && typeof current === "object") {
    if ("code" in current && typeof current.code === "string") {
      return current.code;
    }
    current = "cause" in current ? current.cause : undefined;
  }

  return undefined;
}

async function retryIdempotentDatabaseOperation<T>(
  operation: () => Promise<T>
): Promise<T> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const code = getErrorCode(error);
      if (attempt === 3 || !code || !TRANSIENT_DATABASE_ERROR_CODES.has(code)) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, attempt * 500));
    }
  }

  throw new Error("Unreachable database retry state");
}

async function processDiagnosis(
  diagnosisId: number,
  intake: JsonObject
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.error(`[Diagnosis ${diagnosisId}] Database not available`);
    return;
  }

  try {
    await retryIdempotentDatabaseOperation(() =>
      db
        .update(diagnoses)
        .set({ status: "running", errorMessage: null })
        .where(eq(diagnoses.id, diagnosisId))
    );

    const result = await runNbgDiagnosis(intake);
    const synthesis = getObject(result.synthesis_output);
    const scoreSummary = getObject(result.score_summary);
    const headline = typeof synthesis?.headline === "string"
      ? synthesis.headline
      : null;
    const overallScore = typeof scoreSummary?.overall_score === "number"
      ? scoreSummary.overall_score
      : null;
    const scoreLabel = typeof scoreSummary?.score_label === "string"
      ? scoreSummary.score_label
      : null;

    await retryIdempotentDatabaseOperation(() =>
      db
        .update(diagnoses)
        .set({
          status: "done",
          result,
          headline,
          overallScore,
          scoreLabel,
          errorMessage: null,
        })
        .where(eq(diagnoses.id, diagnosisId))
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStructuredError({
      category: "engine_invocation_failed",
      diagnosisId,
      error,
    });
    notifyOps({
      category: "engine",
      message: "NBG diagnosis engine invocation failed",
      diagnosisId,
      details: { errorMessage },
    }).catch(() => {});

    try {
      await markDiagnosisError(diagnosisId, errorMessage);
    } catch (persistError) {
      console.error(
        `[Diagnosis ${diagnosisId}] Failed to persist error state:`,
        persistError
      );
    }
  }
}

export async function markDiagnosisError(
  diagnosisId: number,
  errorMessage: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await refundDiagnosisFullIfCharged(diagnosisId);

  await retryIdempotentDatabaseOperation(() =>
    db
      .update(diagnoses)
      .set({ status: "error", errorMessage })
      .where(eq(diagnoses.id, diagnosisId))
  );
}

export async function recoverInterruptedDiagnoses(
  now: Date = new Date()
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const cutoff = new Date(now.getTime() - DIAGNOSIS_TIMEOUT_MS)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const interrupted = await db
    .select({ id: diagnoses.id })
    .from(diagnoses)
    .where(
      and(
        inArray(diagnoses.status, ["pending", "running"]),
        lt(diagnoses.updatedAt, cutoff)
      )
    );

  for (const diagnosis of interrupted) {
    logStructuredError({
      category: "diagnosis_recovery_mark_error",
      diagnosisId: diagnosis.id,
      error: INTERRUPTED_DIAGNOSIS_ERROR,
      details: { status: "pending_or_running", cutoff },
    });
    notifyOps({
      category: "diagnosis_recovery",
      message: "Interrupted diagnosis marked as error during startup recovery",
      diagnosisId: diagnosis.id,
      details: { cutoff },
    }).catch(() => {});
    await markDiagnosisError(diagnosis.id, INTERRUPTED_DIAGNOSIS_ERROR);
  }

  return interrupted.length;
}

export async function createDiagnosis(
  userId: number,
  intake: JsonObject,
  productType: Exclude<DiagnosisProduct, "pdf">
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [insertResult] = await db
    .insert(diagnoses)
    .values({ userId, intake, productType, status: "pending" });
  const diagnosisId = insertResult.insertId;

  void processDiagnosis(diagnosisId, intake);

  return diagnosisId;
}

export async function retryDiagnosis(
  diagnosisId: number,
  userId: number
): Promise<{ diagnosisId: number; status: "pending" }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const diagnosis = await getDiagnosis(diagnosisId);
  if (!diagnosis || diagnosis.userId !== userId) {
    throw new Error("Diagnosis not found");
  }
  if (diagnosis.status !== "error") {
    throw new Error("Diagnosis is not retryable");
  }

  const retryCount = diagnosis.retryCount ?? 0;
  if (retryCount >= MAX_DIAGNOSIS_RETRY_COUNT) {
    throw new Error("Diagnosis retry limit reached");
  }

  const intake = getObject(diagnosis.intake);
  if (!intake) {
    throw new Error("Diagnosis intake is invalid");
  }

  await db.transaction(async tx => {
    await tx
      .update(diagnoses)
      .set({
        status: "pending",
        errorMessage: null,
        result: null,
        headline: null,
        overallScore: null,
        scoreLabel: null,
        productType: "preview",
        fullCreditsDeducted: 0,
        pdfPurchased: 0,
        pdfCreditsDeducted: 0,
        retryCount: retryCount + 1,
      })
      .where(eq(diagnoses.id, diagnosisId));
  });

  void processDiagnosis(diagnosisId, intake);

  return { diagnosisId, status: "pending" };
}

export async function getDiagnosis(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return retryIdempotentDatabaseOperation(() =>
    db.query.diagnoses.findFirst({
      where: eq(diagnoses.id, id),
    })
  );
}

export async function listUserDiagnoses(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const rows = await db
    .select({
      id: diagnoses.id,
      headline: diagnoses.headline,
      createdAt: diagnoses.createdAt,
      overallScore: diagnoses.overallScore,
      scoreLabel: diagnoses.scoreLabel,
      status: diagnoses.status,
      productType: diagnoses.productType,
      fullCreditsDeducted: diagnoses.fullCreditsDeducted,
    })
    .from(diagnoses)
    .where(eq(diagnoses.userId, userId))
    .orderBy(desc(diagnoses.createdAt));

  return rows.map(serializeDiagnosisListItem);
}

export async function markDiagnosisPdfPurchased(
  diagnosisId: number,
  creditsDeducted: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(diagnoses)
    .set({
      pdfPurchased: 1,
      pdfCreditsDeducted: creditsDeducted,
    })
    .where(eq(diagnoses.id, diagnosisId));
}

export async function unlockDiagnosis(
  diagnosisId: number,
  userId: number
) {
  const diagnosis = await getDiagnosis(diagnosisId);
  if (!diagnosis) throw new Error("Diagnosis not found");

  const { alreadyUnlocked } = validateDiagnosisUnlock(diagnosis, userId);
  if (alreadyUnlocked) return diagnosis;

  await checkAndResetCredits(userId);
  const credits = await getActionCredits("diagnosis_full");

  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async tx => {
    const charge = await deductCreditsOnceInTx(
      tx,
      userId,
      credits,
      `完整诊断解锁 - Diagnosis #${diagnosisId}`,
      diagnosisId,
      "diagnosis_full"
    );
    if (!charge.success) {
      throw new Error("INSUFFICIENT_CREDITS");
    }

    await tx
      .update(diagnoses)
      .set({
        productType: "full",
        fullCreditsDeducted: credits,
      })
      .where(eq(diagnoses.id, diagnosisId));
  });

  const unlocked = await getDiagnosis(diagnosisId);
  if (!unlocked) throw new Error("Diagnosis not found");
  return unlocked;
}
