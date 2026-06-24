import { eq } from "drizzle-orm";
import { diagnoses } from "../drizzle/schema";
import { getDb } from "./db";
import { runNbgDiagnosis } from "./nbgClient";
import { deductCreditsOnce } from "./creditsManager";
import { getActionCredits } from "./pricingConfig";

type JsonObject = Record<string, unknown>;

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
  userId: number,
  intake: JsonObject,
  productType: "preview" | "full"
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

    let fullCreditsDeducted = 0;
    if (productType === "full") {
      const credits = await getActionCredits("diagnosis_full");
      const charge = await deductCreditsOnce(
        userId,
        credits,
        `完整诊断 - Diagnosis #${diagnosisId}`,
        diagnosisId,
        "diagnosis_full"
      );
      if (!charge.success) {
        throw new Error("Insufficient credits for completed diagnosis");
      }
      fullCreditsDeducted = credits;
    }

    await retryIdempotentDatabaseOperation(() =>
      db
        .update(diagnoses)
        .set({
          status: "done",
          result,
          headline,
          overallScore,
          scoreLabel,
          fullCreditsDeducted,
          errorMessage: null,
        })
        .where(eq(diagnoses.id, diagnosisId))
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    try {
      await retryIdempotentDatabaseOperation(() =>
        db
          .update(diagnoses)
          .set({ status: "error", errorMessage })
          .where(eq(diagnoses.id, diagnosisId))
      );
    } catch (persistError) {
      console.error(
        `[Diagnosis ${diagnosisId}] Failed to persist error state:`,
        persistError
      );
    }
  }
}

export async function createDiagnosis(
  userId: number,
  intake: JsonObject,
  productType: "preview" | "full" = "preview"
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [insertResult] = await db
    .insert(diagnoses)
    .values({ userId, intake, productType, status: "pending" });
  const diagnosisId = insertResult.insertId;

  void processDiagnosis(diagnosisId, userId, intake, productType);

  return diagnosisId;
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
