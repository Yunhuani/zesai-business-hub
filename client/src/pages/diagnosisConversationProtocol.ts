import type { DiagnosisDraftAnswer, FinanceRowAnswer } from "@/lib/diagnosisDraft";
import type { ChoiceQuestion, FinanceTableQuestion, TextQuestion } from "./diagnosisQuestionnaire";

export type ConversationAnswers = Record<string, DiagnosisDraftAnswer>;
export type ConversationCustomValues = Record<string, string>;

export type ChoiceReplyResult =
  | { matched: true; answers: ConversationAnswers; value: string }
  | { matched: false; answers: ConversationAnswers };

export function getChoiceLetter(index: number): string {
  return String.fromCharCode(65 + index);
}

export type ConversationPosition = {
  unitIndex: number;
  editingUnitIndex: number | null;
};

export function completeConversationPosition(
  position: ConversationPosition,
  totalUnits: number
): ConversationPosition {
  if (position.editingUnitIndex !== null) {
    return { unitIndex: position.unitIndex, editingUnitIndex: null };
  }
  return {
    unitIndex: Math.min(position.unitIndex + 1, totalUnits),
    editingUnitIndex: null,
  };
}

export function getConversationChoiceEditReply(
  question: ChoiceQuestion,
  answers: ConversationAnswers,
  customValues: ConversationCustomValues
): string {
  const answer = answers[question.field];
  const values = Array.isArray(answer) ? answer : typeof answer === "string" ? [answer] : [];
  const letters = values
    .map(value => question.options.indexOf(String(value)))
    .filter(index => index >= 0)
    .map(getChoiceLetter);
  const customValue = customValues[question.field]?.trim();
  return [letters.join(" "), customValue ? `其他：${customValue}` : ""]
    .filter(Boolean)
    .join(" ");
}

export function applyConversationChoiceReply(
  answers: ConversationAnswers,
  question: ChoiceQuestion,
  reply: string
): ChoiceReplyResult {
  const normalized = reply.trim().toUpperCase();
  if (!/^[A-Z]$/.test(normalized)) {
    return { matched: false, answers };
  }

  const value = question.options[normalized.charCodeAt(0) - 65];
  if (!value) {
    return { matched: false, answers };
  }

  return {
    matched: true,
    answers: { ...answers, [question.field]: value },
    value,
  };
}

export function applyConversationNumberAnswer(
  answers: ConversationAnswers,
  question: TextQuestion,
  value: string
): ConversationAnswers {
  return { ...answers, [question.field]: value };
}

export type MultiReplyResult =
  | {
      matched: true;
      answers: ConversationAnswers;
      customValues: ConversationCustomValues;
      values: string[];
    }
  | {
      matched: false;
      answers: ConversationAnswers;
      customValues: ConversationCustomValues;
    };

export function applyConversationMultiReply(
  answers: ConversationAnswers,
  customValues: ConversationCustomValues,
  question: ChoiceQuestion,
  reply: string
): MultiReplyResult {
  const customMatch = reply.match(/其他\s*[:：]\s*(.+)\s*$/);
  const customValue = customMatch?.[1]?.trim() ?? "";
  const letterPart = customMatch ? reply.slice(0, customMatch.index).trim() : reply.trim();
  const normalized = letterPart.replace(/[\s,，、/]+/g, "").toUpperCase();

  if ((!normalized && !customValue) || (normalized && !/^[A-Z]+$/.test(normalized))) {
    return { matched: false, answers, customValues };
  }

  const indices = [...new Set([...normalized].map(letter => letter.charCodeAt(0) - 65))];
  if (indices.some(index => !question.options[index])) {
    return { matched: false, answers, customValues };
  }

  const values = indices.map(index => question.options[index]);
  const nextCustomValues = { ...customValues };
  if (customValue) {
    nextCustomValues[question.field] = customValue;
  } else {
    delete nextCustomValues[question.field];
  }

  return {
    matched: true,
    answers: values.length > 0 ? { ...answers, [question.field]: values } : answers,
    customValues: nextCustomValues,
    values,
  };
}

export function applyConversationTextAnswer(
  answers: ConversationAnswers,
  question: TextQuestion,
  value: string
): ConversationAnswers {
  return { ...answers, [question.field]: value };
}

export function applyConversationMatrixAnswer(
  answers: ConversationAnswers,
  field: string,
  value: string
): ConversationAnswers {
  return { ...answers, [field]: value };
}

export function applyConversationFinanceRows(
  answers: ConversationAnswers,
  question: FinanceTableQuestion,
  rows: FinanceRowAnswer[]
): ConversationAnswers {
  return { ...answers, [question.field]: rows };
}
