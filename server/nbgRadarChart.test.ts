import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  NbgRadarChart,
  normalizeRadarScore,
  orderNbgRadarDimensions,
  type RadarDimension,
} from "../client/src/components/NbgRadarChart";

const completeDimensions: RadarDimension[] = [
  { key: "market", label: "市场与机会", score: 12 },
  { key: "competition", label: "竞争格局", score: 7.8 },
  { key: "business_model", label: "商业模式", score: 7.2 },
  { key: "capability", label: "内部能力", score: 7.6 },
  { key: "finance", label: "财务健康", score: -2 },
];

describe("NbgRadarChart", () => {
  it("orders report dimensions consistently and fills missing dimensions with null", () => {
    expect(
      orderNbgRadarDimensions([
        { key: "finance", label: "财务健康", score: 6.5 },
        { key: "market", label: "市场与机会", score: 8.4 },
      ])
    ).toEqual([
      { key: "market", label: "市场与机会", score: 8.4 },
      { key: "competition", label: "竞争格局", score: null },
      { key: "business_model", label: "商业模式", score: null },
      { key: "capability", label: "内部能力", score: null },
      { key: "finance", label: "财务健康", score: 6.5 },
    ]);
  });

  it("clamps finite scores to the zero-to-ten range", () => {
    expect(normalizeRadarScore(12)).toBe(10);
    expect(normalizeRadarScore(-2)).toBe(0);
    expect(normalizeRadarScore(6.4)).toBe(6.4);
    expect(normalizeRadarScore(Number.NaN)).toBeNull();
    expect(normalizeRadarScore(null)).toBeNull();
  });

  it("renders dynamic labels and a complete SVG score shape", () => {
    const markup = renderToStaticMarkup(
      createElement(NbgRadarChart, { dimensions: completeDimensions })
    );

    expect(markup).toContain('viewBox="0 0 240 210"');
    expect(markup).toContain("市场与机会");
    expect(markup).toContain("财务健康");
    expect(markup).toContain('class="nbg-radar-score-shape"');
    expect(markup).toContain("市场与机会：10.0 分");
    expect(markup).toContain("财务健康：0.0 分");
    expect(markup).not.toContain("NaN");
  });

  it("marks null scores as unavailable without drawing a misleading polygon", () => {
    const markup = renderToStaticMarkup(
      createElement(NbgRadarChart, {
        dimensions: completeDimensions.map(dimension =>
          dimension.key === "capability"
            ? { ...dimension, score: null }
            : dimension
        ),
      })
    );

    expect(markup).toContain("内部能力：暂无评分");
    expect(markup).toContain("—");
    expect(markup).not.toContain('class="nbg-radar-score-shape"');
    expect(markup).not.toContain("NaN");
  });
});
