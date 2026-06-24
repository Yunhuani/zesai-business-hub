type UnlockableDiagnosis = {
  userId: number;
  status: string;
  fullCreditsDeducted: number;
};

export function validateDiagnosisUnlock(
  diagnosis: UnlockableDiagnosis,
  userId: number
): { alreadyUnlocked: boolean } {
  if (diagnosis.userId !== userId) {
    throw new Error("Diagnosis not found");
  }
  if (diagnosis.status !== "done") {
    throw new Error("Diagnosis is not ready");
  }
  return { alreadyUnlocked: diagnosis.fullCreditsDeducted > 0 };
}
