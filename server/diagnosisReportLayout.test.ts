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

  it("shows the 1000-credit unlock and recharge actions only for locked reports", () => {
    const unlockIndex = reportSource.indexOf("{!fullAccess ? (");
    const fullReportIndex = reportSource.indexOf(
      "{fullAccess ? report.dimensions.map"
    );
    const unlockSource = reportSource.slice(unlockIndex, fullReportIndex);

    expect(unlockIndex).toBeGreaterThan(-1);
    expect(fullReportIndex).toBeGreaterThan(unlockIndex);
    expect(reportSource).toContain("const requiredUnlockCredits = 1000");
    expect(unlockSource).toContain("积分不足,充值后可解锁完整报告");
    expect(unlockSource).toContain('href="/credits"');
    expect(unlockSource).toContain("去充值");
    expect(unlockSource).toContain("解锁完整报告(消耗1000积分)");
    expect(reportSource).not.toContain("1,500");
    expect(reportSource).not.toContain("1500 积分");
  });

  it("shows one real key finding and two data-free placeholders in preview", () => {
    const findingsIndex = reportSource.indexOf('className="report-findings');
    const closingIndex = reportSource.indexOf('className="report-closing');
    const findingsSource = reportSource.slice(findingsIndex, closingIndex);

    expect(reportSource).toMatch(
      /fullAccess\s*\?\s*report\.keyFindings\s*:\s*report\.keyFindings\.slice\(0,\s*1\)/
    );
    expect(findingsSource).toContain("visibleKeyFindings.map");
    expect(findingsSource).toContain("Array.from({ length: 2 }");
    expect(findingsSource).toContain("解锁完整报告查看全部关键发现");
  });

  it("lists the four report benefits before the unlock action", () => {
    const unlockIndex = reportSource.indexOf("{!fullAccess ? (");
    const fullReportIndex = reportSource.indexOf(
      "{fullAccess ? report.dimensions.map"
    );
    const unlockSource = reportSource.slice(unlockIndex, fullReportIndex);
    const benefitsIndex = unlockSource.indexOf("解锁后可查看");
    const unlockButtonIndex = unlockSource.indexOf(
      "解锁完整报告(消耗1000积分)"
    );

    expect(benefitsIndex).toBeGreaterThan(-1);
    expect(benefitsIndex).toBeLessThan(unlockButtonIndex);
    expect(unlockSource).toContain("UNLOCK_BENEFITS.map");
    expect(reportSource).toContain(
      "五个维度逐项深度分析（评分、判断、推理链、证据）"
    );
    expect(reportSource).toContain("全部三个关键发现");
    expect(reportSource).toContain("从诊断到行动的下一步增长方向");
    expect(reportSource).toContain("完整报告PDF下载");
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

  it("shows the shared radar chart in both preview and full reports while retaining exact score bars", () => {
    const healthIndex = reportSource.indexOf('className="report-health');
    const unlockIndex = reportSource.indexOf("{!fullAccess ? (", healthIndex);
    const healthSource = reportSource.slice(healthIndex, unlockIndex);

    expect(reportSource).toContain("NbgRadarChart,");
    expect(reportSource).toContain('from "@/components/NbgRadarChart"');
    expect(healthSource).toContain("<NbgRadarChart");
    expect(healthSource).toContain("radarDimensions");
    expect(healthSource).toContain("<ScoreBar");
    expect(healthSource).not.toContain("fullAccess && radarDimensions");
    expect(healthSource).not.toContain("!pdfMode");
  });
});
