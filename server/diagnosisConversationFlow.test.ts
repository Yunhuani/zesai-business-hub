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
    expect(CONVERSATION_OPENING).toContain("您好，我是您的泽思增长顾问。");
    expect(CONVERSATION_OPENING).toContain("用泽思 NBG 五维增长模型做诊断");
    expect(CONVERSATION_OPENING).toContain("把过去要花几万块请咨询公司才能得到的诊断，用 AI 做到人人可及");
    expect(CONVERSATION_OPENING).toContain("严格保密");
    expect(CONVERSATION_OPENING).toContain("那我们开始吧。");
    expect(units.filter((unit, index) => index === 0 || unit.section !== units[index - 1].section)
      .map(unit => unit.sectionIntro)).toEqual([
        "先从一些基本情况聊起，让我对您的公司有个整体印象。",
        "接下来，我们看看您所在的市场，以及您面对的竞争。",
        "下面聊聊您这门生意——是怎么赚钱的、靠什么留住客户的。",
        "一门生意能不能做大，很大程度看内部。我们来盘一盘您的团队和能力。",
        "接下来是财务部分。这块最能反映生意的健康度，也最敏感——请放心，这些数据我们严格保密，只用于本次诊断。",
        "最后，我想听听您自己的想法。",
      ]);
  });

  it("applies the approved copy only to conversation units", () => {
    const flowQuestions = new Map(
      units.flatMap(unit => unit.questions.map(question => [question.id, question]))
    );
    const sourceQuestions = new Map(
      DIAGNOSIS_STEPS.flatMap(step => step.questions.map(question => [question.id, question]))
    );

    expect(flowQuestions.get("company-name")?.label).toBe("首先，请问您公司叫什么名字？");
    expect(flowQuestions.get("revenue-band")?.label).toBe("去年公司的营收大概是多少，在哪个区间？");
    expect(flowQuestions.get("competitors")?.label).toBe("主要的竞争对手有哪些？请写出前三家竞争对手的公司名或品牌名。");
    expect(flowQuestions.get("finance-product-lines")?.label).toContain("最多可以填 6 条");
    expect(flowQuestions.get("top-anxiety")?.label).toBe("最后我想听您说说心里话：当前您最焦虑、最想解决的一件事是什么？");

    expect(sourceQuestions.get("company-name")?.label).toBe("公司名称");
    expect(sourceQuestions.get("revenue-band")?.label).toBe("去年大致营收区间？");
    expect(sourceQuestions.get("competitors")?.label).toBe("主要竞争对手有哪些？");
    expect(sourceQuestions.get("finance-product-lines")?.label).toBe("主要产品线的收入与成本明细");

    expect(flowQuestions.get("expansion-intent")).toEqual(sourceQuestions.get("expansion-intent"));
    expect(flowQuestions.get("revenue-band") && "options" in flowQuestions.get("revenue-band")!)
      .toBe(true);
    expect((flowQuestions.get("revenue-band") as { options: string[] }).options)
      .toEqual((sourceQuestions.get("revenue-band") as { options: string[] }).options);
  });

  it("uses distinct conversation-only matrix follow-up placeholders", () => {
    const team = units.find(unit => unit.id === "team-structure")?.questions[0];
    const functions = units.find(unit => unit.id === "function-strength")?.questions[0];

    expect(team && "customPlaceholder" in team ? team.customPlaceholder : null)
      .toBe("关于团队，还有什么想补充的吗？（选填）");
    expect(functions && "customPlaceholder" in functions ? functions.customPlaceholder : null)
      .toBe("关于这些能力，还有什么想补充的吗？（选填）");
  });
});
