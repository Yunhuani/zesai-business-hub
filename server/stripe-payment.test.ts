import { describe, it, expect, beforeAll } from 'vitest';
import { ENV } from '../server/_core/env';
import { STRIPE_SUBSCRIPTION_PLANS, STRIPE_CREDIT_PACKS, formatUSDPrice, getStripeProductMetadata } from '../server/stripeProducts';

describe('Stripe Payment Integration', () => {
  beforeAll(() => {
    // 确保测试环境有Stripe密钥
    expect(ENV.stripeSecretKey).toBeTruthy();
    expect(ENV.stripePublishableKey).toBeTruthy();
  });

  describe('Stripe Product Configuration', () => {
    it('should have correct subscription plan prices in USD', () => {
      expect(STRIPE_SUBSCRIPTION_PLANS.basic.price).toBe(1900); // $19.00
      expect(STRIPE_SUBSCRIPTION_PLANS.professional.price).toBe(4900); // $49.00
      expect(STRIPE_SUBSCRIPTION_PLANS.enterprise.price).toBe(14900); // $149.00
    });

    it('should have correct credit pack prices in USD', () => {
      expect(STRIPE_CREDIT_PACKS.pack_500.price).toBe(700); // $7.00
      expect(STRIPE_CREDIT_PACKS.pack_1200.price).toBe(1400); // $14.00
      expect(STRIPE_CREDIT_PACKS.pack_3000.price).toBe(2900); // $29.00
      expect(STRIPE_CREDIT_PACKS.pack_8000.price).toBe(5900); // $59.00
    });

    it('should format USD prices correctly', () => {
      expect(formatUSDPrice(1900)).toBe('$19.00');
      expect(formatUSDPrice(4900)).toBe('$49.00');
      expect(formatUSDPrice(700)).toBe('$7.00');
    });

    it('should generate correct metadata for subscription', () => {
      const metadata = getStripeProductMetadata('subscription', 'basic');
      expect(metadata.type).toBe('subscription');
      expect(metadata.planId).toBe('basic');
      expect(metadata.monthlyCredits).toBe('750');
      expect(metadata.duration).toBe('30');
    });

    it('should generate correct metadata for credits', () => {
      const metadata = getStripeProductMetadata('credits', 'pack_1200');
      expect(metadata.type).toBe('credits');
      expect(metadata.planId).toBe('pack_1200');
      expect(metadata.credits).toBe('1200');
    });
  });

  describe('Stripe Environment Configuration', () => {
    it('should have Stripe secret key configured', () => {
      expect(ENV.stripeSecretKey).toMatch(/^sk_(test|live)_/);
    });

    it('should have Stripe publishable key configured', () => {
      expect(ENV.stripePublishableKey).toMatch(/^pk_(test|live)_/);
    });

    it('should have consistent key types (both test or both live)', () => {
      const secretIsTest = ENV.stripeSecretKey.startsWith('sk_test_');
      const publishableIsTest = ENV.stripePublishableKey.startsWith('pk_test_');
      expect(secretIsTest).toBe(publishableIsTest);
    });
  });

  describe('Stripe Product Metadata', () => {
    it('should have all required fields for subscription plans', () => {
      Object.keys(STRIPE_SUBSCRIPTION_PLANS).forEach((planId) => {
        const plan = STRIPE_SUBSCRIPTION_PLANS[planId as keyof typeof STRIPE_SUBSCRIPTION_PLANS];
        expect(plan.name).toBeTruthy();
        expect(plan.price).toBeGreaterThan(0);
        expect(plan.currency).toBe('usd');
        expect(plan.monthlyCredits).toBeGreaterThan(0);
        expect(plan.duration).toBe(30);
      });
    });

    it('should have all required fields for credit packs', () => {
      Object.keys(STRIPE_CREDIT_PACKS).forEach((packId) => {
        const pack = STRIPE_CREDIT_PACKS[packId as keyof typeof STRIPE_CREDIT_PACKS];
        expect(pack.name).toBeTruthy();
        expect(pack.price).toBeGreaterThan(0);
        expect(pack.currency).toBe('usd');
        expect(pack.credits).toBeGreaterThan(0);
      });
    });
  });

  describe('Price Consistency', () => {
    it('should have reasonable price-to-credits ratio for subscription plans', () => {
      // 检查每个套餐的性价比是否合理
      const basicRatio = STRIPE_SUBSCRIPTION_PLANS.basic.monthlyCredits / STRIPE_SUBSCRIPTION_PLANS.basic.price;
      const professionalRatio = STRIPE_SUBSCRIPTION_PLANS.professional.monthlyCredits / STRIPE_SUBSCRIPTION_PLANS.professional.price;
      const enterpriseRatio = STRIPE_SUBSCRIPTION_PLANS.enterprise.monthlyCredits / STRIPE_SUBSCRIPTION_PLANS.enterprise.price;

      // 高级套餐应该有更好的性价比
      expect(professionalRatio).toBeGreaterThanOrEqual(basicRatio);
      expect(enterpriseRatio).toBeGreaterThanOrEqual(professionalRatio);
    });

    it('should have reasonable price-to-credits ratio for credit packs', () => {
      // 检查积分包的性价比
      const pack500Ratio = STRIPE_CREDIT_PACKS.pack_500.credits / STRIPE_CREDIT_PACKS.pack_500.price;
      const pack1200Ratio = STRIPE_CREDIT_PACKS.pack_1200.credits / STRIPE_CREDIT_PACKS.pack_1200.price;
      const pack3000Ratio = STRIPE_CREDIT_PACKS.pack_3000.credits / STRIPE_CREDIT_PACKS.pack_3000.price;
      const pack8000Ratio = STRIPE_CREDIT_PACKS.pack_8000.credits / STRIPE_CREDIT_PACKS.pack_8000.price;

      // 更大的积分包应该有更好的性价比
      expect(pack1200Ratio).toBeGreaterThanOrEqual(pack500Ratio);
      expect(pack3000Ratio).toBeGreaterThanOrEqual(pack1200Ratio);
      expect(pack8000Ratio).toBeGreaterThanOrEqual(pack3000Ratio);
    });
  });
});
