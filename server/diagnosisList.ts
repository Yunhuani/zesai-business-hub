type DiagnosisListRow = {
  id: number;
  headline: string | null;
  createdAt: string;
  overallScore: number | null;
  scoreLabel: string | null;
  status: string;
  productType: "preview" | "full";
  fullCreditsDeducted: number;
};

export function serializeDiagnosisListItem(row: DiagnosisListRow) {
  return {
    id: row.id,
    headline: row.headline,
    createdAt: row.createdAt,
    overallScore: row.overallScore,
    scoreLabel: row.scoreLabel,
    status: row.status,
    fullAccess:
      row.productType === "full" && row.fullCreditsDeducted > 0,
  };
}
