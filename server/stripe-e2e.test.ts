import { describe, it, expect, beforeAll } from 'vitest';
import { ENV } from './_core/env';
import Stripe from 'stripe';
import { STRIPE_SUBSCRIPTION_PLANS, STRIPE_CREDIT_PACKS } from './stripeProducts';

describe('Stripe Payment E2E Test', () => {
  let stripe: Stripe;

  beforeAll(() => {
    // 初始化Stripe客户端
    stripe = new Stripe(ENV.stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });
  });

  describe('Stripe Connection', () => {
    it('should connect to Stripe API successfully', async () => {
      // 测试Stripe API连接
      const balance = await stripe.balance.retrieve();
      expect(balance).toBeDefined();
      expect(balance.object).toBe('balance');
    });

    it('should have correct API key format', () => {
      expect(ENV.stripeSecretKey).toMatch(/^sk_(test|live)_/);
      expect(ENV.stripePublishableKey).toMatch(/^pk_(test|live)_/);
    });
  });

  describe('Stripe Checkout Session Creation', () => {
    it('should create checkout session for subscription plan', async () => {
      const plan = STRIPE_SUBSCRIPTION_PLANS.basic;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: plan.currency,
              unit_amount: plan.price,
              product_data: {
                name: plan.name,
                description: `${plan.monthlyCredits} 积分/月，有效期 ${plan.duration} 天`,
              },
              recurring: {
                interval: 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: 'https://www.zesiai.com/payment/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://www.zesiai.com/payment/cancel',
        metadata: {
          type: 'subscription',
          planId: 'basic',
          monthlyCredits: plan.monthlyCredits.toString(),
          duration: plan.duration.toString(),
        },
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^cs_test_/);
      expect(session.mode).toBe('subscription');
      expect(session.status).toBe('open');
      expect(session.url).toBeTruthy();
      expect(session.metadata.type).toBe('subscription');
      expect(session.metadata.planId).toBe('basic');

      console.log('✓ Subscription checkout session created:', session.id);
      console.log('  Payment URL:', session.url);
    }, 30000);

    it('should create checkout session for credit pack', async () => {
      const pack = STRIPE_CREDIT_PACKS.pack_1200;
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: pack.currency,
              unit_amount: pack.price,
              product_data: {
                name: pack.name,
                description: `一次性充值 ${pack.credits} 积分`,
              },
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: 'https://www.zesiai.com/payment/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'https://www.zesiai.com/payment/cancel',
        metadata: {
          type: 'credits',
          planId: 'pack_1200',
          credits: pack.credits.toString(),
        },
      });

      expect(session).toBeDefined();
      expect(session.id).toMatch(/^cs_test_/);
      expect(session.mode).toBe('payment');
      expect(session.status).toBe('open');
      expect(session.url).toBeTruthy();
      expect(session.metadata.type).toBe('credits');
      expect(session.metadata.planId).toBe('pack_1200');

      console.log('✓ Credit pack checkout session created:', session.id);
      console.log('  Payment URL:', session.url);
    }, 30000);
  });

  describe('Stripe Product Pricing', () => {
    it('should have correct subscription plan pricing', () => {
      // 验证订阅套餐价格
      expect(STRIPE_SUBSCRIPTION_PLANS.basic.price).toBe(1900); // $19.00
      expect(STRIPE_SUBSCRIPTION_PLANS.professional.price).toBe(4900); // $49.00
      expect(STRIPE_SUBSCRIPTION_PLANS.enterprise.price).toBe(14900); // $149.00
    });

    it('should have correct credit pack pricing', () => {
      // 验证积分包价格
      expect(STRIPE_CREDIT_PACKS.pack_500.price).toBe(700); // $7.00
      expect(STRIPE_CREDIT_PACKS.pack_1200.price).toBe(1400); // $14.00
      expect(STRIPE_CREDIT_PACKS.pack_3000.price).toBe(2900); // $29.00
      expect(STRIPE_CREDIT_PACKS.pack_8000.price).toBe(5900); // $59.00
    });
  });

  describe('Webhook Configuration', () => {
    it('should have webhook secret configured', () => {
      // 注意：STRIPE_WEBHOOK_SECRET 是系统自动配置的
      // 这里只验证环境变量存在性
      expect(process.env.STRIPE_WEBHOOK_SECRET || ENV.stripeWebhookSecret).toBeTruthy();
    });
  });

  describe('Stripe API Compatibility', () => {
    it('should list recent events', async () => {
      const events = await stripe.events.list({ limit: 5 });
      expect(events).toBeDefined();
      expect(events.object).toBe('list');
      expect(Array.isArray(events.data)).toBe(true);
      
      console.log(`✓ Retrieved ${events.data.length} recent events`);
    }, 30000);

    it('should retrieve account information', async () => {
      const account = await stripe.accounts.retrieve();
      expect(account).toBeDefined();
      expect(account.id).toBeTruthy();
      
      console.log('✓ Stripe account ID:', account.id);
      console.log('  Account type:', account.type);
      console.log('  Charges enabled:', account.charges_enabled);
    }, 30000);
  });
});
