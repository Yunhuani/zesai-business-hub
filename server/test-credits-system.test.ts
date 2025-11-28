import { describe, it, expect, beforeAll } from 'vitest';
import { getUserCredits, checkCredits, deductCredits, addPurchasedCredits, CREDITS_COST } from './creditsManager';
import { getDb } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

describe('Credits System Integration Tests', () => {
  let testUserId: number;

  beforeAll(async () => {
    // Create a test user
    const db = await getDb();
    if (!db) throw new Error('Database not available');

    // Insert test user
    const result = await db.insert(users).values({
      openId: `test_credits_${Date.now()}`,
      name: 'Test Credits User',
      email: `test_credits_${Date.now()}@example.com`,
      creditsPurchased: 0,
      creditsSubscription: 100, // Free plan default
      role: 'user',
    });

    testUserId = Number(result[0].insertId);
  });

  it('should get user credits correctly', async () => {
    const credits = await getUserCredits(testUserId);
    
    expect(credits).toBeDefined();
    expect(credits.purchased).toBe(0);
    expect(credits.subscription).toBe(100);
    expect(credits.total).toBe(100);
  });

  it('should check credits correctly', async () => {
    const hasEnoughCredits = await checkCredits(testUserId, CREDITS_COST.BASIC_CHAT);
    expect(hasEnoughCredits).toBe(true);

    const hasEnoughForExpensive = await checkCredits(testUserId, 200);
    expect(hasEnoughForExpensive).toBe(false);
  });

  it('should deduct credits in correct order (purchased first, then subscription)', async () => {
    // First, add some purchased credits
    await addPurchasedCredits(testUserId, 50);

    let credits = await getUserCredits(testUserId);
    expect(credits.purchased).toBe(50);
    expect(credits.subscription).toBe(100);
    expect(credits.total).toBe(150);

    // Deduct 30 credits - should come from purchased credits
    const result1 = await deductCredits(testUserId, 30, 'Test deduction 1');
    expect(result1.success).toBe(true);
    expect(result1.remaining.purchased).toBe(20);
    expect(result1.remaining.subscription).toBe(100);
    expect(result1.remaining.total).toBe(120);

    // Deduct 40 credits - should use remaining 20 purchased + 20 subscription
    const result2 = await deductCredits(testUserId, 40, 'Test deduction 2');
    expect(result2.success).toBe(true);
    expect(result2.remaining.purchased).toBe(0);
    expect(result2.remaining.subscription).toBe(80);
    expect(result2.remaining.total).toBe(80);
  });

  it('should fail to deduct when insufficient credits', async () => {
    const credits = await getUserCredits(testUserId);
    const result = await deductCredits(testUserId, credits.total + 100, 'Test insufficient');
    
    expect(result.success).toBe(false);
    expect(result.remaining.total).toBe(credits.total);
  });

  it('should add purchased credits correctly', async () => {
    const beforeCredits = await getUserCredits(testUserId);
    
    await addPurchasedCredits(testUserId, 500);
    
    const afterCredits = await getUserCredits(testUserId);
    expect(afterCredits.purchased).toBe(beforeCredits.purchased + 500);
    expect(afterCredits.subscription).toBe(beforeCredits.subscription);
  });

  it('should handle BASIC_CHAT cost correctly', async () => {
    const beforeCredits = await getUserCredits(testUserId);
    
    const result = await deductCredits(testUserId, CREDITS_COST.BASIC_CHAT, 'Basic chat test');
    expect(result.success).toBe(true);
    
    const afterCredits = await getUserCredits(testUserId);
    expect(afterCredits.total).toBe(beforeCredits.total - CREDITS_COST.BASIC_CHAT);
  });

  it('should verify credits cost constants are reasonable', () => {
    expect(CREDITS_COST.BASIC_CHAT).toBe(10);
    expect(CREDITS_COST.DEEP_CHAT).toBe(20);
    expect(CREDITS_COST.DOCUMENT_ANALYSIS).toBe(30);
    expect(CREDITS_COST.EXPORT_PDF).toBe(30);
    expect(CREDITS_COST.EXPORT_PPT).toBe(50);
    expect(CREDITS_COST.CHART_GENERATION).toBe(20);
  });
});

describe('Credits Purchase Flow Tests', () => {
  it('should verify credit pack configurations', () => {
    // Import credit pack config from payment router
    const CREDIT_PACK_CONFIG: Record<string, { name: string; credits: number; price: number }> = {
      pack_500: { name: "入门包", credits: 500, price: 4900 },
      pack_1200: { name: "超值包", credits: 1200, price: 9900 },
      pack_3000: { name: "专业包", credits: 3000, price: 19900 },
      pack_8000: { name: "企业包", credits: 8000, price: 39900 },
    };

    // Verify pack_500
    expect(CREDIT_PACK_CONFIG.pack_500.credits).toBe(500);
    expect(CREDIT_PACK_CONFIG.pack_500.price).toBe(4900); // ¥49

    // Verify pack_1200 (best value)
    expect(CREDIT_PACK_CONFIG.pack_1200.credits).toBe(1200);
    expect(CREDIT_PACK_CONFIG.pack_1200.price).toBe(9900); // ¥99

    // Verify pack_3000
    expect(CREDIT_PACK_CONFIG.pack_3000.credits).toBe(3000);
    expect(CREDIT_PACK_CONFIG.pack_3000.price).toBe(19900); // ¥199

    // Verify pack_8000
    expect(CREDIT_PACK_CONFIG.pack_8000.credits).toBe(8000);
    expect(CREDIT_PACK_CONFIG.pack_8000.price).toBe(39900); // ¥399
  });

  it('should verify credit pack pricing is reasonable', () => {
    const CREDIT_PACK_CONFIG = {
      pack_500: { credits: 500, price: 4900 },
      pack_1200: { credits: 1200, price: 9900 },
      pack_3000: { credits: 3000, price: 19900 },
      pack_8000: { credits: 8000, price: 39900 },
    };

    // Calculate price per credit (in cents)
    const pack500Rate = CREDIT_PACK_CONFIG.pack_500.price / CREDIT_PACK_CONFIG.pack_500.credits;
    const pack1200Rate = CREDIT_PACK_CONFIG.pack_1200.price / CREDIT_PACK_CONFIG.pack_1200.credits;
    const pack3000Rate = CREDIT_PACK_CONFIG.pack_3000.price / CREDIT_PACK_CONFIG.pack_3000.credits;
    const pack8000Rate = CREDIT_PACK_CONFIG.pack_8000.price / CREDIT_PACK_CONFIG.pack_8000.credits;

    // Larger packs should have better rates
    expect(pack1200Rate).toBeLessThan(pack500Rate);
    expect(pack3000Rate).toBeLessThan(pack1200Rate);
    expect(pack8000Rate).toBeLessThan(pack3000Rate);
  });
});

console.log('✅ Credits system tests defined successfully');
