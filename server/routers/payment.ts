import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { createAlipayPagePayment, queryAlipayOrder, verifyAlipayCallback } from "../_core/alipay";
import { createWechatH5Payment, createWechatJsapiPayment, queryWechatPayment } from "../wechatPay";
import { createOrder, getOrderByOutTradeNo, updateOrderStatus, createOrUpdateSubscription } from "../db";
import { TRPCError } from "@trpc/server";
import { ENV } from "../_core/env";
import {
  getPricingConfig,
  getSubscriptionPlan,
  resolveCreditPack,
  resolveSubscriptionPlan,
} from "../pricingConfig";
import { getPaymentProduct } from "../paymentPricing";

export const paymentRouter = router({
  /**
   * 创建订单（支持订阅套餐和积分购买）
   */
  createOrder: protectedProcedure
    .input(
      z.object({
        type: z.enum(["subscription", "credits"]),
        planId: z.string(),
        amount: z.number().optional(),
        credits: z.number().optional(),
        paymentMethod: z.enum(["alipay", "wechat"]).default("alipay"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { type, planId, paymentMethod } = input;
      
      // 生成商户订单号
      const outTradeNo = `ZS${Date.now()}${ctx.user.id}`;
      
      let product;
      try {
        product = await getPaymentProduct(type, planId);
      } catch {
        throw new TRPCError({ code: "BAD_REQUEST", message: "无效的产品类型" });
      }
      
      // 创建订单记录
      await createOrder({
        userId: ctx.user.id,
        outTradeNo,
        plan: planId,
        amount: product.amountCents,
        paymentMethod,
      });
      
      try {
        if (paymentMethod === "wechat") {
          // 检查微信支付是否开启
          if (!ENV.wechatPayEnabled) {
            throw new TRPCError({ 
              code: "BAD_REQUEST", 
              message: "微信支付正在审核中，请使用支付宝支付" 
            });
          }
          
          // 使用H5支付（订阅号不支持JSAPI）
          const clientIp = ctx.req.ip || ctx.req.headers['x-forwarded-for'] as string || '127.0.0.1';
          const { h5Url } = await createWechatH5Payment({
            outTradeNo,
            amount: product.amountCents,
            description: product.subject,
            clientIp,
          });
          
          return {
            orderId: outTradeNo,
            paymentUrl: h5Url,
            paymentMethod: "wechat",
          };
        } else {
          // 创建支付宝支付订单
          const returnUrl = "https://zesiai.com/";
          const notifyUrl = "https://zesiai.com/api/payment/alipay/notify";
          
          const paymentForm = await createAlipayPagePayment({
            outTradeNo,
            totalAmount: (product.amountCents / 100).toFixed(2),
            subject: product.subject,
            body: product.description,
            returnUrl,
            notifyUrl,
          });
          
          return {
            orderId: outTradeNo,
            paymentForm,
            paymentMethod: "alipay",
          };
        }
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
      let config;
      try {
        config = await getSubscriptionPlan(plan);
      } catch {
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
        amount: config.priceCents,
        paymentMethod: "alipay",
      });
      
      // 创建支付宝支付订单
      const returnUrl = "https://zesiai.com/";
      const notifyUrl = "https://zesiai.com/api/payment/alipay/notify";
      
      try {
        const paymentForm = await createAlipayPagePayment({
          outTradeNo,
          totalAmount: (config.priceCents / 100).toFixed(2), // 转换为元
          subject: `泽思AI商业智库 - ${config.name}`,
          body: `订阅${config.name},每月${config.monthlyCredits}积分`,
          returnUrl,
          notifyUrl,
        });
        
        return {
          outTradeNo,
          paymentForm,
          amount: config.priceCents,
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
      
      // 查询支付订单状态
      try {
        let tradeStatus = "";
        let tradeNo = "";
        
        if (order.paymentMethod === "wechat") {
          // 查询微信支付订单
          const result = await queryWechatPayment(input.outTradeNo);
          if (result.trade_state === "SUCCESS") {
            tradeStatus = "TRADE_SUCCESS";
            tradeNo = result.transaction_id;
          }
        } else {
          // 查询支付宝订单
          const result = await queryAlipayOrder(input.outTradeNo);
          tradeStatus = result.tradeStatus;
          tradeNo = result.tradeNo;
        }
        
        // 如果支付成功,更新订单状态
        if (tradeStatus === "TRADE_SUCCESS") {
          await updateOrderStatus(input.outTradeNo, {
            status: "paid",
            tradeNo,
            paidAt: new Date(),
          });
          
          // Check if it's a subscription or credit pack order
          const pricing = await getPricingConfig();
          let subscriptionConfig;
          let creditPackConfig;
          try {
            subscriptionConfig = resolveSubscriptionPlan(pricing, order.plan);
          } catch {}
          try {
            creditPackConfig = resolveCreditPack(pricing, order.plan);
          } catch {}
          
          if (subscriptionConfig) {
            // Handle subscription order
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + subscriptionConfig.durationDays);
            
            await createOrUpdateSubscription({
              userId: order.userId,
              plan: order.plan as any,
              // monthlyLimit removed - using credits system now
              price: subscriptionConfig.priceCents,
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
        const pricing = await getPricingConfig();
        let subscriptionConfig;
        try {
          subscriptionConfig = resolveSubscriptionPlan(pricing, order.plan);
        } catch {}
        
        // Extract pack ID from plan (handle both "pack_500" and "pack_500_49" formats)
        let packId = order.plan;
        if (order.plan.startsWith('pack_') && order.plan.includes('_', 5)) {
          // Format: pack_500_49 -> extract pack_500
          const parts = order.plan.split('_');
          if (parts.length >= 2) {
            packId = `${parts[0]}_${parts[1]}`; // pack_500
          }
        }
        let creditPackConfig;
        try {
          creditPackConfig = resolveCreditPack(pricing, packId);
        } catch {}
        
        if (subscriptionConfig) {
          // Handle subscription order
          const endDate = new Date();
          endDate.setDate(endDate.getDate() + subscriptionConfig.durationDays);
          
          await createOrUpdateSubscription({
            userId: order.userId,
            plan: order.plan as any,
            // monthlyLimit removed - using credits system now
            price: subscriptionConfig.priceCents,
            endDate,
          });
          
          // Initialize subscription credits
          const { resetSubscriptionCredits } = await import("../creditsManager");
          await resetSubscriptionCredits(order.userId, order.plan);
        } else if (creditPackConfig) {
          // Handle credit pack order
          const { addPurchasedCredits } = await import("../creditsManager");
          await addPurchasedCredits(order.userId, creditPackConfig.credits, order.id);
        }
        
        console.log("[Payment] Payment success:", outTradeNo);
      }
      
      return { success: true };
    }),

  /**
   * 获取支付配置（检查微信支付是否可用）
   */
  getPaymentConfig: publicProcedure.query(() => {
    return {
      wechatPayEnabled: ENV.wechatPayEnabled,
      alipayEnabled: true, // 支付宝始终可用
    };
  }),
});
