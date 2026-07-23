import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

const termsSource = readSource("../client/src/pages/Terms.tsx");
const privacySource = readSource("../client/src/pages/Privacy.tsx");

describe("legal page presentation", () => {
  it("uses readable brand text colors on the light legal-page background", () => {
    for (const source of [termsSource, privacySource]) {
      expect(source).toContain("text-[var(--zs-ink)]");
      expect(source).toContain("text-[var(--zs-primary)]");
      expect(source).not.toContain("prose-invert");
      expect(source).not.toMatch(/text-(?:gray-[34]00|white)/);
    }
  });

  it("uses the forest-green, off-white, and gold palette for callouts", () => {
    const legalSource = `${termsSource}\n${privacySource}`;

    expect(legalSource).toContain("bg-[var(--zs-primary-soft)]");
    expect(legalSource).toContain("border-[rgba(201,162,75,.45)]");
    expect(legalSource).not.toMatch(
      /(?:bg|border|text)-(?:purple|blue|yellow|gray)-\d+/
    );
  });

  it("removes the privacy contact card without removing the legal section", () => {
    expect(privacySource).toContain("八、如何联系我们");
    expect(privacySource).toContain(
      "如您对本隐私政策或您个人信息的相关事宜有任何问题、意见或建议，请随时联系我们。"
    );
    expect(privacySource).not.toContain("邮箱：cs@zesiai.com");
    expect(privacySource).not.toContain(">联系方式</p>");
  });
});
