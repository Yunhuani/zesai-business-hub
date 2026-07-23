import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";

type MigrationModule = typeof import("../migrate-legacy-customers");

async function loadMigrationModule(): Promise<MigrationModule | undefined> {
  try {
    return await import("../migrate-legacy-customers");
  } catch {
    return undefined;
  }
}

describe("legacy customer migration", () => {
  it("contains the five approved customers and their exact balances", async () => {
    const migration = await loadMigrationModule();
    expect(migration).toBeDefined();
    if (!migration) return;

    expect(migration.LEGACY_CUSTOMERS).toEqual([
      {
        name: "阳光飞侠",
        email: "13928381018@139.com",
        plan: "enterprise",
        credits: 11000,
        endDateUtc: "2026-08-11 15:59:59",
        status: "active",
      },
      {
        name: "清秋如梦",
        email: "qingqiushi@126.com",
        plan: "basic",
        credits: 270,
        endDateUtc: "2026-08-05 15:59:59",
        status: "active",
      },
      {
        name: "lily",
        email: "wuyanxi0824@icloud.com",
        plan: "basic",
        credits: 730,
        endDateUtc: "2026-08-02 15:59:59",
        status: "active",
      },
      {
        name: "不听劝的左腿",
        email: "nametie@163.com",
        plan: "basic",
        credits: 440,
        endDateUtc: "2026-07-22 15:59:59",
        status: "expired",
      },
      {
        name: "shawnstockman",
        email: "386669895@qq.com",
        plan: "professional",
        credits: 2300,
        endDateUtc: "2026-07-22 15:59:59",
        status: "expired",
      },
    ]);
  });

  it("normalizes openId and generates a separately salted bcrypt hash", async () => {
    const migration = await loadMigrationModule();
    expect(migration).toBeDefined();
    if (!migration) return;

    expect(migration.buildOpenId("Customer@Example.COM")).toBe(
      "email_customer@example.com"
    );

    const password = "Strong@Test2026";
    const hashes = await Promise.all(
      migration.LEGACY_CUSTOMERS.map(() =>
        migration.hashInitialPassword(password)
      )
    );

    expect(new Set(hashes).size).toBe(5);
    for (const hash of hashes) {
      expect(hash).toMatch(/^\$2[aby]\$10\$/);
      await expect(bcrypt.compare(password, hash)).resolves.toBe(true);
    }
  });

  it("refuses execution without both explicit confirmation and a password", async () => {
    const migration = await loadMigrationModule();
    expect(migration).toBeDefined();
    if (!migration) return;

    expect(() => migration.readExecutionConfig({})).toThrow(
      "LEGACY_CUSTOMER_MIGRATION_CONFIRM"
    );
    expect(() =>
      migration.readExecutionConfig({
        LEGACY_CUSTOMER_MIGRATION_CONFIRM: "RUN",
      })
    ).toThrow("LEGACY_CUSTOMER_INITIAL_PASSWORD");

    expect(
      migration.readExecutionConfig({
        DATABASE_URL: "mysql://example.invalid/database",
        DATABASE_SSL: "true",
        LEGACY_CUSTOMER_MIGRATION_CONFIRM: "RUN",
        LEGACY_CUSTOMER_INITIAL_PASSWORD: "Strong@Test2026",
      })
    ).toEqual({
      databaseUrl: "mysql://example.invalid/database",
      databaseSsl: true,
      initialPassword: "Strong@Test2026",
    });
  });

  it("keeps the migration transactional, idempotent, and free of the real password", () => {
    const source = readFileSync(
      new URL("../migrate-legacy-customers.ts", import.meta.url),
      "utf8"
    );

    expect(source).not.toContain("Zesai@2026");
    expect(source).toContain("Asia/Shanghai");
    expect(source).not.toContain("Asia/Taipei");
    expect(source).toContain("LEGACY_CUSTOMER_INITIAL_PASSWORD");
    expect(source).toContain("GET_LOCK");
    expect(source).toContain("beginTransaction");
    expect(source).toContain("rollback");
    expect(source).toMatch(/\\`email\\` = \? OR \\`openId\\` = \?/);
    expect(source).toContain("INSERT INTO \\`users\\`");
    expect(source).toContain("INSERT INTO \\`subscriptions\\`");
    expect(source).toContain("INSERT INTO \\`creditsTransactions\\`");
    expect(source).toContain('"purchase"');
    expect(source).toContain("老客户迁移");
  });
});
