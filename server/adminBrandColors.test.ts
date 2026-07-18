import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const adminSurfacePaths = [
  "../client/src/pages/Admin.tsx",
  "../client/src/pages/AdminAgents.tsx",
  "../client/src/pages/AdminAnalytics.tsx",
  "../client/src/pages/UserManagement.tsx",
  "../client/src/pages/OrderManagement.tsx",
  "../client/src/pages/admin/KnowledgeBase.tsx",
  "../client/src/components/AdjustCreditsDialog.tsx",
  "../client/src/components/UserDetailDialog.tsx",
];

const adminTitlePaths = [
  "../client/src/pages/Admin.tsx",
  "../client/src/pages/AdminAgents.tsx",
  "../client/src/pages/AdminAnalytics.tsx",
  "../client/src/pages/UserManagement.tsx",
  "../client/src/pages/admin/KnowledgeBase.tsx",
];

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("admin brand colors", () => {
  it("contains no legacy purple or purple-pink color tokens", () => {
    const adminSource = adminSurfacePaths.map(readSource).join("\n");

    expect(adminSource).not.toMatch(
      /(?:purple|violet|indigo|fuchsia|pink)-\d+(?:\/\d+)?|#8b5cf6/i
    );
  });

  it("uses the same brand-green title treatment on every styled admin title", () => {
    for (const path of adminTitlePaths) {
      const source = readSource(path);
      expect(source).toContain("text-[var(--zs-primary)]");
      expect(source).not.toContain("from-blue-600 to-purple-600");
    }
  });
});
