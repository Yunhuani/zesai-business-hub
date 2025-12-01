import bcrypt from "bcryptjs";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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

  return user;
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

  return user;
}

/**
 * Register a new user with email and password
 */
export async function registerUserWithEmail(email: string, password: string, name?: string) {
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
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user;
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

  return user;
}
