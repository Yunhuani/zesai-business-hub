import nodemailer from "nodemailer";

/**
 * Send email using configured SMTP server
 */
export async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from?: string;
}): Promise<void> {
  // Create email transporter
  const transporter = nodemailer.createTransport({
    host: "smtp.exmail.qq.com",
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER || "your-email@qq.com",
      pass: process.env.SMTP_PASS || "your-smtp-password",
    },
  });

  const mailOptions = {
    from: options.from || `"泽思AI商业智库" <${process.env.SMTP_USER || "your-email@qq.com"}>`,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    throw new Error("Failed to send email");
  }
}
