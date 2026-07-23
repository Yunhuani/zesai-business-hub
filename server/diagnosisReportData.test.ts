import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildDiagnosisReport } from "../client/src/pages/diagnosisReportData";

const diagnosis = {
  id: 60003,
  status: "done",
  intake: {
    company: {
      name: "甬辉卫浴五金",
    },
  },
  headline: "现金危机倒逼增长路径重构",
  overallScore: 3.6,
  scoreLabel: "警告",
  createdAt: "2026-06-22 08:43:01",
  result: {
    score_summary: {
      overall_score: 3.6,
      score_label: "警告",
    },
    dimension_outputs: [
      {
        dimension: "market",
        core_judgment: "市场核心判断",
        reasoning_chain: ["市场依据一", "市场依据二"],
        framework: ["MECE 机会拆解 + 波特行业分析"],
        score: { value: 4, label: "警告", rubric_basis: "市场评分依据" },
        degradation: {
          degraded: true,
          upgrade_hook: "补充市场数据可精确量化机会窗口。",
        },
      },
      {
        dimension: "finance",
        core_judgment: "现金跑道仅1.6个月。",
        reasoning_chain: ["现金余额400万，每月固定支出250万。"],
        score: { value: 3, label: "警告" },
        degradation: { degraded: false },
      },
    ],
    synthesis_output: {
      headline: "现金危机倒逼增长路径重构",
      overall_judgment: "短期生存与长期转型存在资源冲突。",
      three_key_findings: [
        {
          finding_id: "F08",
          title: "现金跑道仅1.6个月，生存级风险",
          why_surprising: "净利率无法掩盖现金流风险。",
        },
      ],
      transition_to_solution: "先稳住现金流，再验证欧洲市场机会。",
    },
  },
};

describe("buildDiagnosisReport", () => {
  it("uses structural-assessment wording for degraded report sections", () => {
    const source = readFileSync(
      new URL("../client/src/pages/DiagnosisReport.tsx", import.meta.url),
      "utf8"
    );

    expect(source).toContain("结构性判断口径");
    expect(source).toContain(
      "结论已基于当前可用信息形成;进入方案深化阶段后,可结合订单、渠道、对手与财务明细进一步量化优先级和投入强度。"
    );
    expect(source).not.toContain("基于现有信息提供方向性判断");
    expect(source).not.toContain("基于现有信息的方向性判断");
  });

  it("maps the real NBG result shape into report sections", () => {
    const report = buildDiagnosisReport(diagnosis);

    expect(report.companyName).toBe("甬辉卫浴五金");
    expect(report.headline).toBe("现金危机倒逼增长路径重构");
    expect(report.overallScore).toBe(3.6);
    expect(report.scoreLabel).toBe("警告");
    expect(report.overallJudgment).toBe("短期生存与长期转型存在资源冲突。");
    expect(report.dimensions).toHaveLength(2);
    expect(report.dimensions[0]).toMatchObject({
      key: "market",
      name: "市场与机会",
      score: 4,
      degraded: true,
      upgradeHook: "补充市场数据可精确量化机会窗口。",
    });
    expect(report.keyFindings[0].title).toBe("现金跑道仅1.6个月，生存级风险");
    expect(report.transitionToSolution).toBe("先稳住现金流，再验证欧洲市场机会。");
  });

  it("omits missing optional result fields without throwing", () => {
    const report = buildDiagnosisReport({
      id: 9,
      status: "done",
      intake: {},
      result: {},
      headline: null,
      overallScore: null,
      scoreLabel: null,
      createdAt: null,
    });

    expect(report.companyName).toBe("待确认公司");
    expect(report.headline).toBeNull();
    expect(report.overallScore).toBeNull();
    expect(report.dimensions).toEqual([]);
    expect(report.keyFindings).toEqual([]);
    expect(report.dataQuality).toBeNull();
  });

  it("maps complete data quality into customer-safe report data", () => {
    const report = buildDiagnosisReport({
      ...diagnosis,
      result: {
        ...diagnosis.result,
        data_quality: {
          overall_level: "limited",
          summary:
            "当前报告以结构性判断为主，部分维度可在方案深化阶段结合经营与市场数据进一步量化。",
          dimensions: [
            {
              dimension: "market",
              level: "limited",
              missing_plus: [],
              upgrade_hook: "补充市场规模和客户需求数据，可提高市场判断精度。",
            },
            {
              dimension: "competition",
              level: "partial",
              missing_plus: [
                "competition.self_scores",
                "competition.unknown_metric",
              ],
              upgrade_hook:
                "若补充self_scores和unique_assets数据，可进一步提高竞争判断精度。补充self_scores与unique_assets数据后，可更准确地提高竞争判断精度。",
            },
            {
              dimension: "business_model",
              level: "partial",
              missing_plus: ["business_model.revenue_mix"],
            },
            {
              dimension: "capability",
              level: "full",
              missing_plus: ["capability.digital_keyperson"],
            },
            {
              dimension: "finance",
              level: "limited",
              missing_plus: [
                "finance.product_lines",
                "finance.customers",
                "finance.ar",
                "finance.secret_metric",
              ],
              upgrade_hook: "若补充finance.secret_metric，可提高判断精度。",
            },
          ],
        },
      },
    });

    expect(report.dataQuality).toMatchObject({
      overallLevel: "limited",
      overallLabel: "信息有限",
      summary:
        "当前报告以结构性判断为主，部分维度可在方案深化阶段结合经营与市场数据进一步量化。",
    });
    expect(report.dataQuality?.dimensions).toHaveLength(5);
    expect(report.dataQuality?.dimensions[1]).toMatchObject({
      key: "competition",
      level: "partial",
      missingInformation: ["竞争力自评数据"],
    });
    expect(report.dataQuality?.dimensions[1].upgradeHook).toContain(
      "差异化资源与独特能力"
    );
    expect(
      report.dataQuality?.dimensions[1].upgradeHook?.match(/竞争判断精度/g)
    ).toHaveLength(1);
    expect(report.dataQuality?.dimensions[4]).toMatchObject({
      key: "finance",
      missingInformation: [
        "产品线收入与成本明细",
        "客户结构与集中度数据",
        "应收账款与账期",
      ],
      upgradeHook: null,
    });

    const visibleCopy = JSON.stringify(report.dataQuality);
    expect(visibleCopy).not.toMatch(
      /self_scores|unique_assets|unknown_metric|secret_metric|finance\.|competition\./
    );
  });

  it("handles partially missing data quality fields", () => {
    const report = buildDiagnosisReport({
      ...diagnosis,
      result: {
        ...diagnosis.result,
        data_quality: {
          overall_level: "partial",
          dimensions: [
            {
              dimension: "finance",
              missing_plus: ["finance.ar"],
            },
          ],
        },
      },
    });

    expect(report.dataQuality).toMatchObject({
      overallLevel: "partial",
      overallLabel: "部分完整",
      summary: null,
      dimensions: [
        {
          key: "finance",
          level: null,
          missingInformation: ["应收账款与账期"],
          upgradeHook: null,
        },
      ],
    });
  });

  it("removes internal field paths from customer-visible copy", () => {
    const report = buildDiagnosisReport({
      ...diagnosis,
      result: {
        ...diagnosis.result,
        dimension_outputs: [
          {
            ...diagnosis.result.dimension_outputs[0],
            core_judgment:
              "未提供 market_brief.market，且缺少 finance.product_lines。",
            degradation: {
              degraded: true,
              upgrade_hook:
                "补充 competition.self_scores 和 finance.customers 可精确量化。",
            },
          },
        ],
      },
    });

    const visibleCopy = JSON.stringify(report);
    expect(visibleCopy).not.toContain("market_brief.market");
    expect(visibleCopy).not.toContain("finance.product_lines");
    expect(visibleCopy).not.toContain("competition.self_scores");
    expect(visibleCopy).not.toContain("finance.customers");
    expect(report.dimensions[0].judgment).toContain(
      "市场判断采用结构性定性评估口径"
    );
    expect(report.dimensions[0].upgradeHook).toContain("竞争力自评数据");
  });

  it("removes hesitant and internal wording from customer-visible report data", () => {
    const report = buildDiagnosisReport({
      ...diagnosis,
      result: {
        ...diagnosis.result,
        dimension_outputs: [
          {
            ...diagnosis.result.dimension_outputs[0],
            core_judgment:
              "未提供 market_brief.market；未提供 market_brief.competition。",
            reasoning_chain: [
              "未检索到，留待补充。",
              "缺少 finance.product_lines 数据。",
              "该项待补充，并采用降级判断。",
            ],
            degradation: {
              degraded: true,
              upgrade_hook: "未提供渠道明细，缺少订单数据。",
            },
          },
        ],
        synthesis_output: {
          ...diagnosis.result.synthesis_output,
          overall_judgment: "缺少关键材料，结论留待补充。",
        },
      },
    });

    const visibleCopy = JSON.stringify(report);
    expect(visibleCopy).not.toMatch(
      /未提供|缺少|未检索到|留待补充|待补充|降级|market_brief|finance\./
    );
    expect(visibleCopy).toContain("市场判断采用结构性定性评估口径");
    expect(visibleCopy).toContain("竞争判断采用结构性定性评估口径");
    expect(visibleCopy).toContain("该部分可在方案深化阶段进一步量化");
    expect(visibleCopy).toContain("该项可在方案深化阶段进一步细化");
  });
});
