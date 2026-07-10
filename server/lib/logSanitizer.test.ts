import { describe, expect, it } from "vitest";
import { sanitizeForLog, sanitizeLogString } from "./logSanitizer";

describe("logSanitizer", () => {
  it("redacts sensitive object fields and PII", () => {
    const sanitized = sanitizeForLog({
      id: 1,
      userId: 7,
      email: "owner@example.com",
      openId: "email_owner@example.com",
      phone: "13812345678",
      password: "$2b$10$abcdef",
      token: "eyJhbGciOiJIUzI1NiJ9.payload.signature",
      nested: {
        apiKey: "sk-live-secret",
        databaseUrl: "mysql://user:pass@example.com/db",
      },
    });

    expect(sanitized).toEqual({
      id: 1,
      userId: 7,
      email: "[REDACTED_PII]",
      openId: "[REDACTED_PII]",
      phone: "[REDACTED_PII]",
      password: "[REDACTED]",
      token: "[REDACTED]",
      nested: {
        apiKey: "[REDACTED]",
        databaseUrl: "[REDACTED]",
      },
    });
  });

  it("redacts sensitive values embedded in strings", () => {
    const sanitized = sanitizeLogString(
      "Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature owner@example.com 13812345678 mysql://u:p@db/prod"
    );

    expect(sanitized).toContain("Bearer [REDACTED_TOKEN]");
    expect(sanitized).toContain("[REDACTED_EMAIL]");
    expect(sanitized).toContain("[REDACTED_PHONE]");
    expect(sanitized).toContain("[REDACTED_DATABASE_URL]");
    expect(sanitized).not.toContain("owner@example.com");
    expect(sanitized).not.toContain("13812345678");
    expect(sanitized).not.toContain("mysql://u:p@db/prod");
  });
});
