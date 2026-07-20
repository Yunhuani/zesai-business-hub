import { describe, expect, it } from "vitest";
import {
  CONVERSATION_OPENING,
  buildDiagnosisConversationUnits,
} from "../client/src/pages/diagnosisConversationFlow";
import { DIAGNOSIS_STEPS } from "../client/src/pages/diagnosisQuestionnaire";

describe("diagnosis conversation flow", () => {
  const units = buildDiagnosisConversationUnits(DIAGNOSIS_STEPS);

  it("derives every questionnaire question exactly once without changing the source steps", () => {
    const sourceIds = DIAGNOSIS_STEPS.flatMap(step => step.questions.map(question => question.id));
    const flowIds = units.flatMap(unit => unit.questions.map(question => question.id));

    expect(flowIds.toSorted()).toEqual(sourceIds.toSorted());
    expect(new Set(flowIds).size).toBe(flowIds.length);
    expect(DIAGNOSIS_STEPS[3].questions.map(question => question.id)).toEqual([
      "channels",
      "top-anxiety",
    ]);
  });

  it("puts anxiety last and keeps the two capability matrices as separate units", () => {
    expect(units.at(-1)?.questions.map(question => question.id)).toEqual(["top-anxiety"]);

    const teamIndex = units.findIndex(unit => unit.id === "team-structure");
    const functionIndex = units.findIndex(unit => unit.id === "function-strength");
    expect(functionIndex).toBe(teamIndex + 1);
    expect(units[teamIndex].questions).toHaveLength(1);
    expect(units[functionIndex].questions).toHaveLength(1);
  });

  it("shows one question per unit except the deliberately paired AR fields", () => {
    expect(units.filter(unit => unit.questions.length > 1).map(unit => unit.id)).toEqual([
      "finance-plus-ar",
    ]);
    expect(units.find(unit => unit.id === "finance-plus-ar")?.questions.map(question => question.id)).toEqual([
      "ar-balance",
      "ar-days",
    ]);
  });

  it("adds the approved opening and section transitions", () => {
    expect(CONVERSATION_OPENING).toContain("五个维度");
    expect(CONVERSATION_OPENING).toContain("严格保密");
    expect(CONVERSATION_OPENING).toContain("加密存储");
    expect(units.filter((unit, index) => index === 0 || unit.section !== units[index - 1].section)
      .map(unit => unit.sectionIntro)).toEqual([
        "先了解一下你公司的基本情况。",
        "接下来看看你的市场和竞争。",
        "聊聊你的生意怎么做。",
        "看看团队和内部能力。",
        "下面是财务部分，这些数据我们严格保密，仅用于本次诊断。",
        "最后一个开放问题。",
      ]);
  });
});
