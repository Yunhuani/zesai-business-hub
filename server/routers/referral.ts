import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getOrCreateUserReferralCode,
  getReferralStats,
  getUserReferrals,
  getUserCommissions,
  createWithdrawal,
  getUserWithdrawals,
  getPendingWithdrawals,
  processWithdrawal,
} from "../referralDb";
import { TRPCError } from "@trpc/server";

export const referralRouter = router({
  /**
   * 获取我的邀请码
   */
  getMyCode: protectedProcedure.query(async ({ ctx }) => {
    const code = await getOrCreateUserReferralCode(ctx.user.id);
    const baseUrl = process.env.VITE_APP_URL || "https://zesiai.com";
    const url = `${baseUrl}?ref=${code}`;

    return {
      code,
      url,
    };
  }),

  /**
   * 获取我的推广数据统计
   */
  getMyStats: protectedProcedure.query(async ({ ctx }) => {
    const stats = await getReferralStats(ctx.user.id);
    return stats || {
      totalReferrals: 0,
      completedReferrals: 0,
      totalCommission: 0,
      pendingCommission: 0,
      confirmedCommission: 0,
      paidCommission: 0,
    };
  }),

  /**
   * 获取我推荐的用户列表
   */
  getMyReferrals: protectedProcedure.query(async ({ ctx }) => {
    const referrals = await getUserReferrals(ctx.user.id);
    return referrals.map((r) => ({
      id: r.id,
      refereeId: r.refereeId,
      refereeName: r.refereeName || "未知用户",
      refereeEmail: r.refereeEmail,
      status: r.status,
      createdAt: r.createdAt,
    }));
  }),

  /**
   * 获取我的佣金明细
   */
  getCommissions: protectedProcedure.query(async ({ ctx }) => {
    const commissions = await getUserCommissions(ctx.user.id);
    return commissions.map((c) => ({
      id: c.id,
      orderId: c.orderId,
      orderAmount: parseFloat(c.orderAmount.toString()),
      commissionAmount: parseFloat(c.commissionAmount.toString()),
      status: c.status,
      confirmedAt: c.confirmedAt,
      availableAt: c.availableAt,
      createdAt: c.createdAt,
      refereeName: c.refereeName || "未知用户",
    }));
  }),

  /**
   * 申请提现
   */
  requestWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(50, "最低提现金额为¥50"),
        bankName: z.string().min(1, "请选择银行"),
        bankBranch: z.string().min(1, "请填写开户行"),
        bankAccount: z.string().min(1, "请填写银行卡号"),
        realName: z.string().min(1, "请填写真实姓名"),
        idCard: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查用户可提现余额
      const stats = await getReferralStats(ctx.user.id);
      if (!stats || stats.confirmedCommission < input.amount) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "可提现余额不足",
        });
      }

      // 创建提现申请
      await createWithdrawal({
        userId: ctx.user.id,
        amount: input.amount,
        bankName: input.bankName,
        bankBranch: input.bankBranch,
        bankAccount: input.bankAccount,
        realName: input.realName,
        idCard: input.idCard,
      });

      return {
        success: true,
        message: "提现申请已提交，我们将在5个工作日内完成打款",
      };
    }),

  /**
   * 获取我的提现记录
   */
  getWithdrawals: protectedProcedure.query(async ({ ctx }) => {
    const withdrawals = await getUserWithdrawals(ctx.user.id);
    return withdrawals.map((w) => ({
      id: w.id,
      amount: parseFloat(w.amount.toString()),
      bankName: w.bankName,
      bankAccount: w.bankAccount,
      status: w.status,
      createdAt: w.createdAt,
      completedAt: w.completedAt,
    }));
  }),

  /**
   * 管理员：获取所有待处理的提现申请
   */
  admin: router({
    getPendingWithdrawals: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "仅管理员可访问",
        });
      }

      const withdrawals = await getPendingWithdrawals();
      return withdrawals.map((w) => ({
        id: w.id,
        userId: w.userId,
        userName: w.userName,
        userEmail: w.userEmail,
        amount: parseFloat(w.amount.toString()),
        bankName: w.bankName,
        bankBranch: w.bankBranch,
        bankAccount: w.bankAccount,
        realName: w.realName,
        idCard: w.idCard,
        status: w.status,
        createdAt: w.createdAt,
      }));
    }),

    /**
     * 管理员：处理提现申请
     */
    processWithdrawal: protectedProcedure
      .input(
        z.object({
          withdrawalId: z.number(),
          status: z.enum(["completed", "rejected"]),
          adminNote: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "仅管理员可访问",
          });
        }

        await processWithdrawal(input.withdrawalId, input.status, input.adminNote);

        return {
          success: true,
          message: `提现申请已${input.status === "completed" ? "通过" : "拒绝"}`,
        };
      }),
  }),
});
