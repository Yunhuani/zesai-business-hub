import { describe, it, expect, beforeAll } from "vitest";
import { registerUserWithEmail, loginUserWithEmail } from "./passwordAuth";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Email Password Authentication System", () => {
  const testEmail = `test${Date.now()}@example.com`;
  const testPassword = "testpassword123";
  const testName = "Test User";

  beforeAll(async () => {
    // Clean up any existing test user
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, testEmail));
    }
  });

  it("should register a new user with email and password", async () => {
    const user = await registerUserWithEmail(testEmail, testPassword, testName);
    
    expect(user).toBeTruthy();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe(testName);
    expect(user.openId).toBe(`email_${testEmail}`);
    expect(user.loginMethod).toBe("password");
    expect(user.password).toBeTruthy();
    expect(user.password).not.toBe(testPassword); // Should be hashed
  });

  it("should not allow duplicate email registration", async () => {
    await expect(async () => {
      await registerUserWithEmail(testEmail, testPassword, testName);
    }).rejects.toThrow("该邮箱已被注册");
  });

  it("should login with correct email and password", async () => {
    const user = await loginUserWithEmail(testEmail, testPassword);
    
    expect(user).toBeTruthy();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe(testName);
  });

  it("should reject login with wrong password", async () => {
    await expect(async () => {
      await loginUserWithEmail(testEmail, "wrongpassword");
    }).rejects.toThrow("邮箱或密码错误");
  });

  it("should reject login with non-existent email", async () => {
    await expect(async () => {
      await loginUserWithEmail("nonexistent@example.com", testPassword);
    }).rejects.toThrow("邮箱或密码错误");
  });

  it("should validate email format", () => {
    // Valid emails
    expect("test@example.com").toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect("user.name+tag@example.co.uk").toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    
    // Invalid emails
    expect("notanemail").not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect("@example.com").not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
    expect("test@").not.toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it("should use email prefix as default name when name not provided", async () => {
    const testEmail2 = `test${Date.now()}@example.com`;
    const user = await registerUserWithEmail(testEmail2, testPassword);
    
    expect(user.name).toBe(testEmail2.split('@')[0]);
    
    // Clean up
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, testEmail2));
    }
  });

  it("should create user with all required fields", async () => {
    const testEmail3 = `integration${Date.now()}@example.com`;
    const user = await registerUserWithEmail(testEmail3, "password123", "Integration Test");
    
    expect(user.id).toBeTruthy();
    expect(user.email).toBe(testEmail3);
    expect(user.password).toBeTruthy();
    expect(user.openId).toBe(`email_${testEmail3}`);
    expect(user.loginMethod).toBe("password");
    expect(user.role).toBe("user");
    expect(user.creditsPurchased).toBe(0);
    expect(user.creditsSubscription).toBe(100); // Free plan default
    expect(user.createdAt).toBeTruthy();
    expect(user.lastSignedIn).toBeTruthy();
    
    // Clean up
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.email, testEmail3));
    }
  });
});
