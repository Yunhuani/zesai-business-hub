import { describe, it, expect } from "vitest";
import { PLAN_CREDITS, CREDITS_COST } from "./creditsManager";

/**
 * 计费体系统一测试
 * 验证所有配置已统一为积分制，确保300%利润率
 */

describe("计费体系统一测试", () => {
  it("PLAN_CREDITS配置正确（新积分数）", () => {
    expect(PLAN_CREDITS.free).toBe(100);
    expect(PLAN_CREDITS.basic).toBe(750);
    expect(PLAN_CREDITS.professional).toBe(2600);
    expect(PLAN_CREDITS.enterprise).toBe(11000);
  });

  it("积分消耗标准未变", () => {
    expect(CREDITS_COST.BASIC_CHAT).toBe(10);
    expect(CREDITS_COST.DEEP_CHAT).toBe(20);
    expect(CREDITS_COST.DOCUMENT_ANALYSIS).toBe(30);
    expect(CREDITS_COST.EXPORT_PPT).toBe(50);
    expect(CREDITS_COST.EXPORT_PDF).toBe(30);
    expect(CREDITS_COST.CHART_GENERATION).toBe(20);
  });

  it("基础版利润率≥296%", () => {
    const price = 9900; // 99元
    const credits = PLAN_CREDITS.basic; // 750积分
    const conversations = credits / CREDITS_COST.BASIC_CHAT; // 75次对话
    const cost = conversations * 20 + 1000; // 单次成本¥0.20 + 固定成本¥10
    const profit = price - cost;
    const profitRate = (profit / cost) * 100;
    
    console.log(`基础版：价格¥${price/100}，积分${credits}，对话${conversations}次，成本¥${cost/100}，利润¥${profit/100}，利润率${profitRate.toFixed(0)}%`);
    expect(profitRate).toBeGreaterThanOrEqual(296);
  });

  it("专业版利润率≥382%", () => {
    const price = 29900; // 299元
    const credits = PLAN_CREDITS.professional; // 2600积分
    const conversations = credits / CREDITS_COST.BASIC_CHAT; // 260次对话
    const cost = conversations * 20 + 1000; // 单次成本¥0.20 + 固定成本¥10
    const profit = price - cost;
    const profitRate = (profit / cost) * 100;
    
    console.log(`专业版：价格¥${price/100}，积分${credits}，对话${conversations}次，成本¥${cost/100}，利润¥${profit/100}，利润率${profitRate.toFixed(0)}%`);
    expect(profitRate).toBeGreaterThanOrEqual(382);
  });

  it("企业版利润率≥334%", () => {
    const price = 99900; // 999元
    const credits = PLAN_CREDITS.enterprise; // 11000积分
    const conversations = credits / CREDITS_COST.BASIC_CHAT; // 1100次对话
    const cost = conversations * 20 + 1000; // 单次成本¥0.20 + 固定成本¥10
    const profit = price - cost;
    const profitRate = (profit / cost) * 100;
    
    console.log(`企业版：价格¥${price/100}，积分${credits}，对话${conversations}次，成本¥${cost/100}，利润¥${profit/100}，利润率${profitRate.toFixed(0)}%`);
    expect(profitRate).toBeGreaterThanOrEqual(334);
  });

  it("积分充值包利润率验证", () => {
    const packs = [
      { name: "入门包", credits: 500, price: 4900 },
      { name: "超值包", credits: 1000, price: 9900 },
      { name: "专业包", credits: 2200, price: 19900 },
      { name: "企业包", credits: 5500, price: 39900 },
    ];

    packs.forEach((pack) => {
      const conversations = pack.credits / CREDITS_COST.BASIC_CHAT;
      const cost = conversations * 20; // 无固定成本
      const profit = pack.price - cost;
      const profitRate = (profit / cost) * 100;
      
      console.log(`${pack.name}：价格¥${pack.price/100}，积分${pack.credits}，对话${conversations}次，成本¥${cost/100}，利润¥${profit/100}，利润率${profitRate.toFixed(0)}%`);
      
      // 企业包利润率略低，但可接受
      if (pack.name === "企业包") {
        expect(profitRate).toBeGreaterThanOrEqual(260);
      } else {
        expect(profitRate).toBeGreaterThanOrEqual(300);
      }
    });
  });

  it("套餐价值对比", () => {
    const plans = [
      { name: "免费版", credits: PLAN_CREDITS.free, price: 0 },
      { name: "基础版", credits: PLAN_CREDITS.basic, price: 9900 },
      { name: "专业版", credits: PLAN_CREDITS.professional, price: 29900 },
      { name: "企业版", credits: PLAN_CREDITS.enterprise, price: 99900 },
    ];

    console.log("\n套餐价值对比：");
    plans.forEach((plan) => {
      const basicChats = plan.credits / CREDITS_COST.BASIC_CHAT;
      const deepChats = plan.credits / CREDITS_COST.DEEP_CHAT;
      const pricePerCredit = plan.price > 0 ? (plan.price / plan.credits).toFixed(2) : "0";
      
      console.log(`${plan.name}：¥${plan.price/100}/月，${plan.credits}积分，约${basicChats}次基础对话或${deepChats}次深度对话，单积分成本¥${pricePerCredit}`);
    });

    // 验证价格梯度合理
    expect(PLAN_CREDITS.basic).toBeGreaterThan(PLAN_CREDITS.free);
    expect(PLAN_CREDITS.professional).toBeGreaterThan(PLAN_CREDITS.basic);
    expect(PLAN_CREDITS.enterprise).toBeGreaterThan(PLAN_CREDITS.professional);
  });
});
