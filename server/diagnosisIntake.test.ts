import { describe, expect, it } from "vitest";
import { convertQuestionnaireAnswers } from "./diagnosisIntake";

const yonghuiAnswers = {
  "company.name": "甬辉卫浴五金",
  "company.industry_sub": "卫浴五金出口",
  "company.region": ["海外市场"],
  "company.revenue_band": "5000万–1亿",
  "company.revenue_trend": "基本持平",
  "company.headcount_band": "100–200人",
  "company.channels": ["渠道销售", "B端工程"],
  "company.top_anxiety": "大客户占比太高，利润越来越薄，不知道往哪转",
  "market.home_market": "北美为主",
  "market.expansion_intent": "想做欧洲和东南亚",
  "competition.competitors": "国内同类代工厂\n东南亚低价工厂",
  "competition.customer_values": ["价格", "认证", "交期"],
  "competition.unique_assets": "北美大客户多年工程渠道关系；UPC/cUPC认证",
  "business_model.revenue_sources": "卫浴龙头、淋浴五金的ODM代工",
  "business_model.how_earn_retain": "靠规模和稳定交期拿单，靠长期合作关系留客",
  "capability.team_structure.研发": "弱",
  "capability.team_structure.生产": "强",
  "capability.team_structure.销售": "中",
  "capability.team_structure.职能": "中",
  "capability.function_strength.product": "中",
  "capability.function_strength.supply_chain": "强",
  "capability.function_strength.channel": "弱",
  "capability.function_strength.marketing": "弱",
  "capability.function_strength.finance": "中",
  "finance_basic.net_margin_band": "5%–10%",
  "finance_basic.cost_structure": "原材料和人工为主，固定成本占比中等",
  "finance_basic.cash": "400",
  "finance_basic.monthly_fixed": "250",
};

describe("convertQuestionnaireAnswers", () => {
  it("maps the questionnaire into the NBG diagnosis_intake contract", () => {
    const intake = convertQuestionnaireAnswers(yonghuiAnswers, {});

    expect(intake.company).toMatchObject({
      name: "甬辉卫浴五金",
      industry_sub: "卫浴五金出口",
      region: "海外市场",
      revenue_band: "5000万-1亿",
      revenue_trend: "flat",
      headcount_band: "100-200人",
      channels: ["渠道销售", "B端工程"],
    });
    expect(intake.competition.customer_values).toEqual(["价格", "认证", "交期"]);
    expect(intake.competition.competitors).toEqual([
      "国内同类代工厂",
      "东南亚低价工厂",
    ]);
    expect(intake.competition.unique_assets).toEqual([
      "北美大客户多年工程渠道关系",
      "UPC/cUPC认证",
    ]);
    expect(intake.finance_basic).toMatchObject({
      net_margin_band: "5%-10%",
      cash: 400,
      monthly_fixed: 250,
    });
    expect(intake.availability_map).toEqual({
      plus_present: ["competition.unique_assets"],
      plus_missing: [
        "competition.self_scores",
        "business_model.revenue_mix",
        "capability.digital_keyperson",
        "finance.product_lines",
        "finance.customers",
        "finance.ar",
      ],
    });
  });

  it("passes omitted optional finance values as null and marks unique assets missing", () => {
    const answers = {
      ...yonghuiAnswers,
      "competition.unique_assets": "",
      "finance_basic.cash": "",
      "finance_basic.monthly_fixed": "",
    };

    const intake = convertQuestionnaireAnswers(answers, {});

    expect(intake.finance_basic.cash).toBeNull();
    expect(intake.finance_basic.monthly_fixed).toBeNull();
    expect(intake.competition.unique_assets).toBeNull();
    expect(intake.availability_map.plus_present).toEqual([]);
    expect(intake.availability_map.plus_missing).toContain(
      "competition.unique_assets"
    );
  });

  it("marks all uncollected plus fields missing when finance_plus and fixed plus fields are null", () => {
    const intake = convertQuestionnaireAnswers(yonghuiAnswers, {});

    expect(intake.finance_plus).toBeNull();
    expect(intake.business_model.revenue_mix).toBeNull();
    expect(intake.capability.digital_keyperson).toBeNull();

    expect(intake.availability_map.plus_missing).toEqual([
      "competition.self_scores",
      "business_model.revenue_mix",
      "capability.digital_keyperson",
      "finance.product_lines",
      "finance.customers",
      "finance.ar",
    ]);
    expect(intake.availability_map.plus_present).toEqual([
      "competition.unique_assets",
    ]);

    const allPlusFields = [
      ...intake.availability_map.plus_present,
      ...intake.availability_map.plus_missing,
    ];
    expect(new Set(allPlusFields).size).toBe(allPlusFields.length);
    expect(allPlusFields).toEqual(
      expect.arrayContaining([
        "competition.self_scores",
        "competition.unique_assets",
        "business_model.revenue_mix",
        "capability.digital_keyperson",
        "finance.product_lines",
        "finance.customers",
        "finance.ar",
      ])
    );
    expect(allPlusFields).toHaveLength(7);
  });

  it("maps finance_plus rows, filters empty rows, and marks collected fields present", () => {
    const intake = convertQuestionnaireAnswers(
      {
        ...yonghuiAnswers,
        "finance_plus.product_lines": [
          {
            name: "精密阀体",
            revenue: "3200",
            total_cost: "2400",
          },
          { name: "", revenue: "", total_cost: "" },
        ],
        "finance_plus.customers": [
          { name: "北美渠道A", pct: "38" },
          { name: "", pct: "" },
        ],
        "finance_plus.ar.balance": "860",
        "finance_plus.ar.days": "76",
      },
      {}
    );

    expect(intake.finance_plus).toEqual({
      product_lines: [
        { name: "精密阀体", revenue: 3200, total_cost: 2400 },
      ],
      customers: [{ name: "北美渠道A", pct: 38 }],
      ar: { balance: 860, days: 76 },
    });
    expect(intake.availability_map.plus_present).toEqual(
      expect.arrayContaining([
        "competition.unique_assets",
        "finance.product_lines",
        "finance.customers",
        "finance.ar",
      ])
    );
    expect(intake.availability_map.plus_missing).not.toContain("finance.product_lines");
    expect(intake.availability_map.plus_missing).not.toContain("finance.customers");
    expect(intake.availability_map.plus_missing).not.toContain("finance.ar");
  });

  it("sets finance_plus.ar to null when only one AR field is filled", () => {
    const intake = convertQuestionnaireAnswers(
      {
        ...yonghuiAnswers,
        "finance_plus.ar.balance": "860",
        "finance_plus.ar.days": "",
      },
      {}
    );

    expect(intake.finance_plus).toBeNull();
    expect(intake.availability_map.plus_missing).toContain("finance.ar");
  });

  it("merges free-text alternatives without losing preset answers", () => {
    const intake = convertQuestionnaireAnswers(yonghuiAnswers, {
      "company.region": "中东",
      "company.channels": "行业展会",
      "competition.customer_values": "定制能力",
      "team-structure": "研发由外部合作伙伴补充",
      "function-strength": "海外合规能力较弱",
    });

    expect(intake.company.region).toBe("海外市场、中东");
    expect(intake.company.channels).toEqual([
      "渠道销售",
      "B端工程",
      "行业展会",
    ]);
    expect(intake.competition.customer_values).toContain("定制能力");
    expect(intake.capability.team_structure["补充说明"]).toBe(
      "研发由外部合作伙伴补充"
    );
    expect(intake.capability.function_strength["补充说明"]).toBe(
      "海外合规能力较弱"
    );
  });

  it("rejects non-numeric optional finance values instead of guessing", () => {
    expect(() =>
      convertQuestionnaireAnswers(
        { ...yonghuiAnswers, "finance_basic.cash": "四百万" },
        {}
      )
    ).toThrow("账上现金必须是数字");
  });
});
