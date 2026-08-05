import { ENV } from "./_core/env";

const POLL_INTERVAL_MS = 3_000;
const BUSINESS_PLAN_TIMEOUT_MS = 5 * 60 * 1_000;

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
      `Business plan ${action} failed (${response.status} ${response.statusText})${detail ? `: ${detail}` : ""}`
    );
  }
  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`Business plan ${action} returned an invalid JSON object`);
  }
  return payload as JsonObject;
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function runBusinessPlanGeneration(
  intake: JsonObject,
  onJobCreated?: (jobId: string) => Promise<void>
): Promise<{ jobId: string; result: JsonObject }> {
  const deadline = Date.now() + BUSINESS_PLAN_TIMEOUT_MS;
  const fetchBeforeDeadline = async (input: string, init?: RequestInit) => {
    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) throw new Error("Business plan generation timed out after 5 minutes");
    try {
      return await fetch(input, { ...init, signal: AbortSignal.timeout(remainingMs) });
    } catch (error) {
      if (Date.now() >= deadline) {
        throw new Error("Business plan generation timed out after 5 minutes");
      }
      throw error;
    }
  };

  const createResponse = await fetchBeforeDeadline(getEngineUrl("business-plans"), {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify({ bp_intake: intake }),
  });
  const createPayload = await readJson(createResponse, "creation");
  const jobId = createPayload.job_id;
  if (typeof jobId !== "string" || !jobId) {
    throw new Error("Business plan creation response did not include a valid job_id");
  }
  await onJobCreated?.(jobId);

  while (Date.now() < deadline) {
    const statusResponse = await fetchBeforeDeadline(
      getEngineUrl(`business-plans/${encodeURIComponent(jobId)}`),
      { headers: { accept: "application/json" } }
    );
    const statusPayload = await readJson(statusResponse, `status for job ${jobId}`);
    if (statusPayload.status === "done") {
      const result = statusPayload.result;
      if (!result || typeof result !== "object" || Array.isArray(result)) {
        throw new Error(`Business plan ${jobId} returned an invalid result`);
      }
      return { jobId, result: result as JsonObject };
    }
    if (statusPayload.status === "error") {
      const detail = statusPayload.error ?? statusPayload.message ?? "unknown engine error";
      throw new Error(`Business plan ${jobId} failed: ${String(detail)}`);
    }
    const remainingMs = deadline - Date.now();
    if (remainingMs > 0) await wait(Math.min(POLL_INTERVAL_MS, remainingMs));
  }
  throw new Error("Business plan generation timed out after 5 minutes");
}
