import { and, desc, eq, inArray, lt, sql } from "drizzle-orm";
import { businessPlans, diagnosisDrafts } from "../drizzle/schema";
import { runBusinessPlanGeneration } from "./businessPlanClient";
import {
  checkAndResetCredits,
  deductCreditsOnceInTx,
  refundBusinessPlanFullIfCharged,
} from "./creditsManager";
import { getDb } from "./db";
import { getActionCredits } from "./pricingConfig";

type JsonObject = Record<string, unknown>;
type CreateBusinessPlanOptions = { skipBilling?: boolean };

export const BUSINESS_PLAN_FLOW_KEY = "business_plan_v1";
const BUSINESS_PLAN_BILLING_KEY = "business_plan_full";
const BUSINESS_PLAN_RECOVERY_TIMEOUT_MS = 6 * 60 * 1_000;
const MAX_BUSINESS_PLAN_RETRY_COUNT = 3;
const INTERRUPTED_BUSINESS_PLAN_ERROR = "Business plan generation interrupted or timed out";

async function chargeBusinessPlan(
  tx: Parameters<typeof deductCreditsOnceInTx>[0],
  userId: number,
  businessPlanId: number,
  credits: number
): Promise<number> {
  const charge = await deductCreditsOnceInTx(
    tx,
    userId,
    credits,
    `Business plan generation - BusinessPlan #${businessPlanId}`,
    businessPlanId,
    BUSINESS_PLAN_BILLING_KEY
  );
  if (!charge.success) throw new Error("INSUFFICIENT_CREDITS");
  const deducted = charge.charged ? credits : 0;
  await tx
    .update(businessPlans)
    .set({ creditsDeducted: deducted })
    .where(eq(businessPlans.id, businessPlanId));
  return deducted;
}

async function processBusinessPlan(
  businessPlanId: number,
  intake: JsonObject
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    await db
      .update(businessPlans)
      .set({ status: "running", errorMessage: null })
      .where(eq(businessPlans.id, businessPlanId));
    const { result } = await runBusinessPlanGeneration(intake, async engineJobId => {
      await db
        .update(businessPlans)
        .set({ engineJobId })
        .where(eq(businessPlans.id, businessPlanId));
    });
    await db
      .update(businessPlans)
      .set({ status: "done", result, errorMessage: null })
      .where(eq(businessPlans.id, businessPlanId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await markBusinessPlanError(businessPlanId, message);
  }
}

export async function markBusinessPlanError(
  businessPlanId: number,
  errorMessage: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await refundBusinessPlanFullIfCharged(businessPlanId);
  await db
    .update(businessPlans)
    .set({ status: "error", errorMessage, creditsDeducted: 0 })
    .where(eq(businessPlans.id, businessPlanId));
}

export async function createBusinessPlan(
  userId: number,
  intake: JsonObject,
  options: CreateBusinessPlanOptions = {}
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Development-only debugging capability: only an administrator-only caller may
  // explicitly enable this, and it must never be exposed through a normal-user path.
  const skipBilling = options.skipBilling === true;
  let credits: number | null = null;
  if (!skipBilling) {
    await checkAndResetCredits(userId);
    credits = await getActionCredits("business_plan");
  }

  const businessPlanId = await db.transaction(async tx => {
    const [insertResult] = await tx
      .insert(businessPlans)
      .values({ userId, intake, status: "pending" });
    const id = insertResult.insertId;
    if (credits !== null) {
      await chargeBusinessPlan(tx, userId, id, credits);
    }
    await tx
      .delete(diagnosisDrafts)
      .where(and(
        eq(diagnosisDrafts.userId, userId),
        eq(diagnosisDrafts.flowKey, BUSINESS_PLAN_FLOW_KEY)
      ));
    return id;
  });

  void processBusinessPlan(businessPlanId, intake);
  return businessPlanId;
}

export async function getBusinessPlan(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.query.businessPlans.findFirst({ where: eq(businessPlans.id, id) });
}

export async function listUserBusinessPlans(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db
    .select()
    .from(businessPlans)
    .where(eq(businessPlans.userId, userId))
    .orderBy(desc(businessPlans.createdAt));
}

export async function retryBusinessPlan(
  businessPlanId: number,
  userId: number
): Promise<{ businessPlanId: number; status: "pending" }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const businessPlan = await getBusinessPlan(businessPlanId);
  if (!businessPlan || businessPlan.userId !== userId) throw new Error("Business plan not found");
  if (businessPlan.status !== "error") throw new Error("Business plan is not retryable");
  if (businessPlan.retryCount >= MAX_BUSINESS_PLAN_RETRY_COUNT) {
    throw new Error("Business plan retry limit reached");
  }
  const intake = businessPlan.intake;
  if (!intake || typeof intake !== "object" || Array.isArray(intake)) {
    throw new Error("Business plan intake is invalid");
  }

  await db
    .update(businessPlans)
    .set({
      engineJobId: null,
      status: "pending",
      result: null,
      creditsDeducted: 0,
      retryCount: businessPlan.retryCount + 1,
      errorMessage: null,
    })
    .where(eq(businessPlans.id, businessPlanId));
  void processBusinessPlan(businessPlanId, intake as JsonObject);
  return { businessPlanId, status: "pending" };
}

export async function recoverInterruptedBusinessPlans(now: Date = new Date()): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const cutoff = new Date(now.getTime() - BUSINESS_PLAN_RECOVERY_TIMEOUT_MS)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const interrupted = await db
    .select({ id: businessPlans.id })
    .from(businessPlans)
    .where(and(
      inArray(businessPlans.status, ["pending", "running"]),
      lt(businessPlans.updatedAt, cutoff)
    ));
  for (const item of interrupted) {
    await markBusinessPlanError(item.id, INTERRUPTED_BUSINESS_PLAN_ERROR);
  }
  return interrupted.length;
}

export async function getBusinessPlanDraft(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [draft] = await db
    .select({ payload: diagnosisDrafts.payload, updatedAt: diagnosisDrafts.updatedAt })
    .from(diagnosisDrafts)
    .where(and(
      eq(diagnosisDrafts.userId, userId),
      eq(diagnosisDrafts.flowKey, BUSINESS_PLAN_FLOW_KEY)
    ))
    .limit(1);
  return draft ?? null;
}

export async function saveBusinessPlanDraft(
  userId: number,
  payload: JsonObject
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .insert(diagnosisDrafts)
    .values({ userId, flowKey: BUSINESS_PLAN_FLOW_KEY, payload })
    .onDuplicateKeyUpdate({ set: { payload, updatedAt: sql`CURRENT_TIMESTAMP` } });
}
