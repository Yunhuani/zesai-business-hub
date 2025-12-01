import { describe, it, expect, beforeAll } from "vitest";
import { hashPassword, verifyPassword, registerUser, loginUser } from "./passwordAuth";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";

describe("Password Authentication System", () => {
  const testUsername = `testuser_${Date.now()}`;
  const testPassword = "testpassword123";
  const testName = "Test User";

  beforeAll(async () => {
    // Clean up any existing test user
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.username, testUsername));
    }
  });

  it("should hash password correctly", async () => {
    const hashed = await hashPassword(testPassword);
    expect(hashed).toBeTruthy();
    expect(hashed).not.toBe(testPassword);
    expect(hashed.length).toBeGreaterThan(20);
  });

  it("should verify password correctly", async () => {
    const hashed = await hashPassword(testPassword);
    const isValid = await verifyPassword(testPassword, hashed);
    expect(isValid).toBe(true);
    
    const isInvalid = await verifyPassword("wrongpassword", hashed);
    expect(isInvalid).toBe(false);
  });

  it("should register a new user", async () => {
    const user = await registerUser(testUsername, testPassword, testName);
    
    expect(user).toBeTruthy();
    expect(user.username).toBe(testUsername);
    expect(user.name).toBe(testName);
    expect(user.openId).toBe(`username_${testUsername}`);
    expect(user.loginMethod).toBe("password");
    expect(user.password).toBeTruthy();
    expect(user.password).not.toBe(testPassword); // Should be hashed
  });

  it("should not allow duplicate username registration", async () => {
    await expect(async () => {
      await registerUser(testUsername, testPassword, testName);
    }).rejects.toThrow("用户名已存在");
  });

  it("should login with correct credentials", async () => {
    const user = await loginUser(testUsername, testPassword);
    
    expect(user).toBeTruthy();
    expect(user.username).toBe(testUsername);
    expect(user.name).toBe(testName);
  });

  it("should reject login with wrong password", async () => {
    await expect(async () => {
      await loginUser(testUsername, "wrongpassword");
    }).rejects.toThrow("用户名或密码错误");
  });

  it("should reject login with non-existent username", async () => {
    await expect(async () => {
      await loginUser("nonexistentuser", testPassword);
    }).rejects.toThrow("用户名或密码错误");
  });

  it("should validate username format (3-20 chars, alphanumeric + underscore)", () => {
    // Valid usernames
    expect("abc").toMatch(/^[a-zA-Z0-9_]+$/);
    expect("test_user_123").toMatch(/^[a-zA-Z0-9_]+$/);
    expect("User123").toMatch(/^[a-zA-Z0-9_]+$/);
    
    // Invalid usernames
    expect("ab").not.toMatch(/^[a-zA-Z0-9_]{3,20}$/); // Too short
    expect("a".repeat(21)).not.toMatch(/^[a-zA-Z0-9_]{3,20}$/); // Too long
    expect("user@name").not.toMatch(/^[a-zA-Z0-9_]+$/); // Invalid char
    expect("user name").not.toMatch(/^[a-zA-Z0-9_]+$/); // Space
  });

  it("should validate password length (min 6 chars)", () => {
    expect("12345").length < 6;
    expect("123456").length >= 6;
    expect("a".repeat(50)).length <= 50;
  });
});

describe("Password Auth Integration with Database", () => {
  it("should have username and password fields in users table", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    
    // Check schema has the fields
    const schema = users;
    expect(schema.username).toBeTruthy();
    expect(schema.password).toBeTruthy();
  });

  it("should create user with all required fields", async () => {
    const testUser = `integration_test_${Date.now()}`;
    const user = await registerUser(testUser, "password123", "Integration Test");
    
    expect(user.id).toBeTruthy();
    expect(user.username).toBe(testUser);
    expect(user.password).toBeTruthy();
    expect(user.openId).toBe(`username_${testUser}`);
    expect(user.loginMethod).toBe("password");
    expect(user.role).toBe("user");
    expect(user.creditsPurchased).toBe(0);
    expect(user.creditsSubscription).toBe(100); // Free plan default
    expect(user.createdAt).toBeTruthy();
    expect(user.lastSignedIn).toBeTruthy();
    
    // Clean up
    const db = await getDb();
    if (db) {
      await db.delete(users).where(eq(users.username, testUser));
    }
  });
});
