import { Request, Response } from "express";
import { constructStripeEvent, getStripeCheckoutSession } from "./_core/stripe";
import { ENV } from "./_core/env";
import { getOrderByOutTradeNo, updateOrderStatus } from "./db";
import { addPurchasedCredits, resetSubscriptionCredits } from "./creditsManager";
import { STRIPE_SUBSCRIPTION_PLANS, STRIPE_CREDIT_PACKS } from "./stripeProducts";

/**
 * Stripe Webhook处理器
 * 路由: POST /api/stripe/webhook
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const signature = req.headers["stripe-signature"];

  if (!signature) {
    console.error("[Stripe Webhook] Missing stripe-signature header");
    return res.status(400).json({ error: "Missing signature" });
  }

  try {
    // 验证webhook签名
    const event = constructStripeEvent(
      req.body,
      signature as string,
      ENV.stripeWebhookSecret
    );

    console.log(`[Stripe Webhook] Received event: ${event.type}, ID: ${event.id}`);

    // 处理测试事件
    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    // 处理checkout.session.completed事件
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      
      console.log("[Stripe Webhook] Checkout session completed:", {
        sessionId: session.id,
        customerId: session.customer,
        paymentStatus: session.payment_status,
        metadata: session.metadata,
      });

      // 支付成功
      if (session.payment_status === "paid") {
        const metadata = session.metadata;
        const outTradeNo = metadata.out_trade_no;
        const type = metadata.type as "subscription" | "credits";
        const planId = type === "subscription" ? metadata.planId : metadata.packId;
        const userId = parseInt(metadata.user_id);

        if (!outTradeNo || !userId) {
          console.error("[Stripe Webhook] Missing required metadata:", metadata);
          return res.status(400).json({ error: "Missing metadata" });
        }

        // 查询订单
        const order = await getOrderByOutTradeNo(outTradeNo);
        if (!order) {
          console.error(`[Stripe Webhook] Order not found: ${outTradeNo}`);
          return res.status(404).json({ error: "Order not found" });
        }

        // 防止重复处理
        if (order.status === "paid") {
          console.log(`[Stripe Webhook] Order already processed: ${outTradeNo}`);
          return res.json({ received: true });
        }

        // 更新订单状态
        await updateOrderStatus(outTradeNo, {
          status: "paid",
          tradeNo: session.id,
          paidAt: new Date(),
        });

        // 处理订阅或积分充值
        if (type === "subscription") {
          const stripePlan = STRIPE_SUBSCRIPTION_PLANS[planId as keyof typeof STRIPE_SUBSCRIPTION_PLANS];
          if (stripePlan) {
            // 重置订阅积分（包含开通订阅逻辑）
            await resetSubscriptionCredits(userId, planId);
            console.log(`[Stripe Webhook] Subscription activated: ${planId}, credits: ${stripePlan.monthlyCredits}`);
          }
        } else if (type === "credits") {
          const stripePack = STRIPE_CREDIT_PACKS[planId as keyof typeof STRIPE_CREDIT_PACKS];
          if (stripePack) {
            await addPurchasedCredits(userId, stripePack.credits, order.id);
            console.log(`[Stripe Webhook] Credits added: ${stripePack.credits}`);
          }
        }
      }
    }

    res.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error processing webhook:", error);
    return res.status(400).json({ error: "Webhook processing failed" });
  }
}
