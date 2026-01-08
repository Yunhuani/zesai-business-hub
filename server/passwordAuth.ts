import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";

const SALT_ROUNDS = 10;

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate JWT token for a user
 */
function generateToken(userId: number, openId: string): string {
  return jwt.sign(
    { userId, openId },
    ENV.jwtSecret,
    { expiresIn: "30d" }
  );
}

/**
 * Register a new user with username and password
 */
export async function registerUser(username: string, password: string, name?: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if username already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("用户名已存在");
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with username_prefix for openId
  const openId = `username_${username}`;
  
  await db.insert(users).values({
    openId,
    username,
    password: hashedPassword,
    name: name || username,
    loginMethod: "password",
    lastSignedIn: new Date(),
  });

  // Get the created user
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  // Generate JWT token
  const token = generateToken(user.id, user.openId || '');

  return { user, token };
}

/**
 * Login with username and password
 */
export async function loginUser(username: string, password: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Find user by username
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (!user) {
    throw new Error("用户名或密码错误");
  }

  if (!user.password) {
    throw new Error("该账号未设置密码，请使用其他登录方式");
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error("用户名或密码错误");
  }

  // Update last signed in
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  // Generate JWT token
  const token = generateToken(user.id, user.openId || '');

  return { user, token };
}

/**
 * Register a new user with email and password
 */
export async function registerUserWithEmail(
  email: string, 
  password: string, 
  name?: string,
  referralCode?: string
) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Check if email already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error("该邮箱已被注册");
  }

  // Validate referral code if provided
  let referrerId: number | null = null;
  if (referralCode) {
    const referrer = await db
      .select()
      .from(users)
      .where(eq(users.referralCode, referralCode))
      .limit(1);
    
    if (referrer.length > 0) {
      referrerId = referrer[0].id;
      console.log(`有效的推荐码: ${referralCode}, 推荐人ID: ${referrerId}`);
    } else {
      console.warn(`无效的推荐码: ${referralCode}`);
      // 不阻止注册，只是不发放奖励
    }
  }

  // Hash password
  const hashedPassword = await hashPassword(password);

  // Create user with email_prefix for openId
  const openId = `email_${email}`;
  
  await db.insert(users).values({
    openId,
    email,
    password: hashedPassword,
    name: name || email.split('@')[0], // Use email prefix as default name
    loginMethod: "password",
    lastSignedIn: new Date(),
  });

  // Get the created user
  const [newUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Handle referral rewards
  if (referrerId && newUser) {
    try {
      const { createReferralRelationship } = await import("./referralDb");
      await createReferralRelationship(referrerId, newUser.id, referralCode!);
      console.log(`推荐关系创建成功: 推荐人ID=${referrerId}, 新用户ID=${newUser.id}`);
    } catch (error) {
      console.error("创建推荐关系失败:", error);
      // 不阻止注册流程
    }
  }

  // Generate JWT token
  const token = generateToken(newUser.id, newUser.openId || '');

  return { user: newUser, token };
}

/**
 * Login with email and password
 */
export async function loginUserWithEmail(email: string, password: string) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Find user by email
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user) {
    throw new Error("邮箱或密码错误");
  }

  if (!user.password) {
    throw new Error("该账号未设置密码，请使用其他登录方式");
  }

  // Verify password
  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error("邮箱或密码错误");
  }

  // Update last signed in
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  // Generate JWT token
  const token = generateToken(user.id, user.openId || '');

  return { user, token };
}
