import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createAlipayQrCodePayment, queryAlipayOrder, verifyAlipayCallback } from "../_core/alipay";
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

export const paymentRouter = router({
  /**
   * 创建支付订单
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
      const notifyUrl = `${process.env.VITE_APP_URL || "https://3000-i7l4zq7rduk5xdx0l1nji-fdf6b89b.manusvm.computer"}/api/payment/alipay/notify`;
      
      try {
        const qrCode = await createAlipayQrCodePayment({
          outTradeNo,
          totalAmount: (config.price / 100).toFixed(2), // 转换为元
          subject: `泽思AI商业智库 - ${config.name}`,
          body: `订阅${config.name},${config.monthlyLimit === 0 ? "无限次" : `${config.monthlyLimit}次/月`}咨询服务`,
          notifyUrl,
        });
        
        return {
          outTradeNo,
          qrCode,
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
          
          // 更新用户订阅
          const config = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];
          if (config) {
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + config.duration);
            
            await createOrUpdateSubscription({
              userId: order.userId,
              plan: order.plan as any,
              monthlyLimit: config.monthlyLimit,
              price: config.price,
              endDate,
            });
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
        
        // 更新用户订阅
        const config = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];
        if (config) {
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + config.duration);
          
          await createOrUpdateSubscription({
            userId: order.userId,
            plan: order.plan as any,
            monthlyLimit: config.monthlyLimit,
            price: config.price,
            endDate,
          });
        }
        
        console.log("[Payment] Payment success:", outTradeNo);
      }
      
      return { success: true };
    }),
});
