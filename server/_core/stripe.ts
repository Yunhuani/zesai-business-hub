import Stripe from "stripe";
import { ENV } from "./env";

/**
 * Stripe客户端实例
 */
let stripeClient: Stripe | null = null;

export function getStripeClient(): Stripe {
  if (!stripeClient) {
    if (!ENV.stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY is not configured");
    }
    stripeClient = new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2025-12-15.clover",
      typescript: true,
    });
  }
  return stripeClient;
}

/**
 * 创建Stripe Checkout Session
 */
export async function createStripeCheckoutSession(params: {
  userId: number;
  userEmail: string;
  userName: string;
  type: "subscription" | "credits";
  planId: string;
  amount: number; // in cents
  currency: string;
  productName: string;
  productDescription: string;
  metadata: Record<string, string>;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; checkoutUrl: string }> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: params.currency,
          product_data: {
            name: params.productName,
            description: params.productDescription,
          },
          unit_amount: params.amount,
        },
        quantity: 1,
      },
    ],
    customer_email: params.userEmail,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName,
      ...params.metadata,
    },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
  });

  return {
    sessionId: session.id,
    checkoutUrl: session.url!,
  };
}

/**
 * 验证Stripe Webhook签名
 */
export function constructStripeEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  const stripe = getStripeClient();
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * 获取Stripe Checkout Session详情
 */
export async function getStripeCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  const stripe = getStripeClient();
  return await stripe.checkout.sessions.retrieve(sessionId);
}
