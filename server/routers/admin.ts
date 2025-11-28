import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { addPurchasedCredits, deductCredits } from "../creditsManager";

// Admin-only middleware
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "需要管理员权限",
    });
  }
  return next({ ctx });
});

export const adminRouter = router({
  listUsers: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "数据库连接失败",
      });
    }

    const allUsers = await db.select().from(users);
    return allUsers;
  }),

  adjustUserCredits: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        amount: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, amount, reason } = input;

      if (amount > 0) {
        // Add purchased credits
        await addPurchasedCredits(userId, amount);
      } else if (amount < 0) {
        // Deduct credits
        const result = await deductCredits(userId, Math.abs(amount), reason);
        if (!result.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "积分不足，无法扣除",
          });
        }
      }

      return {
        success: true,
      };
    }),
});
