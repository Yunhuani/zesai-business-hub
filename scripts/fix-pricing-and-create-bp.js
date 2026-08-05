import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env", quiet: true });

const DRY_RUN = process.argv.includes("--dry-run");
const EXPECTED_DATABASE = "zesai_prod";
const EXPECTED_PRICING_ROWS = 15;
const PRICING_UNIQUE_NAME = "pricingConfig_configKey_unique";

function decodeUrlPart(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseDatabaseUrl(raw) {
  const schemeEnd = raw.indexOf("://");
  const authEnd = raw.lastIndexOf("@");
  if (schemeEnd < 0 || authEnd < 0) {
    throw new Error("DATABASE_URL format is invalid");
  }

  const auth = raw.slice(schemeEnd + 3, authEnd);
  const separator = auth.indexOf(":");
  if (separator < 0) {
    throw new Error("DATABASE_URL credentials are invalid");
  }

  const user = decodeUrlPart(auth.slice(0, separator));
  const password = decodeUrlPart(auth.slice(separator + 1));
  const endpoint = new URL(
    `mysql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${raw.slice(authEnd + 1)}`
  );

  return {
    host: endpoint.hostname,
    port: endpoint.port ? Number(endpoint.port) : 3306,
    user,
    password,
    database: endpoint.pathname.replace(/^\//, ""),
  };
}

function heading(title) {
  console.log(`\n=== ${title} ===`);
}

function printRows(rows) {
  console.table(rows);
}

async function getPricingSummary(connection) {
  const [[counts]] = await connection.query(`
    SELECT
      COUNT(*) AS totalRows,
      COUNT(DISTINCT configKey) AS distinctKeys
    FROM pricingConfig
  `);
  const [keepers] = await connection.query(`
    SELECT p.id, p.configKey, p.credits
    FROM pricingConfig p
    INNER JOIN (
      SELECT configKey, MAX(id) AS maxId
      FROM pricingConfig
      GROUP BY configKey
    ) latest ON latest.maxId = p.id
    ORDER BY p.configKey
  `);
  return {
    totalRows: Number(counts.totalRows),
    distinctKeys: Number(counts.distinctKeys),
    duplicateRows: Number(counts.totalRows) - Number(counts.distinctKeys),
    keepers,
  };
}

async function findConfigKeyUniqueIndexes(connection) {
  const [rows] = await connection.query(`
    SELECT
      INDEX_NAME AS indexName,
      NON_UNIQUE AS nonUnique,
      GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS columnsInIndex
    FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'pricingConfig'
    GROUP BY INDEX_NAME, NON_UNIQUE
    HAVING NON_UNIQUE = 0
      AND columnsInIndex = 'configKey'
  `);
  return rows;
}

async function businessPlansExists(connection) {
  const [rows] = await connection.query(`
    SELECT TABLE_NAME
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'businessPlans'
  `);
  return rows.length === 1;
}

async function validateBusinessPlansStructure(connection) {
  const [columns] = await connection.query(`
    SELECT
      COLUMN_NAME AS columnName,
      COLUMN_TYPE AS columnType,
      IS_NULLABLE AS isNullable,
      COLUMN_DEFAULT AS columnDefault,
      EXTRA AS extra
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'businessPlans'
    ORDER BY ORDINAL_POSITION
  `);

  const expected = [
    ["id", "int", "NO", "auto_increment"],
    ["userId", "int", "NO", ""],
    ["engineJobId", "varchar(255)", "YES", ""],
    ["intake", "json", "NO", ""],
    ["status", "enum('pending','running','done','error')", "NO", ""],
    ["result", "json", "YES", ""],
    ["creditsDeducted", "int", "NO", ""],
    ["retryCount", "int", "NO", ""],
    ["errorMessage", "text", "YES", ""],
    ["createdAt", "timestamp", "NO", "DEFAULT_GENERATED"],
    ["updatedAt", "timestamp", "NO", "DEFAULT_GENERATED on update CURRENT_TIMESTAMP"],
  ];

  if (columns.length !== expected.length) {
    throw new Error(
      `businessPlans structure validation failed: expected ${expected.length} columns, found ${columns.length}`
    );
  }

  for (let index = 0; index < expected.length; index += 1) {
    const column = columns[index];
    const [name, type, nullable, requiredExtra] = expected[index];
    if (
      column.columnName !== name ||
      column.columnType.toLowerCase() !== type.toLowerCase() ||
      column.isNullable !== nullable ||
      (requiredExtra && !column.extra.includes(requiredExtra))
    ) {
      throw new Error(
        `businessPlans structure validation failed at ${name}: ${JSON.stringify(column)}`
      );
    }
  }

  const [primaryKey] = await connection.query(`
    SELECT COLUMN_NAME AS columnName
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'businessPlans'
      AND CONSTRAINT_NAME = 'PRIMARY'
    ORDER BY ORDINAL_POSITION
  `);
  if (primaryKey.length !== 1 || primaryKey[0].columnName !== "id") {
    throw new Error("businessPlans primary-key validation failed");
  }

  return columns;
}

async function stageOne(connection) {
  heading("Stage 1: deduplicate pricingConfig");
  const before = await getPricingSummary(connection);
  console.log("Rows that will be retained (latest id per configKey):");
  printRows(before.keepers.map(({ configKey, credits }) => ({ configKey, credits })));
  console.log({
    currentRows: before.totalRows,
    distinctKeys: before.distinctKeys,
    rowsToDelete: before.duplicateRows,
  });

  if (before.distinctKeys !== EXPECTED_PRICING_ROWS) {
    throw new Error(
      `Stage 1 aborted: expected ${EXPECTED_PRICING_ROWS} config keys, found ${before.distinctKeys}`
    );
  }

  if (DRY_RUN) {
    console.log(`[dry-run] Would delete ${before.duplicateRows} duplicate rows.`);
    console.log(`[dry-run] Expected row count after deletion: ${EXPECTED_PRICING_ROWS}.`);
    return;
  }

  await connection.beginTransaction();
  try {
    const [result] = await connection.query(`
      DELETE older
      FROM pricingConfig older
      INNER JOIN pricingConfig newer
        ON newer.configKey = older.configKey
       AND newer.id > older.id
    `);
    console.log(`Deleted ${result.affectedRows} duplicate rows.`);

    const after = await getPricingSummary(connection);
    if (
      after.totalRows !== EXPECTED_PRICING_ROWS ||
      after.distinctKeys !== EXPECTED_PRICING_ROWS ||
      after.duplicateRows !== 0
    ) {
      throw new Error(
        `Stage 1 validation failed: ${JSON.stringify({
          totalRows: after.totalRows,
          distinctKeys: after.distinctKeys,
          duplicateRows: after.duplicateRows,
        })}`
      );
    }
    await connection.commit();
    console.log("Stage 1 validation passed: pricingConfig contains exactly 15 unique rows.");
    printRows(after.keepers.map(({ configKey, credits }) => ({ configKey, credits })));
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function stageTwo(connection) {
  heading("Stage 2: add unique constraint to pricingConfig.configKey");
  const existing = await findConfigKeyUniqueIndexes(connection);
  if (existing.length > 0) {
    console.log("A single-column unique index on configKey already exists; ALTER will be skipped.");
    printRows(existing);
  } else {
    console.log(`Will add unique constraint ${PRICING_UNIQUE_NAME} on pricingConfig(configKey).`);
    if (!DRY_RUN) {
      await connection.query(`
        ALTER TABLE pricingConfig
        ADD CONSTRAINT pricingConfig_configKey_unique UNIQUE (configKey)
      `);
      console.log("Unique constraint DDL completed.");
    } else {
      console.log("[dry-run] ALTER TABLE will not be executed.");
    }
  }

  if (DRY_RUN) {
    console.log("[dry-run] Would verify a single-column unique index on configKey after DDL.");
    return;
  }

  const verified = await findConfigKeyUniqueIndexes(connection);
  if (verified.length === 0) {
    throw new Error("Stage 2 validation failed: configKey is not uniquely indexed");
  }
  console.log("Stage 2 validation passed: configKey uniqueness is enforced.");
  printRows(verified);
}

async function stageThree(connection) {
  heading("Stage 3: update action.business_plan price");
  const [before] = await connection.query(`
    SELECT id, configKey, credits
    FROM pricingConfig
    WHERE configKey = 'action.business_plan'
  `);
  console.log("Current BP pricing row:");
  printRows(before);
  if (before.length !== 1) {
    throw new Error(`Stage 3 aborted: expected one BP pricing row, found ${before.length}`);
  }
  console.log(`Will update credits from ${before[0].credits} to 1500 (affected rows: 1).`);

  if (DRY_RUN) {
    console.log("[dry-run] UPDATE will not be executed.");
    console.log("[dry-run] Expected final value: action.business_plan = 1500 credits.");
    return;
  }

  await connection.beginTransaction();
  try {
    const [result] = await connection.query(`
      UPDATE pricingConfig
      SET credits = 1500
      WHERE configKey = 'action.business_plan'
    `);
    console.log(`UPDATE matched ${result.affectedRows} row(s), changed ${result.changedRows} row(s).`);

    const [after] = await connection.query(`
      SELECT id, configKey, credits
      FROM pricingConfig
      WHERE configKey = 'action.business_plan'
    `);
    if (after.length !== 1 || Number(after[0].credits) !== 1500) {
      throw new Error(`Stage 3 validation failed: ${JSON.stringify(after)}`);
    }
    await connection.commit();
    console.log("Stage 3 validation passed:");
    printRows(after);
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

async function stageFour(connection) {
  heading("Stage 4: create businessPlans table");
  const existedBefore = await businessPlansExists(connection);
  console.log({
    tableExistsBefore: existedBefore,
    operation: existedBefore
      ? "CREATE TABLE IF NOT EXISTS will be a no-op"
      : "CREATE TABLE IF NOT EXISTS will create businessPlans",
  });

  if (DRY_RUN) {
    console.log("[dry-run] CREATE TABLE will not be executed.");
    if (existedBefore) {
      const columns = await validateBusinessPlansStructure(connection);
      console.log("[dry-run] Existing businessPlans structure already matches the expected schema:");
      printRows(columns);
    } else {
      console.log("[dry-run] Expected result: businessPlans exists with 11 columns and primary key id.");
    }
    return;
  }

  await connection.query(`
    CREATE TABLE IF NOT EXISTS businessPlans (
      id int AUTO_INCREMENT NOT NULL,
      userId int NOT NULL,
      engineJobId varchar(255),
      intake json NOT NULL,
      status enum('pending','running','done','error') NOT NULL DEFAULT 'pending',
      result json,
      creditsDeducted int NOT NULL DEFAULT 0,
      retryCount int NOT NULL DEFAULT 0,
      errorMessage text,
      createdAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT businessPlans_id PRIMARY KEY(id)
    )
  `);
  console.log("CREATE TABLE IF NOT EXISTS completed.");

  if (!(await businessPlansExists(connection))) {
    throw new Error("Stage 4 validation failed: businessPlans does not exist");
  }
  const columns = await validateBusinessPlansStructure(connection);
  const [[createTable]] = await connection.query("SHOW CREATE TABLE businessPlans");
  console.log("Stage 4 validation passed. Actual columns:");
  printRows(columns);
  console.log(createTable["Create Table"]);
}

async function main() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is required in .env");
  const config = parseDatabaseUrl(raw);
  if (config.database !== EXPECTED_DATABASE) {
    throw new Error(
      `Safety check failed: expected database ${EXPECTED_DATABASE}, got ${config.database || "<empty>"}`
    );
  }

  console.log(`Mode: ${DRY_RUN ? "DRY RUN (read-only)" : "EXECUTE"}`);
  console.log(`Target database: ${config.database}`);
  console.log("Credentials and host are intentionally not printed.");

  const connection = await mysql.createConnection({
    ...config,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: true } : undefined,
    connectTimeout: 10_000,
  });

  try {
    const [[selectedDatabase]] = await connection.query("SELECT DATABASE() AS databaseName");
    if (selectedDatabase.databaseName !== EXPECTED_DATABASE) {
      throw new Error(
        `Connected database safety check failed: ${selectedDatabase.databaseName}`
      );
    }
    await stageOne(connection);
    await stageTwo(connection);
    await stageThree(connection);
    await stageFour(connection);
    heading(DRY_RUN ? "Dry run complete" : "Repair complete");
    console.log(
      DRY_RUN
        ? "No write, DDL, or migration statement was executed."
        : "All four stages completed and passed their immediate validation checks."
    );
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  console.error("\nREPAIR ABORTED");
  console.error({
    name: error?.name,
    code: error?.code,
    errno: error?.errno,
    sqlState: error?.sqlState,
    message: error?.message ?? String(error),
  });
  process.exitCode = 1;
});
