import nodemailer from "nodemailer";

// 验证码存储（生产环境应该用Redis）
const verificationCodes = new Map<string, { code: string; expiresAt: number; attempts: number }>();

// 频率限制存储
const rateLimits = new Map<string, { count: number; resetAt: number }>();

/**
 * 生成6位数字验证码
 */
export function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 检查频率限制
 * @param email 邮箱地址
 * @returns 是否允许发送
 */
export function checkRateLimit(email: string): { allowed: boolean; remainingSeconds?: number } {
  const now = Date.now();
  const limit = rateLimits.get(email);

  if (!limit || now > limit.resetAt) {
    // 重置或创建新的限制
    rateLimits.set(email, {
      count: 1,
      resetAt: now + 60 * 1000, // 60秒后重置
    });
    return { allowed: true };
  }

  if (limit.count >= 1) {
    const remainingSeconds = Math.ceil((limit.resetAt - now) / 1000);
    return { allowed: false, remainingSeconds };
  }

  limit.count++;
  return { allowed: true };
}

/**
 * 保存验证码
 * @param email 邮箱地址
 * @param code 验证码
 */
export function saveVerificationCode(email: string, code: string): void {
  verificationCodes.set(email, {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000, // 5分钟过期
    attempts: 0,
  });
}

/**
 * 验证验证码
 * @param email 邮箱地址
 * @param code 用户输入的验证码
 * @returns 验证结果
 */
export function verifyCode(email: string, code: string): { success: boolean; message?: string } {
  const stored = verificationCodes.get(email);

  if (!stored) {
    return { success: false, message: "验证码不存在或已过期" };
  }

  if (Date.now() > stored.expiresAt) {
    verificationCodes.delete(email);
    return { success: false, message: "验证码已过期" };
  }

  if (stored.attempts >= 3) {
    verificationCodes.delete(email);
    return { success: false, message: "验证码错误次数过多,请重新获取" };
  }

  if (stored.code !== code) {
    stored.attempts++;
    return { success: false, message: "验证码错误" };
  }

  // 验证成功,删除验证码
  verificationCodes.delete(email);
  return { success: true };
}

/**
 * 发送验证码邮件
 * @param email 收件人邮箱
 * @param code 验证码
 */
export async function sendVerificationEmail(email: string, code: string): Promise<void> {
  // 创建邮件传输器 - 使用QQ邮箱作为示例
  // 生产环境建议使用阿里云邮件推送服务
  const transporter = nodemailer.createTransport({
    host: "smtp.qq.com",
    port: 587,
    secure: false,
    auth: {
      // 这里需要配置SMTP账号,暂时使用环境变量
      user: process.env.SMTP_USER || "your-email@qq.com",
      pass: process.env.SMTP_PASS || "your-smtp-password",
    },
  });

  const mailOptions = {
    from: `"哲思AI商业智库" <${process.env.SMTP_USER || "your-email@qq.com"}>`,
    to: email,
    subject: "【哲思AI】登录验证码",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: white; border-radius: 8px; margin: 20px 0; letter-spacing: 8px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>哲思AI商业智库</h1>
            <p>您的AI商业顾问</p>
          </div>
          <div class="content">
            <p>您好！</p>
            <p>您正在登录<strong>哲思AI商业智库</strong>,您的验证码是:</p>
            <div class="code">${code}</div>
            <p style="color: #666;">验证码有效期为 <strong>5分钟</strong>,请尽快使用。</p>
            <p style="color: #999; font-size: 14px;">如果这不是您的操作,请忽略此邮件。</p>
          </div>
          <div class="footer">
            <p>© 2024 哲思AI商业智库 | 专业的AI商业咨询服务</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[Email] Verification code sent to ${email}`);
  } catch (error) {
    console.error(`[Email] Failed to send verification code to ${email}:`, error);
    throw new Error("发送验证码失败,请稍后重试");
  }
}

/**
 * 清理过期的验证码和限制记录（定时任务）
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();

  // 清理过期验证码
  const expiredCodes: string[] = [];
  verificationCodes.forEach((data, email) => {
    if (now > data.expiresAt) {
      expiredCodes.push(email);
    }
  });
  expiredCodes.forEach(email => verificationCodes.delete(email));

  // 清理过期的频率限制
  const expiredLimits: string[] = [];
  rateLimits.forEach((data, email) => {
    if (now > data.resetAt) {
      expiredLimits.push(email);
    }
  });
  expiredLimits.forEach(email => rateLimits.delete(email));
}

// 每分钟清理一次过期记录
setInterval(cleanupExpiredRecords, 60 * 1000);
