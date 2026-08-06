import { describe, expect, it } from "vitest";
import {
  clearBusinessPlanDraft,
  getRestorableBusinessPlanUnitIndex,
  loadBusinessPlanDraft,
  saveBusinessPlanDraft,
} from "../client/src/lib/businessPlanDraft";
import {
  BUSINESS_PLAN_QUESTIONS,
  BUSINESS_PLAN_SECTIONS,
} from "../client/src/pages/businessPlanQuestionnaire";
import { resolveBusinessPlanSingleOption } from "../client/src/pages/businessPlanConversationProtocol";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("business plan conversation", () => {
  it("defines nine sections and all 36 configured questions", () => {
    expect(BUSINESS_PLAN_SECTIONS).toHaveLength(9);
    expect(BUSINESS_PLAN_QUESTIONS).toHaveLength(36);
    expect(new Set(BUSINESS_PLAN_QUESTIONS.map(question => question.type))).toEqual(
      new Set(["text", "textarea", "single", "card-list", "score-matrix", "table"])
    );
  });

  it("resolves letter replies to the complete single-choice value", () => {
    const options = ["主要是企业客户", "主要是个人消费者", "两者都有"];
    expect(resolveBusinessPlanSingleOption("B", options)).toBe("主要是个人消费者");
    expect(resolveBusinessPlanSingleOption("两者都有", options)).toBe("两者都有");
    expect(resolveBusinessPlanSingleOption("Z", options)).toBeNull();
  });

  it("persists and clears a BP draft without using the diagnosis key", () => {
    const storage = createStorage();
    const draft = { conversationUnitIndex: 3, answers: {}, customValues: {} };
    saveBusinessPlanDraft(draft, storage);
    expect(loadBusinessPlanDraft(storage)).toEqual(draft);
    expect(storage.getItem("zesai_business_plan_draft_v1")).not.toBeNull();
    expect(storage.getItem("zesai-diagnosis-draft-v1")).toBeNull();
    clearBusinessPlanDraft(storage);
    expect(loadBusinessPlanDraft(storage)).toBeNull();
  });

  it("does not restore a stale position beyond consecutively answered units", () => {
    const unitIds = ["one", "two", "three"];
    expect(getRestorableBusinessPlanUnitIndex(3, {}, unitIds)).toBe(0);
    expect(getRestorableBusinessPlanUnitIndex(3, { one: "a", two: "b" }, unitIds)).toBe(2);
  });
});
