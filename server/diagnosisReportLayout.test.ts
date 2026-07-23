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
    expect(closingSource).toContain("下载 PDF · 500 积分");
    expect(closingGuardIndex).toBeGreaterThan(-1);
    expect(reportSource).toContain("async function downloadPdf()");
  });
});
