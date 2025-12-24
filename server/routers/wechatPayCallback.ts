import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { verifyWechatPayNotify, decryptWechatPayNotify } from "../wechatPay";
import { getOrderByOutTradeNo, updateOrderStatus, createOrUpdateSubscription, getUserById } from "../db";
import { notifyAdminNewOrder } from "../orderNotification";

/**
 * 套餐配置
 */
const PLAN_CONFIG = {
  free: {
    name: "免费版",
    price: 0,
    monthlyCredits: 100,
    duration: 30,
  },
  basic: {
    name: "基础版",
    price: 9900,
    monthlyCredits: 750,
    duration: 30,
  },
  professional: {
    name: "专业版",
    price: 29900,
    monthlyCredits: 2600,
    duration: 30,
  },
  enterprise: {
    name: "企业版",
    price: 99900,
    monthlyCredits: 11000,
    duration: 30,
  },
} as const;

/**
 * 积分包配置
 */
const CREDIT_PACK_CONFIG: Record<string, { name: string; credits: number; price: number }> = {
  pack_500: { name: "入门包", credits: 500, price: 4900 },
  pack_1000: { name: "超值包", credits: 1000, price: 9900 },
  pack_2200: { name: "专业包", credits: 2200, price: 19900 },
  pack_5500: { name: "企业包", credits: 5500, price: 39900 },
};

export const wechatPayCallbackRouter = router({
  /**
   * 微信支付异步回调处理
   */
  notify: publicProcedure
    .input(z.any())
    .mutation(async ({ input, ctx }) => {
      console.log("[WechatPay] Notify received:", input);
      
      try {
        // 获取请求头
        const timestamp = ctx.req.headers['wechatpay-timestamp'] as string;
        const nonce = ctx.req.headers['wechatpay-nonce'] as string;
        const signature = ctx.req.headers['wechatpay-signature'] as string;
        const serial = ctx.req.headers['wechatpay-serial'] as string;
        
        if (!timestamp || !nonce || !signature || !serial) {
          console.error("[WechatPay] Missing required headers");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Missing required headers",
          });
        }
        
        // 验证签名
        const body = JSON.stringify(input);
        const isValid = await verifyWechatPayNotify(timestamp, nonce, body, signature, serial);
        
        if (!isValid) {
          console.error("[WechatPay] Invalid signature");
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid signature",
          });
        }
        
        // 解密数据
        const resource = input.resource;
        const decrypted = decryptWechatPayNotify(
          resource.ciphertext,
          resource.associated_data,
          resource.nonce
        );
        
        const outTradeNo = decrypted.out_trade_no;
        const tradeState = decrypted.trade_state;
        const transactionId = decrypted.transaction_id;
        
        // 查询订单
        const order = await getOrderByOutTradeNo(outTradeNo);
        if (!order) {
          console.error("[WechatPay] Order not found:", outTradeNo);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Order not found",
          });
        }
        
        // 如果订单已处理,直接返回成功
        if (order.status === "paid") {
          return { code: "SUCCESS", message: "OK" };
        }
        
        // 处理支付成功
        if (tradeState === "SUCCESS") {
          await updateOrderStatus(outTradeNo, {
            status: "paid",
            tradeNo: transactionId,
            paidAt: new Date(),
          });
          
          // Check if it's a subscription or credit pack order
          const subscriptionConfig = PLAN_CONFIG[order.plan as keyof typeof PLAN_CONFIG];
          
          // Extract pack ID from plan
          let packId = order.plan;
          if (order.plan.startsWith('pack_') && order.plan.includes('_', 5)) {
            const parts = order.plan.split('_');
            if (parts.length >= 2) {
              packId = `${parts[0]}_${parts[1]}`;
            }
          }
          const creditPackConfig = CREDIT_PACK_CONFIG[packId];
          
          if (subscriptionConfig) {
            // Handle subscription order
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + subscriptionConfig.duration);
            
            await createOrUpdateSubscription({
              userId: order.userId,
              plan: order.plan as any,
              price: subscriptionConfig.price,
              endDate,
            });
            
            // Initialize subscription credits
            const { resetSubscriptionCredits } = await import("../creditsManager");
            await resetSubscriptionCredits(order.userId, order.plan);
            
            // Send email notification to admin
            const user = await getUserById(order.userId);
            if (user) {
              await notifyAdminNewOrder({
                orderNo: outTradeNo,
                userName: user.name || "",
                userEmail: user.email || "",
                productName: `${subscriptionConfig.name}套餐`,
                amount: order.amount,
                paymentMethod: "wechat",
                paidAt: new Date(),
              });
            }
          } else if (creditPackConfig) {
            // Handle credit pack order
            const { addPurchasedCredits } = await import("../creditsManager");
            await addPurchasedCredits(order.userId, creditPackConfig.credits, order.id);
            
            // Send email notification to admin
            const user = await getUserById(order.userId);
            if (user) {
              await notifyAdminNewOrder({
                orderNo: outTradeNo,
                userName: user.name || "",
                userEmail: user.email || "",
                productName: `${creditPackConfig.name}（${creditPackConfig.credits}积分）`,
                amount: order.amount,
                paymentMethod: "wechat",
                paidAt: new Date(),
              });
            }
          }
          
          console.log("[WechatPay] Payment success:", outTradeNo);
        }
        
        return { code: "SUCCESS", message: "OK" };
      } catch (error) {
        console.error("[WechatPay] Notify error:", error);
        throw error;
      }
    }),
});
