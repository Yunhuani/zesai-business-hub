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
    expect(report.dimensions[0].judgment).toContain("外部市场情报");
    expect(report.dimensions[0].upgradeHook).toContain("竞争力自评数据");
  });
});
