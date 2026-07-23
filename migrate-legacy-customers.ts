import "dotenv/config";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import bcrypt from "bcryptjs";
import mysql, {
  type Connection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";

type SubscriptionPlan = "basic" | "professional" | "enterprise";
type SubscriptionStatus = "active" | "expired";

type LegacyCustomer = {
  name: string;
  email: string;
  plan: SubscriptionPlan;
  credits: number;
  endDateUtc: string;
  status: SubscriptionStatus;
};

type ExecutionConfig = {
  databaseUrl: string;
  databaseSsl: boolean;
  initialPassword: string;
};

type ExistingUserRow = RowDataPacket & {
  id: number;
  email: string | null;
  openId: string | null;
};

type AdvisoryLockRow = RowDataPacket & {
  acquired: number | null;
};

const SALT_ROUNDS = 10;
const MIGRATION_CONFIRMATION = "RUN";
const ADVISORY_LOCK_NAME = "zesai:legacy-customer-migration:2026-07";
const INITIAL_CREDIT_DESCRIPTION = "老客户迁移初始化积分";

// 到期日按 Asia/Shanghai 当天 23:59:59 计算，并转换为 UTC 写入。
export const LEGACY_CUSTOMERS: readonly LegacyCustomer[] = [
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
];

export function buildOpenId(email: string): string {
  return `email_${email.trim().toLowerCase()}`;
}

export async function hashInitialPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export function readExecutionConfig(
  env: Record<string, string | undefined>
): ExecutionConfig {
  if (
    env.LEGACY_CUSTOMER_MIGRATION_CONFIRM !== MIGRATION_CONFIRMATION
  ) {
    throw new Error(
      `LEGACY_CUSTOMER_MIGRATION_CONFIRM must equal ${MIGRATION_CONFIRMATION}`
    );
  }

  const initialPassword = env.LEGACY_CUSTOMER_INITIAL_PASSWORD;
  if (!initialPassword) {
    throw new Error("LEGACY_CUSTOMER_INITIAL_PASSWORD is required");
  }

  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  return {
    databaseUrl,
    databaseSsl: env.DATABASE_SSL !== "false",
    initialPassword,
  };
}

async function migrateCustomer(
  connection: Connection,
  customer: LegacyCustomer,
  initialPassword: string
): Promise<"created" | "skipped"> {
  const email = customer.email.trim().toLowerCase();
  const openId = buildOpenId(email);

  await connection.beginTransaction();
  try {
    const [existingUsers] = await connection.execute<ExistingUserRow[]>(
      `SELECT \`id\`, \`email\`, \`openId\`
       FROM \`users\`
       WHERE \`email\` = ? OR \`openId\` = ?
       LIMIT 1
       FOR UPDATE`,
      [email, openId]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return "skipped";
    }

    // This call is deliberately inside the per-customer branch so every newly
    // created account receives its own bcrypt salt and skipped users do no work.
    const passwordHash = await hashInitialPassword(initialPassword);

    const [userInsert] = await connection.execute<ResultSetHeader>(
      `INSERT INTO \`users\`
        (
          \`openId\`,
          \`email\`,
          \`name\`,
          \`password\`,
          \`loginMethod\`,
          \`role\`,
          \`creditsPurchased\`,
          \`creditsSubscription\`,
          \`trialCreditsGranted\`,
          \`creditsResetDate\`
        )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        openId,
        email,
        customer.name,
        passwordHash,
        "password",
        "user",
        customer.credits,
        0,
        1,
        customer.endDateUtc,
      ]
    );

    const userId = userInsert.insertId;

    await connection.execute<ResultSetHeader>(
      `INSERT INTO \`subscriptions\`
        (
          \`userId\`,
          \`plan\`,
          \`monthlyLimit\`,
          \`price\`,
          \`status\`,
          \`startDate\`,
          \`endDate\`
        )
       VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [
        userId,
        customer.plan,
        0,
        0,
        customer.status,
        customer.endDateUtc,
      ]
    );

    await connection.execute<ResultSetHeader>(
      `INSERT INTO \`creditsTransactions\`
        (
          \`userId\`,
          \`type\`,
          \`amount\`,
          \`balancePurchased\`,
          \`balanceSubscription\`,
          \`description\`,
          \`idempotencyKey\`
        )
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        "purchase",
        customer.credits,
        customer.credits,
        0,
        INITIAL_CREDIT_DESCRIPTION,
        `legacy-customer:${email}:purchase`,
      ]
    );

    await connection.commit();
    return "created";
  } catch (error) {
    await connection.rollback();
    throw error;
  }
}

export async function runLegacyCustomerMigration(
  env: Record<string, string | undefined> = process.env
): Promise<void> {
  const config = readExecutionConfig(env);
  const connection = await mysql.createConnection({
    uri: config.databaseUrl,
    ssl: config.databaseSsl
      ? {
          minVersion: "TLSv1.2",
          rejectUnauthorized: true,
        }
      : undefined,
  });

  let lockAcquired = false;
  try {
    await connection.query("SET time_zone = '+00:00'");

    const [lockRows] = await connection.execute<AdvisoryLockRow[]>(
      "SELECT GET_LOCK(?, 10) AS acquired",
      [ADVISORY_LOCK_NAME]
    );
    lockAcquired = lockRows[0]?.acquired === 1;
    if (!lockAcquired) {
      throw new Error("Could not acquire legacy customer migration lock");
    }

    let created = 0;
    let skipped = 0;

    for (const customer of LEGACY_CUSTOMERS) {
      const result = await migrateCustomer(
        connection,
        customer,
        config.initialPassword
      );

      if (result === "created") {
        created += 1;
        console.log(`[created] ${customer.name} <${customer.email}>`);
      } else {
        skipped += 1;
        console.log(
          `[skipped] ${customer.name} <${customer.email}> already exists`
        );
      }
    }

    console.log(
      `Legacy customer migration finished: created=${created}, skipped=${skipped}`
    );
  } finally {
    try {
      if (lockAcquired) {
        await connection.execute("SELECT RELEASE_LOCK(?)", [
          ADVISORY_LOCK_NAME,
        ]);
      }
    } finally {
      await connection.end();
    }
  }
}

function isDirectExecution(): boolean {
  const entryPath = process.argv[1];
  return Boolean(
    entryPath &&
      import.meta.url === pathToFileURL(resolve(entryPath)).href
  );
}

if (isDirectExecution()) {
  runLegacyCustomerMigration().catch(error => {
    console.error("Legacy customer migration failed:", error);
    process.exitCode = 1;
  });
}
