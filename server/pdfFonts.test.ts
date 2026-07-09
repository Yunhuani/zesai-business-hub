import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(__dirname, "..");

function readProjectFile(path: string) {
  return readFileSync(resolve(root, path), "utf8");
}

describe("PDF font configuration", () => {
  it("self-hosts only the PDF-safe Noto Sans SC weights", () => {
    const css = readProjectFile("client/src/index.css");

    expect(css).not.toContain("fonts.googleapis.com");
    expect(css).not.toContain("fonts.gstatic.com");

    for (const weight of ["400", "500", "700"]) {
      expect(css).toContain("font-family: 'Noto Sans SC'");
      expect(css).toContain(`font-weight: ${weight}`);
      expect(css).toContain(`/fonts/noto-sans-sc-${weight}.woff2`);

      const fontPath = resolve(root, `client/public/fonts/noto-sans-sc-${weight}.woff2`);
      expect(existsSync(fontPath)).toBe(true);
      expect(statSync(fontPath).size).toBeGreaterThan(100_000);
      expect(statSync(fontPath).size).toBeLessThan(2_500_000);
    }
  });

  it("uses the self-hosted font family in diagnosis report print CSS", () => {
    const report = readProjectFile("client/src/pages/DiagnosisReport.tsx");

    expect(report).not.toContain("Microsoft YaHei");
    expect(report).not.toContain("PingFang SC");
    expect(report).toContain("font-family: 'Noto Sans SC', sans-serif !important;");
  });
});
