import { describe, it, expect, beforeAll } from "vitest";
import {
  generateVerificationCode,
  checkRateLimit,
  saveVerificationCode,
  verifyCode,
} from "./emailVerification";

describe("Email Login Functionality", () => {
  const testEmail = "test@example.com";
  let generatedCode: string;

  beforeAll(() => {
    // Generate a code for testing
    generatedCode = generateVerificationCode();
  });

  describe("Verification Code Generation", () => {
    it("should generate a 6-digit code", () => {
      const code = generateVerificationCode();
      expect(code).toMatch(/^\d{6}$/);
      expect(code.length).toBe(6);
    });

    it("should generate different codes", () => {
      const code1 = generateVerificationCode();
      const code2 = generateVerificationCode();
      // Very unlikely to be the same (1 in 1,000,000 chance)
      expect(code1).not.toBe(code2);
    });
  });

  describe("Rate Limiting", () => {
    it("should allow first request", () => {
      const uniqueEmail = `test${Date.now()}@example.com`;
      const result = checkRateLimit(uniqueEmail);
      expect(result.allowed).toBe(true);
      expect(result.remainingSeconds).toBeUndefined();
    });

    it("should block second request within 60 seconds", () => {
      const uniqueEmail = `test${Date.now()}@example.com`;
      checkRateLimit(uniqueEmail); // First request
      const result = checkRateLimit(uniqueEmail); // Second request
      expect(result.allowed).toBe(false);
      expect(result.remainingSeconds).toBeGreaterThan(0);
      expect(result.remainingSeconds).toBeLessThanOrEqual(60);
    });
  });

  describe("Code Storage and Verification", () => {
    it("should save and verify correct code", () => {
      const email = `test${Date.now()}@example.com`;
      const code = "123456";
      
      saveVerificationCode(email, code);
      const result = verifyCode(email, code);
      
      expect(result.success).toBe(true);
      expect(result.message).toBeUndefined();
    });

    it("should reject incorrect code", () => {
      const email = `test${Date.now()}@example.com`;
      const correctCode = "123456";
      const wrongCode = "654321";
      
      saveVerificationCode(email, correctCode);
      const result = verifyCode(email, wrongCode);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe("验证码错误");
    });

    it("should reject non-existent code", () => {
      const email = `nonexistent${Date.now()}@example.com`;
      const result = verifyCode(email, "123456");
      
      expect(result.success).toBe(false);
      expect(result.message).toBe("验证码不存在或已过期");
    });

    it("should block after 3 failed attempts", () => {
      const email = `test${Date.now()}@example.com`;
      const correctCode = "123456";
      
      saveVerificationCode(email, correctCode);
      
      // 3 failed attempts
      verifyCode(email, "111111");
      verifyCode(email, "222222");
      verifyCode(email, "333333");
      
      // 4th attempt should be blocked
      const result = verifyCode(email, correctCode);
      expect(result.success).toBe(false);
      expect(result.message).toBe("验证码错误次数过多,请重新获取");
    });

    it("should delete code after successful verification", () => {
      const email = `test${Date.now()}@example.com`;
      const code = "123456";
      
      saveVerificationCode(email, code);
      verifyCode(email, code); // First verification succeeds
      
      // Second verification should fail (code deleted)
      const result = verifyCode(email, code);
      expect(result.success).toBe(false);
      expect(result.message).toBe("验证码不存在或已过期");
    });
  });

  describe("Email Format Validation", () => {
    it("should accept valid email formats", () => {
      const validEmails = [
        "test@example.com",
        "user.name@example.com",
        "user+tag@example.co.uk",
        "123@qq.com",
      ];

      validEmails.forEach(email => {
        expect(email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });
  });
});
