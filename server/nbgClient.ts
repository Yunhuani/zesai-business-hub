import { ENV } from "./_core/env";

const POLL_INTERVAL_MS = 3_000;
const DIAGNOSIS_TIMEOUT_MS = 10 * 60 * 1_000;

type JsonObject = Record<string, unknown>;

function getEngineUrl(path: string): string {
  const baseUrl = ENV.nbgEngineUrl.endsWith("/")
    ? ENV.nbgEngineUrl
    : `${ENV.nbgEngineUrl}/`;
  return new URL(path, baseUrl).toString();
}

async function readJson(response: Response, action: string): Promise<JsonObject> {
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `NBG ${action} failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`NBG ${action} returned an invalid JSON object`);
  }
  return payload as JsonObject;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runNbgDiagnosis(intake: JsonObject): Promise<JsonObject> {
  const deadline = Date.now() + DIAGNOSIS_TIMEOUT_MS;
  const fetchBeforeDeadline = async (
    input: string,
    init?: RequestInit
  ): Promise<Response> => {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      throw new Error("NBG diagnosis timed out after 10 minutes");
    }

    try {
      return await fetch(input, {
        ...init,
        signal: AbortSignal.timeout(remainingMs),
      });
    } catch (error) {
      if (Date.now() >= deadline) {
        throw new Error("NBG diagnosis timed out after 10 minutes");
      }
      throw error;
    }
  };

  const createResponse = await fetchBeforeDeadline(getEngineUrl("diagnose"), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      diagnosis_intake: intake,
      market_brief: null,
    }),
  });
  const createPayload = await readJson(createResponse, "diagnosis creation");
  const jobId = createPayload.job_id;

  if (typeof jobId !== "string" || !jobId) {
    throw new Error("NBG diagnosis creation response did not include a valid job_id");
  }

  while (Date.now() < deadline) {
    const statusResponse = await fetchBeforeDeadline(
      getEngineUrl(`diagnose/${encodeURIComponent(jobId)}`),
      { headers: { accept: "application/json" } }
    );
    const statusPayload = await readJson(statusResponse, `diagnosis status for job ${jobId}`);
    const status = statusPayload.status;

    if (status === "done") {
      const result = statusPayload.result;
      if (result && typeof result === "object" && !Array.isArray(result)) {
        return result as JsonObject;
      }
      return statusPayload;
    }

    if (status === "error") {
      const detail =
        statusPayload.error ?? statusPayload.message ?? "unknown engine error";
      throw new Error(`NBG diagnosis ${jobId} failed: ${String(detail)}`);
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs > 0) {
      await wait(Math.min(POLL_INTERVAL_MS, remainingMs));
    }
  }

  throw new Error("NBG diagnosis timed out after 10 minutes");
}
