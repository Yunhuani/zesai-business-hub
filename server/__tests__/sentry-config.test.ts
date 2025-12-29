import { describe, it, expect } from "vitest";

/**
 * Sentry配置验证测试
 * 
 * 验证Sentry DSN是否正确配置
 */
describe("Sentry Configuration", () => {
  it("should have VITE_SENTRY_DSN configured", () => {
    const dsn = process.env.VITE_SENTRY_DSN;
    expect(dsn).toBeDefined();
    expect(dsn).toContain("@o4510616825823232.ingest.de.sentry.io");
  });

  it("should have SENTRY_DSN configured", () => {
    const dsn = process.env.SENTRY_DSN;
    expect(dsn).toBeDefined();
    expect(dsn).toContain("@o4510616825823232.ingest.de.sentry.io");
  });

  it("should have VITE_SENTRY_ENVIRONMENT configured", () => {
    const env = process.env.VITE_SENTRY_ENVIRONMENT;
    expect(env).toBeDefined();
    expect(env).toBe("production");
  });

  it("should have SENTRY_ENVIRONMENT configured", () => {
    const env = process.env.SENTRY_ENVIRONMENT;
    expect(env).toBeDefined();
    expect(env).toBe("production");
  });

  it("should have valid DSN format (frontend)", () => {
    const dsn = process.env.VITE_SENTRY_DSN;
    expect(dsn).toMatch(/^https:\/\/[a-f0-9]+@o\d+\.ingest\.de\.sentry\.io\/\d+$/);
  });

  it("should have valid DSN format (backend)", () => {
    const dsn = process.env.SENTRY_DSN;
    expect(dsn).toMatch(/^https:\/\/[a-f0-9]+@o\d+\.ingest\.de\.sentry\.io\/\d+$/);
  });
});
