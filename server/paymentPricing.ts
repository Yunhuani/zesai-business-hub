import {
  getPricingConfig,
  resolveCreditPack,
  resolveSubscriptionPlan,
  type PricingConfig,
} from "./pricingConfig";

export type PaymentProductType = "subscription" | "credits";

export function resolvePaymentProduct(
  pricing: PricingConfig,
  type: PaymentProductType,
  productId: string
) {
  if (type === "subscription") {
    const plan = resolveSubscriptionPlan(pricing, productId);
    return {
      amountCents: plan.priceCents,
      credits: plan.monthlyCredits,
      name: plan.name,
      subject: `泽思AI商业智库 - ${plan.name}`,
      description: `订阅${plan.name}，每月${plan.monthlyCredits}积分`,
    };
  }

  const pack = resolveCreditPack(pricing, productId);
  return {
    amountCents: pack.priceCents,
    credits: pack.credits,
    name: pack.name,
    subject: `泽思AI商业智库 - ${pack.name}`,
    description: `购买${pack.credits}积分`,
  };
}

export async function getPaymentProduct(
  type: PaymentProductType,
  productId: string
) {
  return resolvePaymentProduct(await getPricingConfig(), type, productId);
}
