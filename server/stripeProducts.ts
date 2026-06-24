/**
 * Stripe产品和价格配置
 * 用于国际用户的美元支付
 */

export const STRIPE_SUBSCRIPTION_PLANS = {
  basic: {
    name: "Basic Plan",
    price: 1900, // $19.00 in cents
    currency: "usd",
    monthlyCredits: 1800,
    duration: 30,
    description: "Perfect for occasional use",
  },
  professional: {
    name: "Professional Plan",
    price: 4900, // $49.00 in cents
    currency: "usd",
    monthlyCredits: 6000,
    duration: 30,
    description: "Best for regular users",
  },
  enterprise: {
    name: "Enterprise Plan",
    price: 14900, // $149.00 in cents
    currency: "usd",
    monthlyCredits: 15000,
    duration: 30,
    description: "For power users and teams",
  },
} as const;

export const STRIPE_CREDIT_PACKS = {
  pack_500: {
    name: "Starter Pack",
    credits: 500,
    price: 700, // $7.00 in cents
    currency: "usd",
    description: "500 credits for occasional use",
  },
  pack_1200: {
    name: "Value Pack",
    credits: 1200,
    price: 1400, // $14.00 in cents
    currency: "usd",
    description: "1200 credits - Best value",
    popular: true,
  },
  pack_3000: {
    name: "Professional Pack",
    credits: 3000,
    price: 2900, // $29.00 in cents
    currency: "usd",
    description: "3000 credits for heavy users",
  },
  pack_8000: {
    name: "Enterprise Pack",
    credits: 8000,
    price: 5900, // $59.00 in cents
    currency: "usd",
    description: "8000 credits for teams",
  },
} as const;

/**
 * 格式化美元价格显示
 */
export function formatUSDPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * 获取Stripe产品元数据
 */
export function getStripeProductMetadata(type: "subscription" | "credits", planId: string): Record<string, string> {
  if (type === "subscription") {
    const plan = STRIPE_SUBSCRIPTION_PLANS[planId as keyof typeof STRIPE_SUBSCRIPTION_PLANS];
    return {
      type: "subscription",
      planId,
      monthlyCredits: plan.monthlyCredits.toString(),
      duration: plan.duration.toString(),
    };
  } else {
    const pack = STRIPE_CREDIT_PACKS[planId as keyof typeof STRIPE_CREDIT_PACKS];
    return {
      type: "credits",
      planId,
      credits: pack.credits.toString(),
    };
  }
}
