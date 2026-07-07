import { ENV } from "./_core/env";
import { getDb } from "./db";

type CheckStatus = "ok" | "unhealthy";

type HealthCheck = {
  status: CheckStatus;
  latencyMs?: number;
  error?: string;
};

export type HealthResponse = {
  status: CheckStatus;
  timestamp: string;
  checks: {
    service: HealthCheck;
    database: HealthCheck;
    nbgEngine?: HealthCheck;
  };
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildHealthResponse(
  checks: HealthResponse["checks"],
  now: Date = new Date()
): HealthResponse {
  const status = Object.values(checks).every(check => check.status === "ok")
    ? "ok"
    : "unhealthy";

  return {
    status,
    timestamp: now.toISOString(),
    checks,
  };
}

async function checkDatabase(): Promise<HealthCheck> {
  const startedAt = Date.now();
  try {
    const db = await getDb();
    if (!db) {
      return { status: "unhealthy", error: "Database not initialized" };
    }
    await db.execute({ sql: "SELECT 1", args: [] } as any);
    return { status: "ok", latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { status: "unhealthy", error: getErrorMessage(error) };
  }
}

async function checkNbgEngine(): Promise<HealthCheck> {
  const startedAt = Date.now();
  try {
    const response = await fetch(ENV.nbgEngineUrl, {
      method: "GET",
      signal: AbortSignal.timeout(3_000),
    });
    if (!response.ok) {
      return {
        status: "unhealthy",
        latencyMs: Date.now() - startedAt,
        error: `HTTP ${response.status}`,
      };
    }
    return { status: "ok", latencyMs: Date.now() - startedAt };
  } catch (error) {
    return { status: "unhealthy", error: getErrorMessage(error) };
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const checks: HealthResponse["checks"] = {
    service: { status: "ok" },
    database: await checkDatabase(),
  };

  if (process.env.NBG_HEALTH_REQUIRED === "true") {
    checks.nbgEngine = await checkNbgEngine();
  }

  return buildHealthResponse(checks);
}
