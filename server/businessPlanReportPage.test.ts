import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("business plan report page", () => {
  it("fetches the owned BP record and builds document pages from eight ordered modules", () => {
    const source = read("../client/src/pages/BusinessPlanReport.tsx");

    expect(source).toContain("trpc.businessPlan.get.useQuery");
    expect(source).toContain("buildReportPages(report.modules)");
    expect(source).toContain("pageNumber={index + 2}");
    expect(source).toContain("totalPages={pages.length + 2}");
    expect(source).not.toContain("executive_summary");
    expect(source).not.toContain("执行摘要");
    expect(source).not.toContain("公司简介");
  });

  it("uses engine headlines, content subpage titles, and customer-safe pending labels", () => {
    const source = read("../client/src/pages/BusinessPlanReport.tsx");

    expect(source).toContain("module.headline || module.title");
    expect(source).toContain("模块 {module.id} · {module.title}");
    expect(source).not.toContain("待补充：{item.fieldName}");
    expect(source).not.toContain("调试");
  });

  it("renders adaptive page cards, cover and back cover with document page numbers", () => {
    const source = read("../client/src/pages/BusinessPlanReport.tsx");

    expect(source).toContain("bp-document-page");
    expect(source).toContain("bp-page-number");
    expect(source).toContain("BackCover");
    expect(source).toContain("min-height:");
    expect(source).not.toContain("aspect-ratio: 16 / 9");
  });

  it("uses the approved gold theme variables without navy-blue colors", () => {
    const source = read("../client/src/pages/BusinessPlanReport.tsx");

    for (const token of [
      'data-theme="gold"',
      "--pri: #1f3d32",
      "--pri-deep: #152a23",
      "--pri-mid: #2c5544",
      "--acc: #c9a24b",
      "--acc-l: #dfc183",
      "--acc-p: #f7f1e2",
      "--acc-p2: #fbf8f0",
      "--bg: #fafaf8",
      "--ink: #1e2b25",
      "--ink2: #586158",
      "--ink3: #8e958c",
      "--line: #e6e4da",
    ]) {
      expect(source.toLowerCase()).toContain(token);
    }
    expect(source).not.toContain("#12305C");
    expect(source).not.toContain("#1C9FE0");
  });

  it("matches the approved infographic vocabulary with adaptive-height content", () => {
    const source = read("../client/src/pages/BusinessPlanReport.tsx");

    for (const marker of [
      "bp-module-label",
      "bp-loss-chain",
      "bp-product-architecture",
      "bp-conversion-pair",
      "bp-market-funnel",
      "bp-growth-chart",
      "bp-score-dots",
      "bp-arr-area",
      "bp-region-bar",
      "bp-roadmap",
      "bp-financial-chart",
      "bp-funding-donut",
      "bp-team-card",
    ]) {
      expect(source).toContain(marker);
    }
    expect(source.match(/<svg/g)?.length ?? 0).toBeGreaterThanOrEqual(7);
    expect(source).not.toContain("max-h-");
    expect(source).not.toContain("line-clamp-");
    expect(source).not.toContain("overflow-auto");
    expect(source).not.toContain("模块结论");
  });

  it("registers the BP report route without changing the diagnosis route", () => {
    const app = read("../client/src/App.tsx");

    expect(app).toContain(
      'import BusinessPlanReport from "./pages/BusinessPlanReport"'
    );
    expect(app).toContain(
      '<Route path="/business-plan/:id/report" component={BusinessPlanReport} />'
    );
    expect(app).toContain(
      '<Route path="/diagnosis/:id/report" component={DiagnosisReport} />'
    );
  });
});
