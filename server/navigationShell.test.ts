import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  getAccountMenuLinks,
  PRIMARY_NAV_LINKS,
} from "../client/src/components/layout/navigationModel";

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("global navigation shell", () => {
  it("shows only the three core primary navigation links", () => {
    expect(PRIMARY_NAV_LINKS).toEqual([
      { href: "/", label: "首页" },
      { href: "/toolbox", label: "AI经营工具箱" },
      { href: "/pricing", label: "套餐" },
    ]);
  });

  it.each([
    ["logged out", null, false],
    ["regular user", "user", false],
    ["administrator", "admin", true],
  ] as const)(
    "%s admin visibility is %s",
    (_identity, role, expectedAdminVisibility) => {
      const links = getAccountMenuLinks(role);

      expect(links.some(link => link.href === "/admin")).toBe(
        expectedAdminVisibility
      );
    }
  );

  it("keeps account destinations in the avatar menu", () => {
    expect(getAccountMenuLinks("user").map(link => link.href)).toEqual([
      "/history",
      "/my-diagnoses",
    ]);
  });

  it("renders the shared header from the tested navigation model", () => {
    const navbarSource = readSource(
      "../client/src/components/layout/Navbar.tsx"
    );

    expect(navbarSource).toContain("PRIMARY_NAV_LINKS.map");
    expect(navbarSource).toContain("getAccountMenuLinks(user?.role)");
    expect(navbarSource).not.toContain('{ href: "/about", label: "关于" }');
    expect(navbarSource).not.toContain('user?.role === "admin"');
  });

  it("keeps credit details and the upgrade action in the credit popover", () => {
    const creditsSource = readSource(
      "../client/src/components/CreditsDisplay.tsx"
    );

    for (const copy of [
      "可用积分",
      "订阅积分",
      "购买积分",
      "升级套餐",
      'href="/pricing"',
    ]) {
      expect(creditsSource).toContain(copy);
    }
  });

  it("routes footer placeholders to dedicated transition pages", () => {
    const footerSource = readSource(
      "../client/src/components/layout/Footer.tsx"
    );
    const appSource = readSource("../client/src/App.tsx");
    const transitionSource = readSource("../client/src/pages/ComingSoon.tsx");

    expect(footerSource).toContain('{ href: "/methodology", label: "方法论" }');
    expect(footerSource).toContain('{ href: "/insights", label: "行业洞察" }');
    expect(footerSource).toContain('{ href: "/careers", label: "加入我们" }');
    expect(footerSource).not.toContain('label: "即将上线"');
    expect(footerSource).not.toContain('label: "客户案例"');

    for (const route of ["/methodology", "/insights", "/careers"]) {
      expect(appSource).toContain(`<Route path="${route}"`);
    }

    for (const copy of [
      "方法论",
      "行业洞察",
      "加入我们",
      "内容正在准备中，敬请期待",
    ]) {
      expect(transitionSource).toContain(copy);
    }
  });

  it("shows the ICP filing link in the middle of the footer legal row", () => {
    const footerSource = readSource(
      "../client/src/components/layout/Footer.tsx"
    );

    expect(footerSource).toContain("沪ICP备2024048847号-3");
    expect(footerSource).toContain('href="http://beian.miit.gov.cn/"');
    expect(footerSource).toContain('target="_blank"');
    expect(footerSource).toContain('rel="noopener"');
    expect(footerSource).toContain("md:grid-cols-3");
    expect(footerSource).toContain("md:justify-self-center");
  });

  it("preserves custom headers on diagnosis collection and report pages", () => {
    for (const path of [
      "../client/src/pages/Diagnosis.tsx",
      "../client/src/pages/DiagnosisConversation.tsx",
      "../client/src/pages/DiagnosisReport.tsx",
    ]) {
      const source = readSource(path);
      expect(source).toContain("<header");
      expect(source).not.toContain("AppHeader");
    }
  });
});
