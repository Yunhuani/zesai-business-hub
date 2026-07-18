import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const refundPolicy = "积分一经购买,不支持退款。";

function readClientSource(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("refund policy copy", () => {
  it("uses the same no-refund policy in Terms and Credits", () => {
    const terms = readClientSource("../client/src/pages/Terms.tsx");
    const credits = readClientSource("../client/src/pages/Credits.tsx");

    expect(terms).toContain(refundPolicy);
    expect(credits).toContain(refundPolicy);
  });

  it("does not advertise a seven-day refund policy in user-facing copy", () => {
    const userFacingSources = [
      readClientSource("../client/src/pages/Terms.tsx"),
      readClientSource("../client/src/pages/Credits.tsx"),
      readClientSource("../client/src/pages/ReferralCenter.tsx"),
      readClientSource("../client/src/components/referral/CommissionList.tsx"),
    ].join("\n");

    expect(userFacingSources).not.toMatch(/7\s*天[^\n<]{0,20}退款/);
    expect(userFacingSources).not.toContain("可申请退款");
    expect(userFacingSources).not.toContain("退款金额将扣除");
    expect(userFacingSources).not.toContain("暂不支持退款");
  });
});
