import { and, eq, sql } from "drizzle-orm";
import { diagnosisDrafts } from "../drizzle/schema";
import {
  conversationDiagnosisDraftSchema,
  type ConversationDiagnosisDraft,
} from "../shared/diagnosisDraft";
import { getDb } from "./db";

export const DIAGNOSIS_CONVERSATION_FLOW_KEY = "diagnosis_conversation_v1";

type DiagnosisDraftDbExecutor = Pick<
  NonNullable<Awaited<ReturnType<typeof getDb>>>,
  "delete"
>;

export async function getDiagnosisDraft(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [draft] = await db
    .select({
      payload: diagnosisDrafts.payload,
      updatedAt: diagnosisDrafts.updatedAt,
    })
    .from(diagnosisDrafts)
    .where(and(
      eq(diagnosisDrafts.userId, userId),
      eq(diagnosisDrafts.flowKey, DIAGNOSIS_CONVERSATION_FLOW_KEY)
    ))
    .limit(1);

  if (!draft) return null;
  return {
    payload: conversationDiagnosisDraftSchema.parse(draft.payload),
    updatedAt: draft.updatedAt,
  };
}

export async function saveDiagnosisDraft(
  userId: number,
  payload: ConversationDiagnosisDraft
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .insert(diagnosisDrafts)
    .values({
      userId,
      flowKey: DIAGNOSIS_CONVERSATION_FLOW_KEY,
      payload,
    })
    .onDuplicateKeyUpdate({
      set: {
        payload,
        updatedAt: sql`CURRENT_TIMESTAMP`,
      },
    });
}

export async function deleteDiagnosisDraft(
  userId: number,
  flowKey: string = DIAGNOSIS_CONVERSATION_FLOW_KEY,
  executor?: DiagnosisDraftDbExecutor
): Promise<void> {
  const db = executor ?? await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(diagnosisDrafts)
    .where(and(
      eq(diagnosisDrafts.userId, userId),
      eq(diagnosisDrafts.flowKey, flowKey)
    ));
}
