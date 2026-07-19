import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const authSurfacePaths = [
  "../client/src/pages/Login.tsx",
  "../client/src/pages/ForgotPassword.tsx",
  "../client/src/pages/ResetPassword.tsx",
  "../client/src/pages/WechatLogin.tsx",
  "../client/src/components/LoginMethodDialog.tsx",
];

function readSource(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("auth brand colors", () => {
  it("contains no legacy purple or purple-gradient color tokens", () => {
    const authSource = authSurfacePaths.map(readSource).join("\n");

    expect(authSource).not.toMatch(
      /(?:purple|violet|indigo|fuchsia|pink)-\d+(?:\/\d+)?|#8b5cf6/i
    );
  });
});
