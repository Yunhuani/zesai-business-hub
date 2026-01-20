import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { sendSmsCode, generateCode } from "../lib/sms";
import { getDb } from "../db";
import { users, smsCodes } from "../../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import jwt from "jsonwebtoken";

// 内存存储发送频率限制
const sendLimits = new Map<string, { count: number; lastSent: number }>();

// 清理过期的限制记录
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(sendLimits.entries());
  for (const [key, value] of entries) {
    if (now - value.lastSent > 24 * 60 * 60 * 1000) {
      sendLimits.delete(key);
    }
  }
}, 60 * 60 * 1000);

export const phoneAuthRouter = router({
  /**
   * 发送验证码
   */
  sendCode: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        type: z.enum(["login", "register", "bind"]).default("login"),
      })
    )
    .mutation(async ({ input }: { input: { phone: string; type: "login" | "register" | "bind" } }) => {
      const { phone, type } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 检查发送频率限制
      const limit = sendLimits.get(phone);
      const now = Date.now();

      if (limit) {
        // 60秒内不能重复发送
        if (now - limit.lastSent < 60 * 1000) {
          const waitSeconds = Math.ceil((60 * 1000 - (now - limit.lastSent)) / 1000);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: `请${waitSeconds}秒后再试`,
          });
        }
        // 每天最多发送10次
        if (limit.count >= 10 && now - limit.lastSent < 24 * 60 * 60 * 1000) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "今日发送次数已达上限，请明天再试",
          });
        }
      }

      // 生成验证码
      const code = generateCode();
      const expiresAt = new Date(now + 5 * 60 * 1000); // 5分钟后过期

      // 发送短信
      const result = await sendSmsCode(phone, code);
      if (!result.success) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: result.message,
        });
      }

      // 保存验证码到数据库
      await db.insert(smsCodes).values({
        phone,
        code,
        type,
        expiresAt: expiresAt.toISOString().slice(0, 19).replace('T', ' '),
      });

      // 更新发送频率限制
      sendLimits.set(phone, {
        count: (limit?.count || 0) + 1,
        lastSent: now,
      });

      return { success: true, message: "验证码已发送" };
    }),

  /**
   * 手机验证码登录/注册
   */
  loginWithPhone: publicProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        code: z.string().length(6, "验证码为6位数字"),
      })
    )
    .mutation(async ({ input }: { input: { phone: string; code: string } }) => {
      const { phone, code } = input;
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 查找最新的未使用验证码
      const [smsCode] = await db
        .select()
        .from(smsCodes)
        .where(
          and(
            eq(smsCodes.phone, phone),
            eq(smsCodes.code, code),
            eq(smsCodes.used, 0)
          )
        )
        .orderBy(desc(smsCodes.createdAt))
        .limit(1);

      if (!smsCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "验证码错误或已过期",
        });
      }

      // 检查是否过期
      if (new Date() > new Date(smsCode.expiresAt)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "验证码已过期，请重新获取",
        });
      }

      // 标记验证码为已使用
      await db
        .update(smsCodes)
        .set({ used: 1 })
        .where(eq(smsCodes.id, smsCode.id));

      // 查找或创建用户
      let [user] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (!user) {
        // 新用户注册
        await db.insert(users).values({
          phone,
          name: `用户${phone.slice(-4)}`,
          loginMethod: "phone",
          role: "user",
          creditsPurchased: 0,
          creditsSubscription: 100, // 新用户赠送100积分
        });

        // 重新查询新创建的用户
        [user] = await db
          .select()
          .from(users)
          .where(eq(users.phone, phone))
          .limit(1);
      } else {
        // 更新最后登录时间
        await db
          .update(users)
          .set({ lastSignedIn: new Date().toISOString().slice(0, 19).replace('T', ' ') })
          .where(eq(users.id, user.id));
      }

      // 生成JWT token
      const token = jwt.sign(
        { userId: user.id, phone: user.phone },
        process.env.JWT_SECRET || "default-secret",
        { expiresIn: "7d" }
      );

      return {
        success: true,
        message: user ? "登录成功" : "注册成功",
        token,
        user: {
          id: user.id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * 绑定手机号（已登录用户）
   */
  bindPhone: protectedProcedure
    .input(
      z.object({
        phone: z.string().regex(/^1[3-9]\d{9}$/, "请输入正确的手机号"),
        code: z.string().length(6, "验证码为6位数字"),
      })
    )
    .mutation(async ({ input, ctx }: { input: { phone: string; code: string }; ctx: any }) => {
      const { phone, code } = input;
      const userId = ctx.user?.id;
      
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "请先登录" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "数据库连接失败" });

      // 检查手机号是否已被其他用户绑定
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.phone, phone))
        .limit(1);

      if (existingUser && existingUser.id !== userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "该手机号已被其他账号绑定",
        });
      }

      // 验证验证码
      const [smsCode] = await db
        .select()
        .from(smsCodes)
        .where(
          and(
            eq(smsCodes.phone, phone),
            eq(smsCodes.code, code),
            eq(smsCodes.used, 0),
            eq(smsCodes.type, "bind")
          )
        )
        .orderBy(desc(smsCodes.createdAt))
        .limit(1);

      if (!smsCode) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "验证码错误或已过期",
        });
      }

      // 检查是否过期
      if (new Date() > new Date(smsCode.expiresAt)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "验证码已过期，请重新获取",
        });
      }

      // 标记验证码为已使用
      await db
        .update(smsCodes)
        .set({ used: 1 })
        .where(eq(smsCodes.id, smsCode.id));

      // 更新用户手机号
      await db
        .update(users)
        .set({ phone })
        .where(eq(users.id, userId));

      return {
        success: true,
        message: "手机号绑定成功",
      };
    }),
});
