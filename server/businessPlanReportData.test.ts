import { describe, expect, it } from "vitest";
import {
  buildBusinessPlanReport,
  parseBusinessPlanNumber,
} from "../client/src/pages/businessPlanReportData";

const field = (value: unknown, source_type = "client_provided") => ({
  value,
  source_type,
  source_ref: null,
  message: null,
});

function recordFixture() {
  return {
    id: 1,
    status: "done",
    createdAt: "2026-08-05T02:30:00.000Z",
    result: {
      bp_title: "智造云商业计划书",
      executive_summary: null,
      project_overview: {
        module_id: 0,
        fields: {
          company_name: field("深圳智造云科技有限公司"),
          slogan: field("设备联网、数据驱动、让制造更聪明"),
          mission: field("待补充", "pending_customer"),
        },
      },
      demand: {
        module_id: 1,
        fields: {
          target_customer: field("面向中小制造企业,帮助管理者实时决策"),
          pain_points: field([
            "设备状态依赖人工记录,决策没有依据",
            "设备坏了才修,直接影响交期.",
          ]),
          why_now: field("待补充", "pending_customer"),
        },
      },
      product_model: {
        module_id: 2,
        fields: {
          business_model: field({
            net_margin: field("待补充", "pending_customer"),
          }),
        },
      },
      market: { module_id: 3, fields: {} },
      competition: { module_id: 4, fields: {} },
      current_state: { module_id: 5, fields: {} },
      plan: { module_id: 6, fields: {} },
      funding: { module_id: 7, fields: {} },
      team: { module_id: 8, fields: {} },
      pending_items: [
        { module_id: 0, field_name: "website", message: "请客户补充" },
        { module_id: 1, field_name: "why_now", message: "请客户补充" },
        {
          module_id: 2,
          field_name: "business_model.net_margin",
          message: "请客户补充",
        },
        { module_id: 3, field_name: "market_validation", message: "搜索产物" },
        {
          module_id: 4,
          field_name: "competitors[0].public_evidence",
          message: "搜索产物",
        },
      ],
      module_statuses: {
        1: { module_id: 1, status: "success", duration_seconds: 1 },
        4: {
          module_id: 4,
          status: "error",
          duration_seconds: 1,
          error_message: "search failed",
        },
      },
    },
  };
}

describe("buildBusinessPlanReport", () => {
  it("normalizes Chinese ten-thousand and hundred-million units for charts", () => {
    expect(parseBusinessPlanNumber("6500万")).toBe(6500);
    expect(parseBusinessPlanNumber("1.1亿")).toBe(11000);
    expect(parseBusinessPlanNumber("-800万")).toBe(-800);
    expect(parseBusinessPlanNumber("68%")).toBe(68);
  });

  it("builds only the eight body modules and uses overview only for the cover", () => {
    const report = buildBusinessPlanReport(recordFixture());

    expect(report.id).toBe(1);
    expect(report.cover).toEqual({
      companyName: "深圳智造云科技有限公司",
      slogan: "设备联网、数据驱动、让制造更聪明",
      date: "2026-08-05T02:30:00.000Z",
    });
    expect(report.modules.map(module => module.id)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8,
    ]);
    expect(JSON.stringify(report)).not.toContain("executive_summary");
  });

  it("unwraps FieldOutput values, retains sources, and normalizes body prose only", () => {
    const report = buildBusinessPlanReport(recordFixture());
    const demand = report.modules[0];

    expect(demand.fields.target_customer).toBe(
      "面向中小制造企业，帮助管理者实时决策。"
    );
    expect(demand.fields.pain_points).toEqual([
      "设备状态依赖人工记录，决策没有依据。",
      "设备坏了才修，直接影响交期。",
    ]);
    expect(demand.sources.target_customer).toBe("client_provided");
    expect(report.cover.slogan).toBe("设备联网、数据驱动、让制造更聪明");
  });

  it("filters search-only pending items but keeps customer-supplied gaps", () => {
    const report = buildBusinessPlanReport(recordFixture());

    expect(report.pendingItems.map(item => item.fieldName)).toEqual([
      "website",
      "why_now",
      "business_model.net_margin",
    ]);
    expect(report.modules[0].pendingItems[0].fieldName).toBe("why_now");
  });

  it("marks one failed module without affecting the other modules", () => {
    const report = buildBusinessPlanReport(recordFixture());

    expect(report.modules[3]).toMatchObject({ id: 4, status: "error" });
    expect(report.modules[0]).toMatchObject({ id: 1, status: "success" });
    expect(report.modules).toHaveLength(8);
  });
});
