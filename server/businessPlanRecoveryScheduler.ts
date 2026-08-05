import { recoverInterruptedBusinessPlans } from "./businessPlanService";

const BUSINESS_PLAN_RECOVERY_INTERVAL_MS = 2 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRecovering = false;

async function runRecoveryTick(): Promise<void> {
  if (isRecovering) {
    console.log("[BusinessPlanRecoveryScheduler] Previous recovery still running, skipping tick");
    return;
  }

  isRecovering = true;
  try {
    const recovered = await recoverInterruptedBusinessPlans();
    if (recovered > 0) {
      console.log(`[BusinessPlanRecoveryScheduler] Marked ${recovered} interrupted business plans as error`);
    }
  } catch (error) {
    console.error("[BusinessPlanRecoveryScheduler] Recovery tick failed:", error);
  } finally {
    isRecovering = false;
  }
}

export function startBusinessPlanRecoveryScheduler(): void {
  if (intervalId) {
    console.log("[BusinessPlanRecoveryScheduler] Already running");
    return;
  }

  console.log(
    `[BusinessPlanRecoveryScheduler] Starting, check interval: ${BUSINESS_PLAN_RECOVERY_INTERVAL_MS / 1000}s`
  );

  intervalId = setInterval(() => {
    void runRecoveryTick();
  }, BUSINESS_PLAN_RECOVERY_INTERVAL_MS);
}

export function stopBusinessPlanRecoveryScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRecovering = false;
  console.log("[BusinessPlanRecoveryScheduler] Stopped");
}
