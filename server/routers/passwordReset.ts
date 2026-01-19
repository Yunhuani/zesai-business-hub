import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendEmail } from "../_core/email";

/**
 * 密码重置路由
 */
export const passwordResetRouter = router({
  /**
   * 请求密码重置 - 发送重置邮件
   */
  requestReset: publicProcedure
    .input(
      z.object({
        email: z.string().email("请输入有效的邮箱地址"),
      })
    )
    .mutation(async ({ input }) => {
      const { getUserByEmail, createPasswordResetToken } = await import("../db");
      
      // 查找用户
      const user = await getUserByEmail(input.email);
      
      // 安全考虑：即使用户不存在也返回成功，防止邮箱枚举攻击
      if (!user) {
        return { success: true, message: "如果该邮箱已注册，您将收到重置密码的邮件" };
      }
      
      // 生成随机token
      const token = crypto.randomBytes(32).toString("hex");
      
      // Token有效期30分钟
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 30);
      
      // 保存token到数据库
      await createPasswordResetToken({
        userId: user.id,
        token,
        expiresAt,
      });
      
      // 发送重置邮件
      const resetUrl = `https://www.zesiai.com/reset-password?token=${token}`;
      
      try {
        await sendEmail({
          to: input.email,
          subject: "重置您的泽思AI密码",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #2563eb;">重置密码</h2>
              <p>您好，</p>
              <p>我们收到了您的密码重置请求。请点击下面的按钮重置您的密码：</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" 
                   style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  重置密码
                </a>
              </div>
              <p style="color: #666; font-size: 14px;">
                如果按钮无法点击，请复制以下链接到浏览器：<br>
                <a href="${resetUrl}">${resetUrl}</a>
              </p>
              <p style="color: #666; font-size: 14px;">
                此链接将在30分钟后过期。如果您没有请求重置密码，请忽略此邮件。
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              <p style="color: #999; font-size: 12px;">
                泽思AI商业智库<br>
                www.zesiai.com
              </p>
            </div>
          `,
        });
      } catch (error) {
        console.error("[PasswordReset] Failed to send email:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "发送重置邮件失败，请稍后重试",
        });
      }
      
      return { success: true, message: "如果该邮箱已注册，您将收到重置密码的邮件" };
    }),

  /**
   * 验证重置token
   */
  verifyToken: publicProcedure
    .input(
      z.object({
        token: z.string(),
      })
    )
    .query(async ({ input }) => {
      const { getPasswordResetToken } = await import("../db");
      
      const resetToken = await getPasswordResetToken(input.token);
      
      if (!resetToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无效的重置链接",
        });
      }
      
      if (resetToken.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "此重置链接已被使用",
        });
      }
      
      if (new Date() > resetToken.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "重置链接已过期，请重新申请",
        });
      }
      
      return { valid: true };
    }),

  /**
   * 重置密码
   */
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string(),
        password: z.string().min(6, "密码至少6位").max(50),
      })
    )
    .mutation(async ({ input }) => {
      const { 
        getPasswordResetToken, 
        markTokenAsUsed, 
        updateUserPassword 
      } = await import("../db");
      
      // 验证token
      const resetToken = await getPasswordResetToken(input.token);
      
      if (!resetToken) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无效的重置链接",
        });
      }
      
      if (resetToken.used) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "此重置链接已被使用",
        });
      }
      
      if (new Date() > resetToken.expiresAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "重置链接已过期，请重新申请",
        });
      }
      
      // 密码强度校验
      const passwordChecks = [
        { regex: /.{8,}/, message: "密码至少8个字符" },
        { regex: /[A-Z]/, message: "密码需包含大写字母" },
        { regex: /[a-z]/, message: "密码需包含小写字母" },
        { regex: /[0-9]/, message: "密码需包含数字" },
        { regex: /[!@#$%^&*(),.?":{}|<>\[\]\\;'`~_+=-]/, message: "密码需包含特殊字符" },
      ];
      
      for (const check of passwordChecks) {
        if (!check.regex.test(input.password)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: check.message,
          });
        }
      }
      
      // 哈希新密码
      const passwordHash = await bcrypt.hash(input.password, 10);
      
      // 更新用户密码
      await updateUserPassword(resetToken.userId, passwordHash);
      
      // 标记token为已使用
      await markTokenAsUsed(input.token);
      
      return { success: true, message: "密码重置成功，请使用新密码登录" };
    }),
});
