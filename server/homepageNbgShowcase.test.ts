import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("homepage NBG showcase", () => {
  it("shows a five-page report with the delivered dimensions and consistent rating", () => {
    const source = readSource(
      "../client/src/components/NbgReportSampleCarousel.tsx"
    );

    expect(source).toContain("NBG_REPORT_SAMPLE_SLIDE_COUNT = 5");
    expect(source).toContain("NBG 增长诊断报告");
    expect(source).not.toContain("NBG增长诊断报告（示例）");
    expect(source).toContain("<NbgRadarChart dimensions={dimensions} />");
    expect(source).not.toContain("function polarPoint");
    expect(source).not.toContain("function polygonPoints");

    for (const copy of [
      "五维增长解码",
      "某制造业公司",
      "健康度 7.5",
      "7.5分 · 良好",
      "翻看完整报告 →",
      "市场机会",
      "竞争格局",
      "商业模式",
      "内部能力",
      "财务健康",
    ]) {
      expect(source).toContain(copy);
    }

    for (const legacyCopy of [
      "客户结构",
      "产品力",
      "渠道效率",
      "定价毛利",
      "组织执行",
      "警告 · 3.8分",
    ]) {
      expect(source).not.toContain(legacyCopy);
    }
  });

  it("keeps the sample findings and exposes a clear priority matrix", () => {
    const source = readSource(
      "../client/src/components/NbgReportSampleCarousel.tsx"
    );

    for (const copy of [
      "现金跑道1.6个月",
      "法兰线年亏410万",
      "占净利38%",
      "前三大客户65%",
      "执行难度：易 → 难",
      "增长影响：低 → 高",
      "高影响 · 易执行",
      "压缩账期释放现金",
      "砍掉亏损法兰线",
      "降低客户集中度",
      "开拓新兴市场",
    ]) {
      expect(source).toContain(copy);
    }
  });

  it("shows the diagnosis flow and keeps diagnosis as the only primary action", () => {
    const source = readSource("../client/src/pages/Home.tsx");

    for (const copy of [
      "三步，拿到你的增长诊断报告",
      "填写经营信息",
      "AI 五维深度分析",
      "获得增长诊断报告",
    ]) {
      expect(source).toContain(copy);
    }

    expect(source).toContain("onClick={handleStartDiagnosis}");
    expect(source).toContain(
      "NBG 增长诊断是套餐会员的专属服务，开通套餐即可使用。"
    );
    expect(source).toContain('setLocation("/pricing")');
    expect(source).not.toContain("查看会员权益");
  });
});
