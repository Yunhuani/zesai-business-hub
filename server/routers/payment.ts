import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createAlipayPagePayment, queryAlipayOrder, verifyAlipayCallback } from "../_core/alipay";
import { createOrder, getOrderByOutTradeNo, updateOrderStatus, createOrUpdateSubscription } from "../db";
import { TRPCError } from "@trpc/server";

/**
 * 套餐配置
 */
const PLAN_CONFIG = {
  basic: {
    name: "基础版",
    price: 9900, // 99元,单位:分
    monthlyLimit: 20,
    duration: 30, // 天
  },
  professional: {
    name: "专业版",
    price: 29900, // 299元
    monthlyLimit: 100,
    duration: 30,
  },
  enterprise: {
    name: "企业版",
    price: 99900, // 999元
    monthlyLimit: 0, // 无限
    duration: 30,
  },
} as const;

/**
 * 积分包配置
 */
const CREDIT_PACK_CONFIG: Record<string, { name: string; credits: number; price: number }> = {
  pack_500: { name: "入门包", credits: 500, price: 4900 },
  pack_1200: { name: "超值包", credits: 1200, price: 9900 },
  pack_3000: { name: "专业包", credits: 3000, price: 19900 },
  pack_8000: { name: "企业包", credits: 8000, price: 39900 },
};

export const paymentRouter = router({
  /**
   * 创建订单（支持订阅套餐和积分购买）
   */
  createOrder: protectedProcedure
    .input(
      z.object({
        type: z.enum(["subscription", "credits"]),
        planId: z.string(),
        amount: z.number(),
        credits: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { type, planId, amount, credits } = input;
      
      // 生成商户订单号
      const outTradeNo = `ZS${Date.now()}${ctx.user.id}`;
      
      let subject = "";
      let body = "";
      
      if (type === "subscription") {
        const config = PLAN_CONFIG[planId as keyof typeof PLAN_CONFIG];
        if (!config) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "无效的套餐类型" });
        }
        subject = `哲思AI商业智库 - ${config.name}`;
        body = `订阅${config.name},${config.monthlyLimit === 0 ? "无限次" : `${config.monthlyLimit}次/月`}咨询服务`;
      } else if (type === "credits") {
        const config = CREDIT_PACK_CONFIG[planId];
        if (!config) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "无效的积分包类型" });
        }
        subject = `哲思AI商业智库 - ${config.name}`;
        body = `购买${config.credits}积分`;
      }
      
      // 创建订单记录
      await createOrder({
        userId: ctx.user.id,
        outTradeNo,
        plan: planId,
        amount: amount * 100, // 转换为分
        paymentMethod: "alipay",
      });
      
      // 创建支付宝支付订单
      const returnUrl = "https://www.zesiai.com/payment/result";
      const notifyUrl = "https://www.zesiai.com/api/payment/alipay/notify";
      
      try {
        const paymentForm = await createAlipayPagePayment({
          outTradeNo,
          totalAmount: amount.toFixed(2),
          subject,
          body,
          returnUrl,
          notifyUrl,
        });
        
        return {
          orderId: outTradeNo,
          paymentForm,
        };
      } catch (error) {
        console.error("[Payment] Create payment error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "创建支付订单失败,请稍后重试",
        });
      }
    }),

  /**
   * 创建支付订单（旧接口，保留兼容性）
   */
  createPayment: protectedProcedure
    .input(
      z.object({
        plan: z.enum(["basic", "professional", "enterprise"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { plan } = input;
      const config = PLAN_CONFIG[plan];
      
      if (!config) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "无效的套餐类型",
        });
      }
      
      // 生成商户订单号
      const outTradeNo = `ZS${Date.now()}${ctx.user.id}`;
      
      // 创建订单记录
      await createOrder({
        userId: ctx.user.id,
        outTradeNo,
        plan,
        amount: config.price,
        paymentMethod: "alipay",
      });
      
      // 创建支付宝支付订单
      const returnUrl = "https://www.zesiai.com/payment/result";
      const notifyUrl = "https://www.zesiai.com/api/payment/alipay/notify";
      
      try {
        const paymentForm = await createAlipayPagePayment({
          outTradeNo,
          totalAmount: (config.price / 100).toFixed(2), // 转换为元
          subject: `哲思AI商业智库 - ${config.name}`,
          body: `订阅${config.name},${config.monthlyLimit === 0 ? "无限次" : `${config.monthlyLimit}次/月`}咨询服务`,
          returnUrl,
          notifyUrl,
        });
        
        return {
          outTradeNo,
          paymentForm,
          amount: config.price,
          plan: config.name,
        };
      } catch (error) {
        console.error("[Payment] Create payment error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "创建支付订单失败,请稍后重试",
        });
      }
    }),

  /**
   * 查询订单状态
   */
  queryPaymentStatus: protectedProcedure
    .input(
      z.object({
        outTradeNo: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const order = await getOrderByOutTradeNo(input.outTradeNo);
      
      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "订单不存在",
        });
      }
      
      if (order.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "无权查询此订单",
        });
      }
      
      // 如果订单已支付,直接返回
      if (order.status === "paid") {
        return {
          status: "paid",
          order,
        };
      }
      
      // 查询支付宝订单状态
      try {
        const result = await queryAlipayOrder(input.outTradeNo);
        
        // 如果支付成功,更新订单状态
        if (result.tradeStatus === "TRADE_SUCCESS") {
          await updateOrderStatus(input.outTradeNo, {
            status: "paid",
            tradeNo: result.tradeNo,
            paidAt: new Date(),
          });
          
          // Check if it's a subscription or credit pack order
          const subscriptionConfig = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];
          const creditPackConfig = CREDIT_PACK_CONFIG[order.plan];
          
          if (subscriptionConfig) {
            // Handle subscription order
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + subscriptionConfig.duration);
            
            await createOrUpdateSubscription({
              userId: order.userId,
              plan: order.plan as any,
              monthlyLimit: subscriptionConfig.monthlyLimit,
              price: subscriptionConfig.price,
              endDate,
            });
          } else if (creditPackConfig) {
            // Handle credit pack order
            const { addPurchasedCredits } = await import("../creditsManager");
            await addPurchasedCredits(order.userId, creditPackConfig.credits, order.id);
          }
          
          return {
            status: "paid",
            order: await getOrderByOutTradeNo(input.outTradeNo),
          };
        }
        
        return {
          status: order.status,
          order,
        };
      } catch (error) {
        console.error("[Payment] Query payment status error:", error);
        return {
          status: order.status,
          order,
        };
      }
    }),

  /**
   * 支付宝异步回调处理
   * 注意:这个接口会被支付宝服务器调用,不需要用户认证
   */
  alipayNotify: publicProcedure
    .input(z.record(z.string(), z.any()))
    .mutation(async ({ input }) => {
      console.log("[Payment] Alipay notify received:", input);
      
      // 验证签名
      const isValid = verifyAlipayCallback(input);
      if (!isValid) {
        console.error("[Payment] Invalid signature");
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid signature",
        });
      }
      
      const outTradeNo = input.out_trade_no as string;
      const tradeStatus = input.trade_status as string;
      const tradeNo = input.trade_no as string;
      
      // 查询订单
      const order = await getOrderByOutTradeNo(outTradeNo);
      if (!order) {
        console.error("[Payment] Order not found:", outTradeNo);
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found",
        });
      }
      
      // 如果订单已处理,直接返回成功
      if (order.status === "paid") {
        return { success: true };
      }
      
      // 处理支付成功
      if (tradeStatus === "TRADE_SUCCESS") {
        await updateOrderStatus(outTradeNo, {
          status: "paid",
          tradeNo,
          paidAt: new Date(),
        });
        
        // Check if it's a subscription or credit pack order
        const subscriptionConfig = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];
        const creditPackConfig = CREDIT_PACK_CONFIG[order.plan];
        
        if (subscriptionConfig) {
          // Handle subscription order
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + subscriptionConfig.duration);
          
          await createOrUpdateSubscription({
            userId: order.userId,
            plan: order.plan as any,
            monthlyLimit: subscriptionConfig.monthlyLimit,
            price: subscriptionConfig.price,
            endDate,
          });
        } else if (creditPackConfig) {
          // Handle credit pack order
          const { addPurchasedCredits } = await import("../creditsManager");
          await addPurchasedCredits(order.userId, creditPackConfig.credits, order.id);
        }
        
        console.log("[Payment] Payment success:", outTradeNo);
      }
      
      return { success: true };
    }),
});
