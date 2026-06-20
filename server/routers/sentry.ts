import { TRPCError } from "@trpc/server";
import { captureError, captureMessage } from "../_core/sentry";
import { protectedProcedure, router } from "../_core/trpc";

/**
 * Sentry测试接口
 * 用于验证Sentry错误监控是否正常工作
 */
export const sentryRouter = router({
  /**
   * 触发测试错误
   */
  testError: protectedProcedure.mutation(async ({ ctx }) => {
    // 只允许管理员触发测试
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "只有管理员可以触发Sentry测试",
      });
    }

    try {
      // 1. 记录测试消息
      captureMessage("Sentry测试消息：管理员手动触发测试", "info");

      // 2. 触发一个测试错误
      const testError = new Error("Sentry测试错误：这是一个手动触发的测试错误");
      captureError(testError, {
        triggeredBy: ctx.user.email,
        userId: ctx.user.id,
        timestamp: new Date().toISOString(),
      });

      // 3. 模拟一个真实的错误场景
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Sentry测试：模拟服务器内部错误",
        cause: testError,
      });
    } catch (error) {
      // 捕获错误并发送到Sentry
      if (error instanceof Error) {
        captureError(error, {
          context: "sentry_test",
          user: ctx.user.email,
        });
      }

      // 重新抛出错误，让前端知道测试已触发
      throw error;
    }
  }),

  /**
   * 触发成功的测试（不抛出错误，只记录消息）
   */
  testMessage: protectedProcedure.mutation(async ({ ctx }) => {
    // 只允许管理员触发测试
    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "只有管理员可以触发Sentry测试",
      });
    }

    // 记录测试消息
    captureMessage(
      `Sentry测试消息：由管理员 ${ctx.user.email} 触发`,
      "info"
    );

    return {
      success: true,
      message: "测试消息已发送到Sentry",
    };
  }),
});
