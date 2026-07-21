import { describe, expect, it } from "vitest";
import {
  applyConversationChoiceReply,
  applyConversationFinanceRows,
  applyConversationMatrixAnswer,
  applyConversationMultiReply,
  applyConversationNumberAnswer,
  completeConversationPosition,
  getConversationChoiceEditReply,
} from "../client/src/pages/diagnosisConversationProtocol";
import { DIAGNOSIS_STEPS } from "../client/src/pages/diagnosisQuestionnaire";

describe("diagnosis conversation data parity", () => {
  const revenueQuestion = DIAGNOSIS_STEPS
    .flatMap(step => step.questions)
    .find(question => question.id === "revenue-band");
  const cashQuestion = DIAGNOSIS_STEPS
    .flatMap(step => step.questions)
    .find(question => question.id === "cash");

  it("stores the full choice value instead of the presentation letter", () => {
    expect(revenueQuestion?.type).toBe("single");
    if (!revenueQuestion || revenueQuestion.type !== "single") return;

    expect(applyConversationChoiceReply({}, revenueQuestion, " b ")).toEqual({
      matched: true,
      answers: { "company.revenue_band": "1000万–5000万" },
      value: "1000万–5000万",
    });
    expect(applyConversationChoiceReply({}, revenueQuestion, "不知道")).toEqual({
      matched: false,
      answers: {},
    });
  });

  it("exports the same answers and custom values as the legacy controls", () => {
    expect(revenueQuestion?.type).toBe("single");
    expect(cashQuestion?.type).toBe("number");
    if (
      !revenueQuestion || revenueQuestion.type !== "single" ||
      !cashQuestion || cashQuestion.type !== "number"
    ) return;

    const legacyExport = {
      answers: {
        [revenueQuestion.field]: revenueQuestion.options[1],
        [cashQuestion.field]: "320",
      },
      customValues: {},
    };
    const choiceResult = applyConversationChoiceReply({}, revenueQuestion, "B");
    expect(choiceResult.matched).toBe(true);
    if (!choiceResult.matched) return;

    const conversationExport = {
      answers: applyConversationNumberAnswer(
        choiceResult.answers,
        cashQuestion,
        "320"
      ),
      customValues: {},
    };

    expect(conversationExport).toEqual(legacyExport);
  });

  it("maps multiple letters and a custom value to the same multi-choice data", () => {
    const question = DIAGNOSIS_STEPS.flatMap(step => step.questions)
      .find(candidate => candidate.id === "region");
    expect(question?.type).toBe("multi");
    if (!question || question.type !== "multi") return;

    const legacyExport = {
      answers: { [question.field]: [question.options[0], question.options[2]] },
      customValues: { [question.field]: "长三角" },
    };
    const result = applyConversationMultiReply({}, {}, question, "A C 其他：长三角");

    expect(result.matched).toBe(true);
    if (!result.matched) return;
    expect({ answers: result.answers, customValues: result.customValues }).toEqual(legacyExport);
    expect(applyConversationMultiReply({}, {}, question, "Z")).toEqual({
      matched: false,
      answers: {},
      customValues: {},
    });
    expect(applyConversationMultiReply({}, {}, question, "b、c")).toMatchObject({
      matched: true,
      answers: { [question.field]: [question.options[1], question.options[2]] },
    });
    expect(applyConversationMultiReply({}, {}, question, "B，C")).toMatchObject({
      matched: true,
      answers: { [question.field]: [question.options[1], question.options[2]] },
    });
  });

  it("exports the same nine matrix answers and supplemental text", () => {
    const questions = DIAGNOSIS_STEPS.find(step => step.id === "capability")?.questions
      .filter(question => question.type === "matrix") ?? [];
    expect(questions).toHaveLength(2);

    let conversationAnswers = {};
    const legacyAnswers: Record<string, string> = {};
    const legacyCustomValues: Record<string, string> = {};
    for (const question of questions) {
      if (question.type !== "matrix") continue;
      question.items.forEach((item, index) => {
        const value = question.options[index % question.options.length];
        legacyAnswers[item.field] = value;
        conversationAnswers = applyConversationMatrixAnswer(conversationAnswers, item.field, value);
      });
      legacyCustomValues[question.id] = `${question.label}补充`;
    }

    expect({ answers: conversationAnswers, customValues: legacyCustomValues }).toEqual({
      answers: legacyAnswers,
      customValues: legacyCustomValues,
    });
  });

  it("exports finance table rows exactly like the legacy table controls", () => {
    const questions = DIAGNOSIS_STEPS.find(step => step.id === "business-model-plus")?.questions
      .filter(question => question.type === "finance-table") ?? [];
    expect(questions).toHaveLength(2);

    const rowsById = {
      "finance-product-lines": [
        { name: "阀门", revenue: "800", total_cost: "500" },
        { name: "法兰", revenue: "300", total_cost: "280" },
      ],
      "finance-customers": [
        { name: "客户甲", pct: "35" },
        { name: "客户乙", pct: "20" },
      ],
    };
    let conversationAnswers = {};
    const legacyAnswers: Record<string, unknown> = {};
    for (const question of questions) {
      if (question.type !== "finance-table") continue;
      const rows = rowsById[question.id as keyof typeof rowsById];
      legacyAnswers[question.field] = rows;
      conversationAnswers = applyConversationFinanceRows(conversationAnswers, question, rows);
    }

    expect({ answers: conversationAnswers, customValues: {} }).toEqual({
      answers: legacyAnswers,
      customValues: {},
    });
    expect(JSON.stringify(conversationAnswers)).not.toMatch(/direct_cost|allocated/);
  });

  it("updates an edited answer without losing later answers or progress", () => {
    expect(revenueQuestion?.type).toBe("single");
    if (!revenueQuestion || revenueQuestion.type !== "single") return;

    const existingAnswers = {
      [revenueQuestion.field]: revenueQuestion.options[0],
      "finance_basic.cash": "320",
    };
    const result = applyConversationChoiceReply(existingAnswers, revenueQuestion, "B");
    expect(result.matched).toBe(true);
    if (!result.matched) return;

    expect(result.answers).toEqual({
      [revenueQuestion.field]: revenueQuestion.options[1],
      "finance_basic.cash": "320",
    });
    expect(completeConversationPosition({ unitIndex: 20, editingUnitIndex: 2 }, 25)).toEqual({
      unitIndex: 20,
      editingUnitIndex: null,
    });
  });

  it("restores existing choice answers as presentation letters for editing", () => {
    expect(revenueQuestion?.type).toBe("single");
    const regionQuestion = DIAGNOSIS_STEPS.flatMap(step => step.questions)
      .find(candidate => candidate.id === "region");
    expect(regionQuestion?.type).toBe("multi");
    if (
      !revenueQuestion || revenueQuestion.type !== "single" ||
      !regionQuestion || regionQuestion.type !== "multi"
    ) return;

    expect(getConversationChoiceEditReply(
      revenueQuestion,
      { [revenueQuestion.field]: revenueQuestion.options[1] },
      {}
    )).toBe("B");
    expect(getConversationChoiceEditReply(
      regionQuestion,
      { [regionQuestion.field]: [regionQuestion.options[1], regionQuestion.options[2]] },
      { [regionQuestion.field]: "长三角" }
    )).toBe("B C 其他：长三角");

    const clearedCustom = applyConversationMultiReply(
      { [regionQuestion.field]: [regionQuestion.options[1]] },
      { [regionQuestion.field]: "长三角" },
      regionQuestion,
      "C"
    );
    expect(clearedCustom.matched).toBe(true);
    if (!clearedCustom.matched) return;
    expect(clearedCustom.customValues).toEqual({});
  });
});
