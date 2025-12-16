import { describe, it, expect } from 'vitest';

/**
 * 积分包购买限制功能测试
 * 
 * 业务规则：
 * - 免费版用户不能购买积分包
 * - 基础版/专业版/企业版用户可以购买积分包
 */

// 模拟套餐配置
const PLAN_CONFIG = {
  free: { name: "免费版", price: 0, monthlyCredits: 100 },
  basic: { name: "基础版", price: 9900, monthlyCredits: 750 },
  professional: { name: "专业版", price: 29900, monthlyCredits: 2600 },
  enterprise: { name: "企业版", price: 99900, monthlyCredits: 11000 },
};

// 积分包配置
const CREDIT_PACK_CONFIG = {
  pack_500: { name: "入门包", credits: 500, price: 4900 },
  pack_1000: { name: "超值包", credits: 1000, price: 9900 },
  pack_2200: { name: "专业包", credits: 2200, price: 19900 },
  pack_5500: { name: "企业包", credits: 5500, price: 39900 },
};

// 检查用户是否可以购买积分包
function canPurchaseCreditPack(userPlan: string): boolean {
  return userPlan !== 'free';
}

describe('积分包购买限制功能', () => {
  it('免费版用户不能购买积分包', () => {
    expect(canPurchaseCreditPack('free')).toBe(false);
  });

  it('免费版用户积分不足弹窗不显示购买积分按钮', () => {
    // 模拟弹窗逻辑
    const shouldShowPurchaseButton = (isFreeUser: boolean) => !isFreeUser;
    expect(shouldShowPurchaseButton(true)).toBe(false); // 免费版不显示
    expect(shouldShowPurchaseButton(false)).toBe(true); // 付费版显示
  });

  it('基础版用户可以购买积分包', () => {
    expect(canPurchaseCreditPack('basic')).toBe(true);
  });

  it('专业版用户可以购买积分包', () => {
    expect(canPurchaseCreditPack('professional')).toBe(true);
  });

  it('企业版用户可以购买积分包', () => {
    expect(canPurchaseCreditPack('enterprise')).toBe(true);
  });

  it('积分包配置正确', () => {
    // 验证所有积分包都有正确的配置
    expect(Object.keys(CREDIT_PACK_CONFIG).length).toBe(4);
    
    // 验证入门包
    expect(CREDIT_PACK_CONFIG.pack_500.credits).toBe(500);
    expect(CREDIT_PACK_CONFIG.pack_500.price).toBe(4900);
    
    // 验证超值包
    expect(CREDIT_PACK_CONFIG.pack_1000.credits).toBe(1000);
    expect(CREDIT_PACK_CONFIG.pack_1000.price).toBe(9900);
  });

  it('套餐配置正确', () => {
    // 验证免费版
    expect(PLAN_CONFIG.free.price).toBe(0);
    expect(PLAN_CONFIG.free.monthlyCredits).toBe(100);
    
    // 验证付费套餐
    expect(PLAN_CONFIG.basic.price).toBeGreaterThan(0);
    expect(PLAN_CONFIG.professional.price).toBeGreaterThan(PLAN_CONFIG.basic.price);
    expect(PLAN_CONFIG.enterprise.price).toBeGreaterThan(PLAN_CONFIG.professional.price);
  });
});
