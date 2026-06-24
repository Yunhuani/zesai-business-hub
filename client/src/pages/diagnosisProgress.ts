export const DIAGNOSIS_DIMENSIONS = [
  "市场与机会",
  "竞争格局",
  "商业模式",
  "内部能力",
  "财务健康",
] as const;

export type DiagnosisStatus = "pending" | "running" | "done" | "error";
export type DimensionState = "pending" | "active" | "complete";

const DIMENSION_START_TIMES_MS = [0, 15_000, 32_000, 52_000, 78_000];

export const DIAGNOSIS_FRONTEND_TIMEOUT_MS = 10 * 60 * 1_000;

export function getEstimatedDimensionStates(
  status: DiagnosisStatus,
  elapsedMs: number
): DimensionState[] {
  if (status === "done") {
    return DIAGNOSIS_DIMENSIONS.map(() => "complete");
  }

  const activeIndex = Math.min(
    DIMENSION_START_TIMES_MS.filter(startTime => elapsedMs >= startTime).length - 1,
    DIAGNOSIS_DIMENSIONS.length - 1
  );

  return DIAGNOSIS_DIMENSIONS.map((_, index) => {
    if (index < activeIndex) return "complete";
    if (index === Math.max(0, activeIndex)) return "active";
    return "pending";
  });
}
