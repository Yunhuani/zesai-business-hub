import { describe, expect, it } from "vitest";
import {
  buildBusinessPlanPdfFileName,
  getBusinessPlanCompanyName,
} from "./businessPlanReportPdf";

describe("business plan PDF naming", () => {
  it("reads the company name from the project overview fields", () => {
    expect(
      getBusinessPlanCompanyName({
        project_overview: {
          fields: {
            company_name: {
              value: "示例公司",
              source_type: "client_provided",
            },
          },
        },
      })
    ).toBe("示例公司");
  });

  it("uses the business plan fallback filename when company name is absent", () => {
    expect(buildBusinessPlanPdfFileName(null, 42)).toBe("商业计划书-商业计划书-42.pdf");
  });
});
