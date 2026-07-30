import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reportSource = readFileSync(
  new URL("../client/src/pages/DiagnosisReport.tsx", import.meta.url),
  "utf8"
);

describe("diagnosis report reading flow", () => {
  it("places a four-point reading guide after the cover and before the executive summary", () => {
    const coverIndex = reportSource.indexOf('className="report-cover');
    const guideIndex = reportSource.indexOf('className="report-body-intro');
    const executiveIndex = reportSource.indexOf('className="report-executive');

    expect(coverIndex).toBeGreaterThan(-1);
    expect(guideIndex).toBeGreaterThan(coverIndex);
    expect(executiveIndex).toBeGreaterThan(guideIndex);

    const guideSource = reportSource.slice(guideIndex, executiveIndex);
    expect(guideSource).toContain("如何阅读这份报告");
    expect(guideSource).toContain("先看综合分和五维评分");
    expect(guideSource).toContain("再看各维度的判断、推理链和证据");
    expect(guideSource).toContain("标注“结构性判断口径”的部分");
    expect(guideSource).toContain("最后看关键发现和下一步方向");
  });

  it("renders the PDF download action in the closing section instead of the header", () => {
    const closingIndex = reportSource.indexOf('className="report-closing');
    const closingGuardIndex = reportSource.lastIndexOf(
      "{fullAccess ? (",
      closingIndex
    );
    const headerSource = reportSource.slice(
      reportSource.indexOf("<header"),
      reportSource.indexOf("</header>")
    );
    const closingSource = reportSource.slice(
      closingIndex,
      reportSource.indexOf('className="report-about')
    );

    expect(headerSource).not.toContain("downloadPdf");
    expect(headerSource).not.toContain("下载 PDF");
    expect(closingSource).toContain("onClick={downloadPdf}");
    expect(closingSource).toContain("report-screen-only");
    expect(closingSource).toContain("!pdfMode");
    expect(closingSource).toContain('"下载 PDF"');
    expect(reportSource).not.toContain("下载 PDF · 500 积分");
    expect(reportSource).not.toContain("首次下载需要 500 积分");
    expect(closingGuardIndex).toBeGreaterThan(-1);
    expect(reportSource).toContain("async function downloadPdf()");
  });

  it("shows a clear home action for regular users after the full report closing section", () => {
    const closingIndex = reportSource.indexOf('className="report-closing');
    const aboutIndex = reportSource.indexOf('className="report-about');
    const closingSource = reportSource.slice(closingIndex, aboutIndex);

    expect(closingSource).toContain("fullAccess && !adminMode");
    expect(closingSource).toContain('href="/"');
    expect(closingSource).toContain("返回首页");
  });

  it("shows a simple fallback instead of the old unlock preview for legacy locked reports", () => {
    expect(reportSource).toContain("!fullAccess && !previewMode && !adminMode");
    expect(reportSource).toContain("该报告未生成完整内容，请重新发起诊断。");
    expect(reportSource).toContain('href="/diagnosis"');
    expect(reportSource).toContain("重新诊断");
    expect(reportSource).not.toContain("const requiredUnlockCredits = 1000");
    expect(reportSource).not.toContain("解锁完整报告(消耗1000积分)");
    expect(reportSource).not.toContain("解锁后可查看");
    expect(reportSource).toContain("previewMode && !fullAccess");
  });

  it("shows customer-safe data quality guidance only in the full report flow", () => {
    const qualityIndex = reportSource.indexOf("本次报告的信息基础");
    const healthOverviewIndex = reportSource.indexOf("Health examination");
    const dimensionIndex = reportSource.indexOf('className="report-dimension');
    const findingsIndex = reportSource.indexOf('className="report-findings');

    expect(qualityIndex).toBeGreaterThan(-1);
    expect(qualityIndex).toBeLessThan(healthOverviewIndex);
    expect(reportSource).toContain("fullAccess && report.dataQuality");

    const dimensionSource = reportSource.slice(dimensionIndex, findingsIndex);
    expect(dimensionSource).toContain("qualityDimension");
    expect(dimensionSource).toContain(
      "若补充这些信息，可进一步提高判断精度"
    );
    expect(dimensionSource).toContain("missingInformation.map");
    expect(dimensionSource).toContain("upgradeHook");
    expect(dimensionSource).not.toContain("missing_plus");
  });

  it("keeps the development preview layout while retaining exact score bars", () => {
    const healthIndex = reportSource.indexOf('className="report-health');
    const dimensionsIndex = reportSource.indexOf(
      "{fullAccess ? report.dimensions.map"
    );
    const healthSource = reportSource.slice(healthIndex, dimensionsIndex);

    expect(reportSource).toContain("import.meta.env.DEV");
    expect(reportSource).toContain('get("preview") === "1"');
    expect(reportSource).toContain("NbgRadarChart,");
    expect(reportSource).toContain('from "@/components/NbgRadarChart"');
    expect(healthSource).toContain("<NbgRadarChart");
    expect(healthSource).toContain("radarDimensions");
    expect(healthSource).toContain("<ScoreBar");
    expect(healthSource).not.toContain("fullAccess && radarDimensions");
    expect(healthSource).not.toContain("!pdfMode");
  });
});
