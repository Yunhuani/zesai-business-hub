import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("report navigation labels", () => {
  it("uses the generic report label only in global navigation", () => {
    const navbarSource = readSource("../client/src/components/layout/Navbar.tsx");
    const diagnosesSource = readSource("../client/src/pages/MyDiagnoses.tsx");

    expect(navbarSource).toContain(
      '{ href: "/my-diagnoses", label: "我的报告", icon: ClipboardList }'
    );
    expect(diagnosesSource).toContain(
      '<h1 className="text-2xl font-bold">我的诊断</h1>'
    );
  });
});
