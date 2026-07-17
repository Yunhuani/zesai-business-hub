import { recoverInterruptedDiagnoses } from "./diagnosisService";

const DIAGNOSIS_RECOVERY_INTERVAL_MS = 5 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;
let isRecovering = false;

async function runRecoveryTick(): Promise<void> {
  if (isRecovering) {
    console.log("[DiagnosisRecoveryScheduler] Previous recovery still running, skipping tick");
    return;
  }

  isRecovering = true;
  try {
    const recovered = await recoverInterruptedDiagnoses();
    if (recovered > 0) {
      console.log(`[DiagnosisRecoveryScheduler] Marked ${recovered} interrupted diagnoses as error`);
    }
  } catch (error) {
    console.error("[DiagnosisRecoveryScheduler] Recovery tick failed:", error);
  } finally {
    isRecovering = false;
  }
}

export function startDiagnosisRecoveryScheduler(): void {
  if (intervalId) {
    console.log("[DiagnosisRecoveryScheduler] Already running");
    return;
  }

  console.log(
    `[DiagnosisRecoveryScheduler] Starting, check interval: ${DIAGNOSIS_RECOVERY_INTERVAL_MS / 1000}s`
  );

  intervalId = setInterval(() => {
    void runRecoveryTick();
  }, DIAGNOSIS_RECOVERY_INTERVAL_MS);
}

export function stopDiagnosisRecoveryScheduler(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRecovering = false;
  console.log("[DiagnosisRecoveryScheduler] Stopped");
}
