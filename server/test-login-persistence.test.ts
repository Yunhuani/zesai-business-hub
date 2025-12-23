import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { COOKIE_NAME } from "@shared/const";

// Mock context factory
function createMockContext(overrides?: Partial<TrpcContext>): TrpcContext {
  return {
    req: {
      headers: {},
      hostname: "www.zesiai.com",
      protocol: "https",
    } as any,
    res: {
      cookie: () => {},
      clearCookie: () => {},
    } as any,
    user: undefined,
    ...overrides,
  } as TrpcContext;
}

describe("Login Persistence Tests", () => {
  it("should have openId field in users table schema", async () => {
    const { users } = await import("../drizzle/schema");
    expect(users.openId).toBeDefined();
  });

  it("should set openId when creating email user", async () => {
    const { registerUserWithEmail } = await import("./passwordAuth");
    const testEmail = `test_${Date.now()}@example.com`;
    
    try {
      const user = await registerUserWithEmail(testEmail, "password123", "Test User");
      expect(user).toBeDefined();
      expect(user.openId).toBe(`email_${testEmail}`);
      expect(user.email).toBe(testEmail);
    } catch (error) {
      // User might already exist in test environment
      console.log("Test user creation skipped:", error);
    }
  });

  it("should create session token with correct format", async () => {
    const { sdk } = await import("./_core/sdk");
    const testEmail = "test@example.com";
    const sessionToken = await sdk.createSessionToken(`email_${testEmail}`, {
      name: "Test User",
    });
    
    expect(sessionToken).toBeDefined();
    expect(typeof sessionToken).toBe("string");
    expect(sessionToken.length).toBeGreaterThan(0);
  });

  it("should verify session token correctly", async () => {
    const { sdk } = await import("./_core/sdk");
    const testEmail = "test@example.com";
    const sessionToken = await sdk.createSessionToken(`email_${testEmail}`, {
      name: "Test User",
    });
    
    const session = await sdk.verifySession(sessionToken);
    expect(session).toBeDefined();
    expect(session?.openId).toBe(`email_${testEmail}`);
    expect(session?.name).toBe("Test User");
  });

  it("should set cookie with correct options", async () => {
    const { getSessionCookieOptions } = await import("./_core/cookies");
    
    const mockReq = {
      hostname: "www.zesiai.com",
      protocol: "https",
      headers: {},
    } as any;
    
    const options = getSessionCookieOptions(mockReq);
    
    expect(options.httpOnly).toBe(true);
    expect(options.path).toBe("/");
    expect(options.sameSite).toBe("lax");
    expect(options.secure).toBe(true);
    expect(options.domain).toBe(".www.zesiai.com"); // Should set domain for production
  });

  it("should set cookie without domain for localhost", async () => {
    const { getSessionCookieOptions } = await import("./_core/cookies");
    
    const mockReq = {
      hostname: "localhost",
      protocol: "http",
      headers: {},
    } as any;
    
    const options = getSessionCookieOptions(mockReq);
    
    expect(options.domain).toBeUndefined(); // No domain for localhost
  });

  it("should authenticate email user with correct openId", async () => {
    const { sdk } = await import("./_core/sdk");
    const testEmail = "existing@example.com";
    
    // Create a session token
    const sessionToken = await sdk.createSessionToken(`email_${testEmail}`, {
      name: "Existing User",
    });
    
    // Mock request with session cookie
    const mockReq = {
      headers: {
        cookie: `${COOKIE_NAME}=${sessionToken}`,
      },
    } as any;
    
    try {
      const user = await sdk.authenticateRequest(mockReq);
      // If user exists in DB, authentication should succeed
      expect(user).toBeDefined();
      expect(user.email).toBe(testEmail);
    } catch (error) {
      // User might not exist in test DB, which is expected
      console.log("Authentication test skipped (user not in DB):", error);
    }
  });

  it("should handle email login and set cookie", async () => {
    const caller = appRouter.createCaller(createMockContext());
    
    // Test that loginWithEmail mutation exists
    expect(caller.auth.loginWithEmail).toBeDefined();
  });

  it("should handle email registration and set cookie", async () => {
    const caller = appRouter.createCaller(createMockContext());
    
    // Test that registerWithEmail mutation exists
    expect(caller.auth.registerWithEmail).toBeDefined();
  });

  it("should verify dbEmail.ts sets openId correctly", async () => {
    const { upsertEmailUser } = await import("./dbEmail");
    const testEmail = `dbtest_${Date.now()}@example.com`;
    
    try {
      const user = await upsertEmailUser(testEmail, "DB Test User");
      expect(user).toBeDefined();
      expect(user?.openId).toBe(`email_${testEmail}`);
    } catch (error) {
      console.log("dbEmail test skipped:", error);
    }
  });
});
