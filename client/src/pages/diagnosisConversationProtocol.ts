import type { DiagnosisDraftAnswer } from "@/lib/diagnosisDraft";
import type { ChoiceQuestion, TextQuestion } from "./diagnosisQuestionnaire";

export type ConversationAnswers = Record<string, DiagnosisDraftAnswer>;

export type ChoiceReplyResult =
  | { matched: true; answers: ConversationAnswers; value: string }
  | { matched: false; answers: ConversationAnswers };

export function getChoiceLetter(index: number): string {
  return String.fromCharCode(65 + index);
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
