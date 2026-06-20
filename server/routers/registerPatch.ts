/**
 * 这个文件包含注册流程的修改代码
 * 需要集成到server/routers.ts中的registerWithEmail路由
 */

import { z } from "zod";
import { publicProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

export const registerWithEmailPatch = publicProcedure
  .input(
    z.object({
      email: z.string().email("请输入有效的邮箱地址"),
      password: z.string().min(6, "密码至少6位").max(50),
      name: z.string().optional(),
      referralCode: z.string().optional(), // 推荐码参数
    })
  )
  .mutation(async ({ input, ctx }) => {
    const { registerUserWithEmail } = await import("../passwordAuth");
    const { getUserByReferralCode, createReferral, addCredits } = await import("../referralDb");

    try {
      // 1. 注册用户
      const result = await registerUserWithEmail(input.email, input.password, input.name);

      if (!result || !result.user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "注册失败",
        });
      }

      // 2. 处理推荐关系
      if (input.referralCode) {
        try {
          const referrer = await getUserByReferralCode(input.referralCode);
          if (referrer) {
            // 创建推广关系
            await createReferral(referrer.id, result.user.id, input.referralCode);
            // 发放被推荐人积分（100积分）
            await addCredits(result.user.id, 100, "新人注册奖励");
            console.log(
              `[Referral] User ${result.user.id} registered via code ${input.referralCode}, referrer: ${referrer.id}`
            );
          }
        } catch (error) {
          console.error("[Referral] Error processing referral:", error);
          // 不中断注册流程，即使推荐处理失败
        }
      }

      // 返回结果
      return { success: true, user: result.user, token: result.token };
    } catch (error) {
      if (error instanceof Error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: error.message,
        });
      }
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "注册失败",
      });
    }
  });
