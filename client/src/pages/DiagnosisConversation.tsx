import { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUp, Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO_FULL } from "@/const";
import { DiagnosisInsufficientDialog } from "@/components/DiagnosisInsufficientDialog";
import {
  clearDiagnosisDraft,
  loadDiagnosisDraft,
  saveDiagnosisDraft,
  type DiagnosisDraft,
  type DiagnosisDraftAnswer,
  type FinanceRowAnswer,
} from "@/lib/diagnosisDraft";
import {
  createDiagnosisDraftSaveQueue,
  hasDiagnosisDraftContent,
  hydrateDiagnosisDraft,
} from "@/lib/diagnosisDraftSync";
import { rememberLoginReturnPath } from "@/lib/loginReturn";
import {
  parseDiagnosisInsufficientCredits,
  type DiagnosisInsufficientCredits,
} from "@/lib/diagnosisSubmissionError";
import { trpc } from "@/lib/trpc";
import { getDiagnosisFollowUpHint } from "@shared/diagnosisFollowUpHint";
import { validateCurrentStep } from "./Diagnosis";
import {
  CONVERSATION_OPENING,
  buildDiagnosisConversationUnits,
  getConversationValidationStep,
  type DiagnosisConversationUnit,
} from "./diagnosisConversationFlow";
import {
  applyConversationChoiceReply,
  applyConversationFinanceRows,
  applyConversationMatrixAnswer,
  applyConversationMultiReply,
  applyConversationNumberAnswer,
  applyConversationTextAnswer,
  completeConversationPosition,
  getChoiceLetter,
  getConversationChoiceEditReply,
} from "./diagnosisConversationProtocol";
import {
  DIAGNOSIS_STEPS,
  type ChoiceQuestion,
  type FinanceTableQuestion,
  type MatrixQuestion,
  type TextQuestion,
} from "./diagnosisQuestionnaire";

type Answers = Record<string, DiagnosisDraftAnswer>;

const CONVERSATION_UNITS = buildDiagnosisConversationUnits(DIAGNOSIS_STEPS);
const TOTAL_QUESTIONS = CONVERSATION_UNITS.reduce(
  (total, unit) => total + unit.questions.length,
  0,
);

function getStringAnswer(answers: Answers, field: string): string {
  const value = answers[field];
  return typeof value === "string" ? value : "";
}

function getStringArrayAnswer(answers: Answers, field: string): string[] {
  const value = answers[field];
  return Array.isArray(value) && value.every(item => typeof item === "string")
    ? value
    : [];
}

function getFinanceRows(answers: Answers, field: string): FinanceRowAnswer[] {
  const value = answers[field];
  return Array.isArray(value) && value.every(item => typeof item === "object")
    ? value as FinanceRowAnswer[]
    : [];
}

function getInitialUnitIndex(draft: ReturnType<typeof loadDiagnosisDraft>): number {
  if (typeof draft?.conversationUnitIndex === "number") {
    return Math.min(Math.max(draft.conversationUnitIndex, 0), CONVERSATION_UNITS.length);
  }
  if (!draft) return 0;
  const matchingIndex = CONVERSATION_UNITS.findIndex(unit => unit.stepIndex >= draft.stepIndex);
  return matchingIndex < 0 ? 0 : matchingIndex;
}

function getDraftStepIndex(unitIndex: number): number {
  return CONVERSATION_UNITS
    .slice(0, Math.min(unitIndex + 1, CONVERSATION_UNITS.length))
    .reduce((highest, unit) => Math.max(highest, unit.stepIndex), 0);
}

function getConversationPlaceholder(question: TextQuestion): string {
  if (question.field === "competition.competitors") {
    return "列出几家主要对手，公司名或品牌都行，逗号分隔";
  }
  return question.placeholder;
}

function AdvisorAvatar() {
  return (
    <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[var(--zs-primary-soft)] font-serif text-sm font-bold text-[var(--zs-primary)]">
      泽
    </div>
  );
}

function AdvisorMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <AdvisorAvatar />
      <div className="min-w-0 flex-1 pt-0.5 text-[15px] leading-7 text-[#33433b]">
        {children}
      </div>
    </div>
  );
}

function QuestionPrompt({ children, optional = false }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <p className="text-base font-semibold leading-7 text-[var(--zs-ink)]">
      {children}
      {optional ? <span className="ml-2 align-middle text-xs font-normal text-[var(--zs-sub)]">选填，可直接跳过</span> : null}
    </p>
  );
}

function SectionMarker({ children }: { children: React.ReactNode }) {
  return (
    <div className="ml-10 flex items-center gap-3 max-sm:ml-0" aria-label="访谈章节">
      <span className="shrink-0 text-xs font-semibold tracking-[0.08em] text-[var(--zs-sub)]">{children}</span>
      <span className="h-px flex-1 bg-[var(--zs-line)]" aria-hidden="true" />
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] rounded-[15px_5px_15px_15px] bg-[var(--zs-primary)] px-4 py-3 text-sm leading-6 text-white shadow-[0_15px_32px_-24px_rgba(31,61,50,.9)]">
        {children}
      </div>
    </div>
  );
}

function SkippedReply() {
  return <p className="pr-1 text-right text-xs text-[var(--zs-weak)]">（已跳过）</p>;
}

function ContinueButton({ onClick, label = "继续" }: { onClick: () => void; label?: string }) {
  const isSkip = label === "跳过";
  return (
    <button
      type="button"
      data-testid="continue-button"
      onClick={onClick}
      className={isSkip
        ? "mt-3 inline-flex items-center rounded-lg border border-[var(--zs-line)] bg-transparent px-3 py-2 text-xs font-medium text-[var(--zs-sub)] transition-colors hover:border-[#b9c4bd] hover:bg-white hover:text-[var(--zs-ink)]"
        : "mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--zs-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-[filter] hover:brightness-90"}
    >
      {label}{!isSkip ? <ArrowRight className="h-4 w-4" /> : null}
    </button>
  );
}

function ChoiceConversation({ question, answers, customValue, active, reply, onChoiceClick }: {
  question: ChoiceQuestion;
  answers: string[];
  customValue: string;
  active: boolean;
  reply: string;
  onChoiceClick: (letter: string, multi: boolean) => void;
}) {
  const displayedAnswer = [...answers, customValue].filter(Boolean).join("、");
  const customStart = reply.search(/其他\s*[:：]/);
  const letterPart = customStart >= 0 ? reply.slice(0, customStart) : reply;
  const normalizedLetters = letterPart.replace(/[\s,，、/]+/g, "").toUpperCase();
  const selectedLetters = new Set(/^[A-Z]*$/.test(normalizedLetters) ? normalizedLetters : "");
  return (
    <div className="space-y-4">
      <AdvisorMessage>
        <QuestionPrompt>{question.label}</QuestionPrompt>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {question.options.map((option, index) => {
            const letter = getChoiceLetter(index);
            const selected = active && selectedLetters.has(letter);
            return (
              <button
                key={option}
                type="button"
                data-testid={`option-${index}`}
                disabled={!active}
                aria-pressed={active ? selected : undefined}
                onClick={() => onChoiceClick(letter, question.type === "multi")}
                className={`flex min-h-11 items-center rounded-xl border px-3.5 py-2.5 text-left text-sm transition-[border-color,background-color,box-shadow,transform] ${
                  selected
                    ? "border-[rgba(31,61,50,.45)] bg-[var(--zs-primary-soft)] text-[var(--zs-ink)] shadow-[0_8px_20px_-18px_rgba(31,61,50,.8)]"
                    : "border-[var(--zs-line)] bg-white/80 text-[#405148] enabled:hover:-translate-y-px enabled:hover:border-[#b9c7bf] enabled:hover:bg-white enabled:hover:shadow-[0_10px_24px_-20px_rgba(31,61,50,.65)]"
                } disabled:cursor-default`}
              >
                <strong className="mr-2.5 text-[var(--zs-primary)]">{letter}.</strong>
                {option}
              </button>
            );
          })}
        </div>
        {active ? (
          <p className="mt-3 border-l-2 border-[rgba(201,162,75,.58)] bg-white/55 px-3 py-2 text-xs text-[var(--zs-sub)]">
            {question.type === "multi"
              ? "可回复多个字母，如 A C；自定义请写“其他：内容”"
              : "回复对应字母即可，如 A"}
          </p>
        ) : null}
      </AdvisorMessage>
      {!active && displayedAnswer ? <UserBubble>{displayedAnswer}</UserBubble> : null}
    </div>
  );
}

function TextConversation({ question, value, active }: {
  question: TextQuestion;
  value: string;
  active: boolean;
}) {
  return (
    <div className="space-y-4">
      <AdvisorMessage>
        <QuestionPrompt optional={question.optional}>{question.label}</QuestionPrompt>
      </AdvisorMessage>
      {!active && value ? <UserBubble>{value}</UserBubble> : null}
      {!active && !value ? <SkippedReply /> : null}
    </div>
  );
}

function NumberConversation({ question, value, active, editing, onChange, onContinue }: {
  question: TextQuestion;
  value: string;
  active: boolean;
  editing: boolean;
  onChange: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <AdvisorMessage>
        <QuestionPrompt optional={question.optional}>{question.label}</QuestionPrompt>
        {active && question.helperText ? <p className="mt-1 text-xs text-[var(--zs-sub)]">{question.helperText}</p> : null}
      </AdvisorMessage>
      {active ? (
        <div className="ml-[57px] max-sm:ml-0">
          <div className="relative rounded-2xl border border-[var(--zs-line)] bg-white p-3 shadow-[var(--zs-shadow-card)]">
            <input
              type="number"
              data-testid="number-input"
              inputMode="decimal"
              min={question.min}
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder={question.placeholder}
              className="h-12 w-full rounded-xl border border-[var(--zs-line)] px-4 pr-28 text-base font-semibold outline-none focus:border-[var(--zs-primary)]"
            />
            {question.unit ? <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs text-[var(--zs-sub)]">{question.unit}</span> : null}
          </div>
          <ContinueButton onClick={onContinue} label={editing ? "保存修改" : question.optional && !value ? "跳过" : "继续"} />
        </div>
      ) : value ? (
        <UserBubble>{value}{question.unit ? ` ${question.unit}` : ""}</UserBubble>
      ) : <SkippedReply />}
    </div>
  );
}

function MatrixConversation({ question, answers, customValue, active, editing, onAnswer, onCustomValue, onContinue }: {
  question: MatrixQuestion;
  answers: Answers;
  customValue: string;
  active: boolean;
  editing: boolean;
  onAnswer: (field: string, value: string) => void;
  onCustomValue: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <AdvisorMessage><QuestionPrompt>{question.label}</QuestionPrompt></AdvisorMessage>
      {active ? (
        <div className="ml-[57px] max-sm:ml-0">
          <div className="overflow-x-auto rounded-2xl border border-[var(--zs-line)] bg-white shadow-[var(--zs-shadow-card)]">
            <div className="min-w-[540px]">
              <div className="grid grid-cols-[1fr_repeat(4,64px)] bg-[#f6f7f3] px-3 py-2 text-center text-xs text-[var(--zs-sub)]">
                <span />{question.options.map(option => <span key={option}>{option}</span>)}
              </div>
              {question.items.map(item => (
                <div key={item.field} className="grid grid-cols-[1fr_repeat(4,64px)] items-center border-t border-[var(--zs-line)] px-3 py-2">
                  <span className="text-sm">{item.label}</span>
                  {question.options.map((option, optionIndex) => (
                    <label key={option} className="grid place-items-center">
                      <input type="radio" name={item.field} data-testid={`matrix-${item.field}-${optionIndex}`} checked={getStringAnswer(answers, item.field) === option} onChange={() => onAnswer(item.field, option)} className="accent-[var(--zs-primary)]" />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <input value={customValue} onChange={event => onCustomValue(event.target.value)} placeholder={question.customPlaceholder} className="m-3 h-10 w-[calc(100%-1.5rem)] rounded-lg border border-[var(--zs-line)] px-3 text-sm outline-none focus:border-[var(--zs-primary)]" />
          </div>
          <ContinueButton onClick={onContinue} label={editing ? "保存修改" : "继续"} />
        </div>
      ) : (
        <UserBubble>{question.id === "team-structure" ? "团队结构评估已完成" : "职能能力评估已完成"}</UserBubble>
      )}
    </div>
  );
}

function createEmptyFinanceRow(question: FinanceTableQuestion): FinanceRowAnswer {
  return Object.fromEntries(question.columns.map(column => [column.key, ""]));
}

function FinanceTableConversation({ question, rows, active, editing, onChange, onContinue }: {
  question: FinanceTableQuestion;
  rows: FinanceRowAnswer[];
  active: boolean;
  editing: boolean;
  onChange: (rows: FinanceRowAnswer[]) => void;
  onContinue: () => void;
}) {
  const visibleRows = rows.length ? rows : [createEmptyFinanceRow(question)];
  const filledCount = visibleRows.filter(row =>
    question.columns.some(column => String(row[column.key] ?? "").trim())
  ).length;
  const updateCell = (rowIndex: number, key: string, value: string) => {
    onChange(visibleRows.map((row, index) => index === rowIndex ? { ...row, [key]: value } : row));
  };

  return (
    <div className="space-y-4">
      <AdvisorMessage>
        <QuestionPrompt>{question.label}</QuestionPrompt>
        {active && question.helperText ? <p className="mt-1 text-xs text-[var(--zs-sub)]">{question.helperText}</p> : null}
      </AdvisorMessage>
      {active ? (
        <div className="ml-[57px] max-sm:ml-0">
          <div className="overflow-x-auto rounded-2xl border border-[var(--zs-line)] bg-white shadow-[var(--zs-shadow-card)]">
            <table className="min-w-[620px] w-full text-left text-xs">
              <thead className="bg-[#f6f7f3] text-[var(--zs-sub)]"><tr>{question.columns.map(column => <th key={column.key} className="px-3 py-2">{column.label}{column.unit ? `（${column.unit}）` : ""}</th>)}<th className="w-12" /></tr></thead>
              <tbody>{visibleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-[var(--zs-line)]">
                  {question.columns.map(column => <td key={column.key} className="p-2"><input type={column.inputType} data-testid={`table-${rowIndex}-${column.key}`} value={String(row[column.key] ?? "")} onChange={event => updateCell(rowIndex, column.key, event.target.value)} className="h-9 w-full min-w-[92px] rounded-lg border border-[var(--zs-line)] px-2 outline-none focus:border-[var(--zs-primary)]" /></td>)}
                  <td><button type="button" data-testid="table-remove-row" onClick={() => onChange(visibleRows.filter((_, index) => index !== rowIndex))} className="p-2 text-[var(--zs-sub)]" aria-label="删除行"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(!question.maxRows || visibleRows.length < question.maxRows) ? <button type="button" data-testid="table-add-row" onClick={() => onChange([...visibleRows, createEmptyFinanceRow(question)])} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[rgba(31,61,50,.2)] bg-[var(--zs-primary-soft)] px-3 py-2 text-xs font-semibold text-[var(--zs-primary)] transition-colors hover:border-[rgba(31,61,50,.35)] hover:bg-[#e5ece7]"><Plus className="h-4 w-4" />{question.addButtonLabel}</button> : null}
            <ContinueButton onClick={onContinue} label={editing ? "保存修改" : filledCount ? "继续" : "跳过"} />
          </div>
        </div>
      ) : filledCount ? <UserBubble>{`已填写 ${filledCount} 条明细`}</UserBubble> : <SkippedReply />}
    </div>
  );
}

function ArPairConversation({ questions, answers, active, editing, onChange, onContinue }: {
  questions: TextQuestion[];
  answers: Answers;
  active: boolean;
  editing: boolean;
  onChange: (question: TextQuestion, value: string) => void;
  onContinue: () => void;
}) {
  const values = questions.map(question => getStringAnswer(answers, question.field));
  return (
    <div className="space-y-4">
      <AdvisorMessage><QuestionPrompt>目前账上还有多少钱没收回来？平均账期大概多少天？（选填）</QuestionPrompt></AdvisorMessage>
      {active ? (
        <div className="ml-[57px] grid gap-3 max-sm:ml-0 sm:grid-cols-2">
          {questions.map((question, index) => (
            <label key={question.id} className="rounded-2xl border border-[var(--zs-line)] bg-white p-3 text-xs text-[var(--zs-sub)] shadow-[var(--zs-shadow-card)]">
              {question.label}
              <div className="relative mt-2">
                <input type="number" data-testid={question.id} inputMode="decimal" value={values[index]} onChange={event => onChange(question, event.target.value)} placeholder={question.placeholder} className="h-11 w-full rounded-xl border border-[var(--zs-line)] px-3 pr-16 text-sm text-[var(--zs-ink)] outline-none focus:border-[var(--zs-primary)]" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{question.unit}</span>
              </div>
            </label>
          ))}
          <div className="sm:col-span-2"><ContinueButton onClick={onContinue} label={editing ? "保存修改" : values.some(Boolean) ? "继续" : "跳过"} /></div>
        </div>
      ) : values.some(Boolean) ? (
        <UserBubble>应收余额 {values[0]} 万元，平均账期 {values[1]} 天</UserBubble>
      ) : <SkippedReply />}
    </div>
  );
}

function ConversationUnitView({ unit, active, editing, answers, customValues, onAnswers, onCustomValues, onContinue, reply = "", onChoiceClick = () => {} }: {
  unit: DiagnosisConversationUnit;
  active: boolean;
  editing: boolean;
  answers: Answers;
  customValues: Record<string, string>;
  onAnswers: (answers: Answers) => void;
  onCustomValues: (customValues: Record<string, string>) => void;
  onContinue: () => void;
  reply?: string;
  onChoiceClick?: (letter: string, multi: boolean) => void;
}) {
  if (unit.questions.length === 2 && unit.id === "finance-plus-ar") {
    return <ArPairConversation questions={unit.questions as TextQuestion[]} answers={answers} active={active} editing={editing} onChange={(question, value) => onAnswers(applyConversationNumberAnswer(answers, question, value))} onContinue={onContinue} />;
  }

  const question = unit.questions[0];
  if (question.type === "single" || question.type === "multi") {
    return <ChoiceConversation question={question} answers={question.type === "multi" ? getStringArrayAnswer(answers, question.field) : [getStringAnswer(answers, question.field)].filter(Boolean)} customValue={customValues[question.field] ?? ""} active={active} reply={reply} onChoiceClick={onChoiceClick} />;
  }
  if (question.type === "number") {
    return <NumberConversation question={question} value={getStringAnswer(answers, question.field)} active={active} editing={editing} onChange={value => onAnswers(applyConversationNumberAnswer(answers, question, value))} onContinue={onContinue} />;
  }
  if (question.type === "text" || question.type === "textarea") {
    return <TextConversation question={question} value={getStringAnswer(answers, question.field)} active={active} />;
  }
  if (question.type === "matrix") {
    return <MatrixConversation question={question} answers={answers} customValue={customValues[question.id] ?? ""} active={active} editing={editing} onAnswer={(field, value) => onAnswers(applyConversationMatrixAnswer(answers, field, value))} onCustomValue={value => onCustomValues({ ...customValues, [question.id]: value })} onContinue={onContinue} />;
  }
  return <FinanceTableConversation question={question} rows={getFinanceRows(answers, question.field)} active={active} editing={editing} onChange={rows => onAnswers(applyConversationFinanceRows(answers, question, rows))} onContinue={onContinue} />;
}

export default function DiagnosisConversation() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [draft] = useState(() => {
    const localDraft = loadDiagnosisDraft();
    return localDraft
      ? { ...localDraft, conversationUnitIndex: getInitialUnitIndex(localDraft) }
      : null;
  });
  const [unitIndex, setUnitIndex] = useState(() => getInitialUnitIndex(draft));
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answers>(() => draft?.answers ?? {});
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => draft?.customValues ?? {});
  const [draftHydrated, setDraftHydrated] = useState(false);
  const [reply, setReply] = useState("");
  const [replyHint, setReplyHint] = useState<string | null>(null);
  const [awaitingShortAnswerChoice, setAwaitingShortAnswerChoice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [insufficientCredits, setInsufficientCredits] =
    useState<DiagnosisInsufficientCredits | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const validationErrorRef = useRef<HTMLParagraphElement>(null);
  const hydrationStartedRef = useRef(false);
  const submittingRef = useRef(false);
  const lastSyncedDraftRef = useRef<string | null>(null);
  const activeUnitIndex = editingUnitIndex ?? unitIndex;
  const currentUnit = CONVERSATION_UNITS[activeUnitIndex];
  const completedQuestionCount = CONVERSATION_UNITS.slice(0, unitIndex).reduce(
    (total, unit) => total + unit.questions.length,
    0,
  );
  const currentQuestion = currentUnit?.questions.length === 1 ? currentUnit.questions[0] : null;
  const usesComposer = currentQuestion?.type === "single" || currentQuestion?.type === "multi" || currentQuestion?.type === "text" || currentQuestion?.type === "textarea";
  const progress = Math.round((completedQuestionCount / TOTAL_QUESTIONS) * 100);

  const serverDraftQuery = trpc.diagnosis.draft.get.useQuery(undefined, {
    enabled: isAuthenticated && !authLoading,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const { data: subscriptionData } = trpc.subscription.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const isFreeUser =
    !subscriptionData?.subscription?.plan ||
    subscriptionData.subscription.plan === "free";
  const saveServerDraft = trpc.diagnosis.draft.save.useMutation();
  const submitDiagnosis = trpc.diagnosis.submitConversation.useMutation();
  const saveServerDraftRef = useRef<((nextDraft: DiagnosisDraft) => Promise<void>) | undefined>(undefined);
  saveServerDraftRef.current = async nextDraft => {
    await saveServerDraft.mutateAsync({
      ...nextDraft,
      conversationUnitIndex: nextDraft.conversationUnitIndex ?? 0,
    });
    lastSyncedDraftRef.current = JSON.stringify(nextDraft);
  };
  const saveQueueRef = useRef<ReturnType<typeof createDiagnosisDraftSaveQueue> | undefined>(undefined);
  if (!saveQueueRef.current) {
    saveQueueRef.current = createDiagnosisDraftSaveQueue(
      nextDraft => saveServerDraftRef.current!(nextDraft),
      700
    );
  }
  const saveQueue = saveQueueRef.current;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "增长诊断对话 · 泽思AI";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    const nextDraft: DiagnosisDraft = {
      stepIndex: getDraftStepIndex(unitIndex),
      conversationUnitIndex: unitIndex,
      answers,
      customValues,
    };
    saveDiagnosisDraft(nextDraft);

    if (
      isAuthenticated &&
      draftHydrated &&
      !submittingRef.current &&
      hasDiagnosisDraftContent(nextDraft) &&
      lastSyncedDraftRef.current !== JSON.stringify(nextDraft)
    ) {
      saveQueue.schedule(nextDraft);
    }
  }, [answers, customValues, draftHydrated, isAuthenticated, saveQueue, unitIndex]);

  useEffect(() => {
    saveQueue.setEnabled(isAuthenticated && draftHydrated && !submittingRef.current);
  }, [draftHydrated, isAuthenticated, saveQueue]);

  useEffect(() => {
    if (authLoading || hydrationStartedRef.current) return;
    if (isAuthenticated && serverDraftQuery.isLoading) return;

    hydrationStartedRef.current = true;
    void hydrateDiagnosisDraft({
      isAuthenticated,
      localDraft: draft,
      loadServerDraft: async () => {
        if (serverDraftQuery.error) throw serverDraftQuery.error;
        return serverDraftQuery.data?.payload ?? null;
      },
      saveServerDraft: nextDraft => saveServerDraftRef.current!(nextDraft),
      saveLocalDraft: nextDraft => {
        saveDiagnosisDraft(nextDraft);
        lastSyncedDraftRef.current = JSON.stringify(nextDraft);
      },
    }).then(resolvedDraft => {
      if (resolvedDraft) {
        setUnitIndex(getInitialUnitIndex(resolvedDraft));
        setAnswers(resolvedDraft.answers);
        setCustomValues(resolvedDraft.customValues);
      }
      setDraftHydrated(true);
    });
  }, [authLoading, draft, isAuthenticated, serverDraftQuery.data, serverDraftQuery.error, serverDraftQuery.isLoading]);

  useEffect(() => () => saveQueue.cancelScheduled(), [saveQueue]);

  useEffect(() => {
    if (editingUnitIndex !== null) {
      document.getElementById(`conversation-unit-${editingUnitIndex}`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [editingUnitIndex, unitIndex, awaitingShortAnswerChoice]);

  useEffect(() => {
    if (currentQuestion?.type === "single" || currentQuestion?.type === "multi") {
      setReply(getConversationChoiceEditReply(currentQuestion, answers, customValues));
    } else if (currentQuestion?.type === "text" || currentQuestion?.type === "textarea") {
      setReply(getStringAnswer(answers, currentQuestion.field));
    } else {
      setReply("");
    }
    setReplyHint(null);
    setAwaitingShortAnswerChoice(false);
  }, [activeUnitIndex]);

  const updateAnswers = (nextAnswers: Answers) => {
    setValidationError(null);
    setAnswers(nextAnswers);
  };

  const updateCustomValues = (nextCustomValues: Record<string, string>) => {
    setValidationError(null);
    setCustomValues(nextCustomValues);
  };

  const selectChoiceCard = (letter: string, multi: boolean) => {
    setReply(currentReply => {
      if (!multi) return letter;

      const customMatch = currentReply.match(/其他\s*[:：]\s*(.+)\s*$/);
      const customReply = customMatch?.[1]?.trim();
      const letterPart = customMatch
        ? currentReply.slice(0, customMatch.index).trim()
        : currentReply.trim();
      const normalizedLetters = letterPart.replace(/[\s,，、/]+/g, "").toUpperCase();
      const selectedLetters = new Set(
        /^[A-Z]*$/.test(normalizedLetters) ? normalizedLetters : ""
      );
      if (selectedLetters.has(letter)) selectedLetters.delete(letter);
      else selectedLetters.add(letter);

      return [
        [...selectedLetters].sort().join(" "),
        customReply ? `其他：${customReply}` : "",
      ].filter(Boolean).join(" ");
    });
    setReplyHint(null);
    setAwaitingShortAnswerChoice(false);
  };

  const showValidationError = (error: string) => {
    setValidationError(error);
    requestAnimationFrame(() => {
      validationErrorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  };

  const editCompletedUnit = (index: number) => {
    setValidationError(null);
    setReplyHint(null);
    setAwaitingShortAnswerChoice(false);
    setEditingUnitIndex(index);
  };

  const completeCurrentUnit = (
    nextAnswers: Answers = answers,
    nextCustomValues: Record<string, string> = customValues
  ) => {
    if (!currentUnit) return false;
    const error = validateCurrentStep(
      getConversationValidationStep(currentUnit),
      nextAnswers,
      nextCustomValues
    );
    if (error) {
      showValidationError(error);
      return false;
    }
    setAnswers(nextAnswers);
    setCustomValues(nextCustomValues);
    setValidationError(null);
    setReply("");
    setReplyHint(null);
    setAwaitingShortAnswerChoice(false);
    const nextPosition = completeConversationPosition(
      { unitIndex, editingUnitIndex },
      CONVERSATION_UNITS.length
    );
    setUnitIndex(nextPosition.unitIndex);
    setEditingUnitIndex(nextPosition.editingUnitIndex);
    return true;
  };

  const sendComposerReply = () => {
    if (!currentQuestion || !usesComposer) return;
    if (currentQuestion.type === "single") {
      const result = applyConversationChoiceReply(answers, currentQuestion, reply);
      if (!result.matched) {
        setReplyHint("我没识别出这个选项。请回复题目中的对应字母，例如 A。");
        return;
      }
      completeCurrentUnit(result.answers, customValues);
      return;
    }
    if (currentQuestion.type === "multi") {
      const result = applyConversationMultiReply(answers, customValues, currentQuestion, reply);
      if (!result.matched) {
        setReplyHint("我没识别出这些选项。请回复题目中的字母，例如 A C。");
        return;
      }
      completeCurrentUnit(result.answers, result.customValues);
      return;
    }

    const nextAnswers = applyConversationTextAnswer(answers, currentQuestion, reply);
    const error = validateCurrentStep(
      getConversationValidationStep(currentUnit),
      nextAnswers,
      customValues
    );
    if (error) {
      showValidationError(error);
      return;
    }
    setAnswers(nextAnswers);
    const followUpHint = getDiagnosisFollowUpHint(currentQuestion.field, reply);
    if (followUpHint) {
      setReplyHint(followUpHint);
      setAwaitingShortAnswerChoice(true);
      return;
    }
    completeCurrentUnit(nextAnswers, customValues);
  };

  const submitReport = async () => {
    for (let index = 0; index < CONVERSATION_UNITS.length; index += 1) {
      const error = validateCurrentStep(
        getConversationValidationStep(CONVERSATION_UNITS[index]),
        answers,
        customValues
      );
      if (error) {
        editCompletedUnit(index);
        showValidationError(error);
        return;
      }
    }
    if (authLoading) return;
    if (!isAuthenticated) {
      rememberLoginReturnPath("/diagnosis/conversation");
      setLocation("/login");
      return;
    }
    submittingRef.current = true;
    saveQueue.setEnabled(false);
    saveQueue.cancelScheduled();
    await saveQueue.waitForPending();

    try {
      const { diagnosisId } = await submitDiagnosis.mutateAsync({ answers, customValues });
      clearDiagnosisDraft();
      setLocation(`/diagnosis/${diagnosisId}/processing`);
    } catch (error) {
      const creditsError = parseDiagnosisInsufficientCredits(error);
      if (creditsError) {
        setInsufficientCredits(creditsError);
      } else {
        showValidationError("提交失败，请稍后重试。");
      }
      submittingRef.current = false;
      saveQueue.setEnabled(true);
      saveQueue.schedule({
        stepIndex: getDraftStepIndex(unitIndex),
        conversationUnitIndex: unitIndex,
        answers,
        customValues,
      });
    }
  };

  const visibleUnits = CONVERSATION_UNITS.slice(0, Math.min(unitIndex + 1, CONVERSATION_UNITS.length));

  if (authLoading || (isAuthenticated && !draftHydrated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--zs-bg)] text-sm text-[var(--zs-sub)]">
        正在同步草稿…
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)] ${usesComposer ? "pb-36" : "pb-16"}`}>
      <header className="sticky top-0 z-30 border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[920px] items-center justify-between gap-6 px-6">
          <Link href="/" aria-label="泽思AI 首页"><img src={APP_LOGO_FULL} alt="泽思AI" className="h-[36px]" /></Link>
          <div className="text-right">
            <div className="text-xs font-semibold text-[var(--zs-ink)]">泽思 · AI 增长顾问</div>
            <div className="mt-0.5 text-[11px] text-[var(--zs-sub)]">访谈中 · {Math.min(completedQuestionCount, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS} 题</div>
          </div>
        </div>
        <div className="h-0.5 bg-[#eceadf]"><div className="h-full bg-[var(--zs-primary)] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-6 py-12 sm:py-14">
        <div className="space-y-11">
          <AdvisorMessage><div className="whitespace-pre-line">{CONVERSATION_OPENING}</div></AdvisorMessage>
          {visibleUnits.map((unit, index) => {
            const showSectionIntro = index === 0 || unit.section !== visibleUnits[index - 1].section;
            const active = index === activeUnitIndex;
            return (
              <div id={`conversation-unit-${index}`} key={unit.id} className="scroll-mt-24 space-y-10">
                {showSectionIntro ? <SectionMarker>{unit.sectionIntro}</SectionMarker> : null}
                <div className="space-y-3">
                  <ConversationUnitView
                    unit={unit}
                    active={active}
                    editing={editingUnitIndex === index}
                    answers={answers}
                    customValues={customValues}
                    onAnswers={updateAnswers}
                    onCustomValues={updateCustomValues}
                    onContinue={() => completeCurrentUnit()}
                    reply={active ? reply : ""}
                    onChoiceClick={selectChoiceCard}
                  />
                  {active && validationError ? (
                    <p ref={validationErrorRef} role="alert" className="ml-10 scroll-mb-40 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 max-sm:ml-0">
                      {validationError}
                    </p>
                  ) : null}
                  {index < unitIndex && !active ? (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => editCompletedUnit(index)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--zs-line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[var(--zs-sub)] transition-colors hover:border-[var(--zs-primary)] hover:text-[var(--zs-primary)]">
                        <Pencil className="h-3 w-3" />修改
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}

          {unitIndex === CONVERSATION_UNITS.length && editingUnitIndex === null ? (
            <div className="space-y-4">
              <AdvisorMessage>信息我都了解了。接下来我会结合 NBG 五维方法论，为你生成增长诊断报告。</AdvisorMessage>
              <div className="ml-10 max-sm:ml-0">
                <button type="button" data-testid="submit-diagnosis" onClick={submitReport} disabled={submitDiagnosis.isPending || authLoading} className="inline-flex items-center gap-2 rounded-xl bg-[var(--zs-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  <Check className="h-4 w-4" />{submitDiagnosis.isPending ? "正在生成…" : "生成增长诊断报告"}
                </button>
              </div>
            </div>
          ) : null}

          <div ref={bottomRef} className={usesComposer ? "h-32" : "h-4"} aria-hidden="true" />
        </div>
      </main>

      {usesComposer ? (
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--zs-line)] bg-[rgba(250,250,248,.94)] backdrop-blur-xl">
          <div className="mx-auto max-w-[720px] px-6 py-3">
            {editingUnitIndex !== null ? <p className="mb-2 text-xs font-semibold text-[var(--zs-primary)]">正在修改已答问题，发送后保存</p> : null}
            {replyHint ? <p className="mb-2 text-xs text-[var(--zs-gold-ink)]">{replyHint}</p> : null}
            {awaitingShortAnswerChoice ? (
              <button type="button" onClick={() => completeCurrentUnit()} className="mb-2 rounded-lg border border-[var(--zs-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--zs-primary)] transition-colors hover:bg-[var(--zs-primary-soft)]">不补充，继续</button>
            ) : null}
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--zs-line)] bg-white p-2 pl-4 shadow-[var(--zs-shadow-card)]">
              <input
                data-testid="answer-input"
                value={reply}
                onChange={event => { setReply(event.target.value); setReplyHint(null); setAwaitingShortAnswerChoice(false); }}
                onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); sendComposerReply(); } }}
                placeholder={currentQuestion?.type === "multi" ? "回复多个字母，如 b、c" : currentQuestion?.type === "single" ? "回复选项字母，如 B" : currentQuestion && "placeholder" in currentQuestion ? getConversationPlaceholder(currentQuestion) : "输入回答"}
                className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--zs-weak)]"
              />
              {currentQuestion && "optional" in currentQuestion && currentQuestion.optional && !reply ? <button type="button" data-testid="skip-question" onClick={() => {
                const nextAnswers = { ...answers, [currentQuestion.field]: currentQuestion.type === "multi" ? [] : "" };
                const nextCustomValues = { ...customValues };
                delete nextCustomValues[currentQuestion.field];
                completeCurrentUnit(nextAnswers, nextCustomValues);
              }} className="px-2 text-xs font-semibold text-[var(--zs-sub)]">跳过</button> : null}
              <button type="button" data-testid="answer-send" onClick={sendComposerReply} disabled={!reply.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-[var(--zs-primary)] text-white shadow-sm transition-[filter,background-color] hover:brightness-90 disabled:cursor-default disabled:bg-[#d2d8d4] disabled:text-white/80 disabled:shadow-none disabled:hover:brightness-100" aria-label="发送回答"><ArrowUp className="h-5 w-5 stroke-[2.5]" /></button>
            </div>
          </div>
        </footer>
      ) : null}

      <DiagnosisInsufficientDialog
        open={insufficientCredits !== null}
        onOpenChange={open => {
          if (!open) setInsufficientCredits(null);
        }}
        isFreeUser={isFreeUser}
        credits={insufficientCredits}
      />
    </div>
  );
}
