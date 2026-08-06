import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  clearBusinessPlanDraft,
  getRestorableBusinessPlanUnitIndex,
  loadBusinessPlanDraft,
  saveBusinessPlanDraft,
} from "../client/src/lib/businessPlanDraft";
import { BUSINESS_PLAN_SECTIONS } from "../client/src/pages/businessPlanQuestionnaire";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

function read(relativePath: string): string {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("business plan conversation skeleton", () => {
  it("defines nine empty BP sections with conversation intros", () => {
    expect(
      BUSINESS_PLAN_SECTIONS.map(section => [section.id, section.title])
    ).toEqual([
      ["cover", "封面信息"],
      ["demand", "需求"],
      ["product", "产品与商业模式"],
      ["market", "市场规模"],
      ["competition", "竞争"],
      ["traction", "目前状况"],
      ["plan", "未来规划"],
      ["funding", "融资计划"],
      ["team", "团队与联系方式"],
    ]);
    expect(
      BUSINESS_PLAN_SECTIONS.every(
        section =>
          typeof section.intro === "string" && section.questions.length === 0
      )
    ).toBe(true);
  });

  it("persists and clears a BP draft without using the diagnosis key", () => {
    const storage = createStorage();
    const draft = {
      conversationUnitIndex: 3,
      answers: {},
      customValues: {},
    };

    saveBusinessPlanDraft(draft, storage);
    expect(loadBusinessPlanDraft(storage)).toEqual(draft);
    expect(storage.getItem("zesai_business_plan_draft_v1")).not.toBeNull();
    expect(storage.getItem("zesai-diagnosis-draft-v1")).toBeNull();
    clearBusinessPlanDraft(storage);
    expect(loadBusinessPlanDraft(storage)).toBeNull();
  });

  it("does not restore a stale position beyond consecutively answered units", () => {
    const unitIds = [
      "placeholder-cover",
      "placeholder-demand",
      "placeholder-product",
    ];

    expect(getRestorableBusinessPlanUnitIndex(3, {}, unitIds)).toBe(0);
    expect(
      getRestorableBusinessPlanUnitIndex(
        3,
        {
          "placeholder-cover": "已完成",
          "placeholder-demand": "已完成",
        },
        unitIds
      )
    ).toBe(2);
  });

  it("renders an append-only placeholder conversation and registers its route", () => {
    const page = read("../client/src/pages/BusinessPlanConversation.tsx");
    const app = read("../client/src/App.tsx");

    expect(page).toContain("{completedQuestionCount} / {TOTAL_QUESTIONS} 题");
    expect(page).toContain("（题目待实现）");
    expect(page).toContain("visibleUnits");
    expect(page).toContain("UserBubble");
    expect(page).toContain("editCompletedUnit");
    expect(page).toContain("sectionIntro");
    expect(page).toContain("下一题");
    expect(page).toContain("阶段二接入真实题目控件后删除");
    expect(page).toContain("saveBusinessPlanDraft");
    expect(page).not.toContain("trpc.");
    expect(app).toContain('path="/business-plan/conversation"');
    expect(app).toContain("component={BusinessPlanConversation}");
  });
});
