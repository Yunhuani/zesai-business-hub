export function buildDiagnosisSupportHref(diagnosisId: number): string {
  return `/support?diagnosisId=${diagnosisId}`;
}

export function buildDiagnosisSupportPrefill(
  search: string,
  origin: string
): string {
  const diagnosisId = Number(new URLSearchParams(search).get("diagnosisId"));
  if (!Number.isInteger(diagnosisId) || diagnosisId <= 0) return "";

  const reportUrl = new URL(
    `/diagnosis/${diagnosisId}/report`,
    origin
  ).toString();

  return `这是针对某次 NBG 诊断的增长方案咨询请求。

诊断 ID：${diagnosisId}
诊断报告：${reportUrl}

补充说明：`;
}
