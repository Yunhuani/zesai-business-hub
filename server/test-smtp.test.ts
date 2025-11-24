import { describe, it, expect } from "vitest";
import nodemailer from "nodemailer";

describe("SMTP Configuration", () => {
  it("should have valid SMTP credentials", () => {
    expect(process.env.SMTP_USER).toBeDefined();
    expect(process.env.SMTP_PASS).toBeDefined();
    expect(process.env.SMTP_USER).toContain("@qq.com");
    expect(process.env.SMTP_PASS).toHaveLength(16);
  });

  it("should be able to create SMTP transporter", async () => {
    const transporter = nodemailer.createTransport({
      host: "smtp.qq.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Verify connection
    await expect(transporter.verify()).resolves.toBe(true);
  }, 10000); // 10 second timeout for network operation
});
