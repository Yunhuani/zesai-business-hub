import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { users, subscriptions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
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

    // Get all users
    const allUsers = await db.select().from(users);
    
    // Get all active subscriptions
    const allSubscriptions = await db.select().from(subscriptions).where(eq(subscriptions.status, "active"));
    
    // Merge user data with subscription data
    const usersWithSubscriptions = allUsers.map(user => {
      const userSubscription = allSubscriptions.find(sub => sub.userId === user.id);
      return {
        ...user,
        subscription: userSubscription || null,
      };
    });
    
    return usersWithSubscriptions;
  }),

  adjustUserCredits: adminProcedure
    .input(
      z.object({
        userId: z.number(),
        amount: z.number().min(-10000, "单次最多扣附10000积分").max(10000, "单次最多增加10000积分"),
        reason: z.string().min(1, "请填写操作备注"),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, amount, reason } = input;

      // Validate amount is not zero
      if (amount === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "调整积分数量不能为0",
        });
      }

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
