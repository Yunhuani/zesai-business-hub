#!/usr/bin/env node
import "dotenv/config";

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";

const TARGET_TAGS = [
  "0019_create_pricing_config",
  "0020_fix_credit_policy",
  "0021_add_diagnosis_billing",
];

const args = new Set(process.argv.slice(2));
const shouldApply = args.has("--apply");
const shouldRunMigrator = args.has("--verify-migrator");
const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "drizzle");

function readJournal() {
  const journalPath = path.join(migrationsDir, "meta", "_journal.json");
  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8"));

  return journal.entries.map((entry) => {
    const sqlPath = path.join(migrationsDir, `${entry.tag}.sql`);
    return {
      tag: entry.tag,
      when: Number(entry.when),
      sqlPath,
      hash: fs.existsSync(sqlPath)
        ? crypto.createHash("sha256").update(fs.readFileSync(sqlPath)).digest("hex")
        : null,
    };
  });
}

function requireMigration(journal, tag) {
  const migration = journal.find((entry) => entry.tag === tag);
  if (!migration || !migration.hash) {
    throw new Error(`Migration SQL not found for ${tag}`);
  }
  return migration;
}

async function tableExists(pool, tableName) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?",
    [tableName],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function columnExists(pool, tableName, columnName) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?",
    [tableName, columnName],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function indexExists(pool, tableName, indexName) {
  const [rows] = await pool.execute(
    "SELECT COUNT(*) AS count FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?",
    [tableName, indexName],
  );
  return Number(rows[0]?.count ?? 0) > 0;
}

async function assertBusinessSchemaAlreadyExists(pool) {
  const checks = [
    ["table", "pricingConfig", () => tableExists(pool, "pricingConfig")],
    ["index", "pricingConfig_configKey_unique", () =>
      indexExists(pool, "pricingConfig", "pricingConfig_configKey_unique")],
    ["column", "users.creditsSubscription", () =>
      columnExists(pool, "users", "creditsSubscription")],
    ["column", "users.trialCreditsGranted", () =>
      columnExists(pool, "users", "trialCreditsGranted")],
    ["column", "diagnoses.productType", () =>
      columnExists(pool, "diagnoses", "productType")],
    ["column", "diagnoses.fullCreditsDeducted", () =>
      columnExists(pool, "diagnoses", "fullCreditsDeducted")],
    ["column", "diagnoses.pdfPurchased", () =>
      columnExists(pool, "diagnoses", "pdfPurchased")],
    ["column", "diagnoses.pdfCreditsDeducted", () =>
      columnExists(pool, "diagnoses", "pdfCreditsDeducted")],
    ["column", "creditsTransactions.relatedDiagnosisId", () =>
      columnExists(pool, "creditsTransactions", "relatedDiagnosisId")],
    ["column", "creditsTransactions.billingKey", () =>
      columnExists(pool, "creditsTransactions", "billingKey")],
    ["index", "creditsTransactions_diagnosis_billing_unique", () =>
      indexExists(pool, "creditsTransactions", "creditsTransactions_diagnosis_billing_unique")],
  ];

  const missing = [];
  for (const [type, name, check] of checks) {
    if (!(await check())) {
      missing.push(`${type}:${name}`);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Refusing baseline because expected business schema is missing: ${missing.join(", ")}`,
    );
  }
}

async function ensureMetadataTable(pool) {
  await pool.execute(
    "CREATE TABLE IF NOT EXISTS `__drizzle_migrations` (`id` serial PRIMARY KEY, `hash` text NOT NULL, `created_at` bigint)",
  );
}

async function readMigrationRows(pool) {
  const [rows] = await pool.execute(
    "SELECT id, hash, created_at FROM `__drizzle_migrations` ORDER BY created_at ASC, id ASC",
  );
  return rows.map((row) => ({
    id: row.id,
    hash: row.hash,
    createdAt: Number(row.created_at),
  }));
}

function assertTargetedBaselineIsSafe(rows, journal) {
  const firstTarget = requireMigration(journal, TARGET_TAGS[0]);
  const previousMigration = journal
    .filter((entry) => entry.when < firstTarget.when)
    .toSorted((a, b) => b.when - a.when)[0];

  const hasPriorOrLaterHistory = rows.some(
    (row) => row.createdAt >= previousMigration.when,
  );

  if (!hasPriorOrLaterHistory) {
    throw new Error(
      `Refusing targeted baseline because migration history does not show ${previousMigration.tag} or any later migration.`,
    );
  }
}

async function baselineTargets(pool, targets) {
  const beforeRows = await readMigrationRows(pool);
  const rowsByWhen = new Map(beforeRows.map((row) => [row.createdAt, row]));
  const rowsByHash = new Map(beforeRows.map((row) => [row.hash, row]));
  const actions = [];

  for (const target of targets) {
    const existingByWhen = rowsByWhen.get(target.when);
    const existingByHash = rowsByHash.get(target.hash);

    if (existingByWhen && existingByWhen.hash !== target.hash) {
      throw new Error(
        `${target.tag} created_at=${target.when} already exists with a different hash.`,
      );
    }

    if (existingByHash && existingByHash.createdAt !== target.when) {
      throw new Error(
        `${target.tag} hash already exists with a different created_at=${existingByHash.createdAt}.`,
      );
    }

    if (existingByWhen || existingByHash) {
      actions.push({ tag: target.tag, action: "skip", when: target.when });
      continue;
    }

    actions.push({ tag: target.tag, action: shouldApply ? "insert" : "would-insert", when: target.when });
    if (shouldApply) {
      await pool.execute(
        "INSERT INTO `__drizzle_migrations` (`hash`, `created_at`) VALUES (?, ?)",
        [target.hash, target.when],
      );
    }
  }

  return actions;
}

function getPendingMigrations(journal, rows) {
  const lastCreatedAt = rows.reduce((max, row) => Math.max(max, row.createdAt), 0);
  return {
    lastCreatedAt,
    pending: journal.filter((entry) => entry.hash && entry.when > lastCreatedAt),
  };
}

function getMissingSqlFiles(journal) {
  return journal.filter((entry) => !entry.hash).map((entry) => entry.tag);
}

function printActions(actions) {
  for (const action of actions) {
    console.log(`${action.action}: ${action.tag} (${action.when})`);
  }
}

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  const journal = readJournal();
  const targets = TARGET_TAGS.map((tag) => requireMigration(journal, tag));
  const pool = mysql.createPool({
    uri: process.env.DATABASE_URL,
    waitForConnections: true,
    connectionLimit: 2,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true },
    connectTimeout: 20000,
  });

  try {
    await assertBusinessSchemaAlreadyExists(pool);
    await ensureMetadataTable(pool);

    const beforeRows = await readMigrationRows(pool);
    assertTargetedBaselineIsSafe(beforeRows, journal);

    const actions = await baselineTargets(pool, targets);
    printActions(actions);

    const afterRows = await readMigrationRows(pool);
    const missingTargets = targets.filter(
      (target) => !afterRows.some((row) => row.createdAt === target.when && row.hash === target.hash),
    );

    if (missingTargets.length > 0 && shouldApply) {
      throw new Error(
        `Missing target metadata records after baseline: ${missingTargets.map((target) => target.tag).join(", ")}`,
      );
    }

    const { lastCreatedAt, pending } = getPendingMigrations(journal, afterRows);
    console.log(`latest metadata created_at: ${lastCreatedAt}`);
    console.log(
      pending.length === 0
        ? "pending migrations after baseline: none"
        : `pending migrations after baseline: ${pending.map((entry) => entry.tag).join(", ")}`,
    );

    if (pending.length > 0 && shouldRunMigrator) {
      throw new Error("Refusing to run migrator because pending migrations remain.");
    }

    if (shouldRunMigrator) {
      const missingSqlFiles = getMissingSqlFiles(journal);
      if (missingSqlFiles.length > 0) {
        throw new Error(
          `Cannot run Drizzle migrator verification because _journal.json references missing SQL files: ${missingSqlFiles.join(", ")}`,
        );
      }

      console.log("running drizzle migrator verification...");
      await migrate(drizzle(pool), { migrationsFolder: migrationsDir });
      const afterMigratorRows = await readMigrationRows(pool);
      const afterMigratorPending = getPendingMigrations(journal, afterMigratorRows).pending;
      console.log(
        afterMigratorPending.length === 0
          ? "drizzle migrator verification: no pending migrations"
          : `drizzle migrator verification left pending: ${afterMigratorPending.map((entry) => entry.tag).join(", ")}`,
      );
    }

    if (!shouldApply) {
      console.log("dry-run only; pass --apply to insert missing metadata records.");
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
