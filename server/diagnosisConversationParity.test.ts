import { describe, expect, it } from "vitest";
import {
  applyConversationChoiceReply,
  applyConversationNumberAnswer,
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
});
