import { useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Plus, Send, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO_FULL } from "@/const";
import {
  clearDiagnosisDraft,
  loadDiagnosisDraft,
  saveDiagnosisDraft,
  type DiagnosisDraftAnswer,
  type FinanceRowAnswer,
} from "@/lib/diagnosisDraft";
import { rememberLoginReturnPath } from "@/lib/loginReturn";
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
  getChoiceLetter,
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

function AdvisorAvatar() {
  return (
    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-[13px] border border-[rgba(201,162,75,.5)] bg-[#17271f] font-serif text-[23px] font-bold text-[#e9ddbd]">
      泽
    </div>
  );
}

function AdvisorIdentity() {
  return (
    <div className="mb-2 flex items-center gap-2.5 text-xs font-bold text-[var(--zs-ink)]">
      泽思 · AI 增长顾问
      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--zs-gold)]">
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--zs-gold)]" />访谈中
      </span>
    </div>
  );
}

function AdvisorMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-[13px]">
      <AdvisorAvatar />
      <div className="min-w-0 flex-1">
        <AdvisorIdentity />
        <div className="rounded-[5px_15px_15px_15px] bg-[var(--zs-primary-soft)] px-4 py-3 text-sm leading-7 text-[#33433b]">
          {children}
        </div>
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[78%] rounded-[15px_5px_15px_15px] bg-[var(--zs-primary)] px-4 py-3 text-sm leading-6 text-white shadow-[0_15px_32px_-24px_rgba(31,61,50,.9)]">
        <span className="mb-1 block text-[10px] font-bold tracking-[.08em] text-white/60">我的回答</span>
        {children}
      </div>
    </div>
  );
}

function ContinueButton({ onClick, label = "继续" }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-3 inline-flex items-center gap-2 rounded-xl bg-[var(--zs-primary)] px-4 py-2.5 text-sm font-semibold text-white"
    >
      {label}<ArrowRight className="h-4 w-4" />
    </button>
  );
}

function ChoiceConversation({ question, answers, customValue, active }: {
  question: ChoiceQuestion;
  answers: string[];
  customValue: string;
  active: boolean;
}) {
  const displayedAnswer = [...answers, customValue].filter(Boolean).join("、");
  return (
    <div className="space-y-4">
      <AdvisorMessage>
        <p>{question.label}</p>
        <div className="mt-2 space-y-1">
          {question.options.map((option, index) => (
            <p key={option}>
              <strong className="mr-2 text-[var(--zs-primary)]">{getChoiceLetter(index)}.</strong>
              {option}
            </p>
          ))}
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
        {question.label}
        {question.optional ? <span className="ml-2 text-xs text-[var(--zs-sub)]">选填，可直接跳过</span> : null}
      </AdvisorMessage>
      {!active && value ? <UserBubble>{value}</UserBubble> : null}
      {!active && !value ? <UserBubble>已跳过</UserBubble> : null}
    </div>
  );
}

function NumberConversation({ question, value, active, onChange, onContinue }: {
  question: TextQuestion;
  value: string;
  active: boolean;
  onChange: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <AdvisorMessage>
        {question.label}
        {question.optional ? <span className="ml-2 text-xs text-[var(--zs-sub)]">选填</span> : null}
        {active && question.helperText ? <p className="mt-1 text-xs text-[var(--zs-sub)]">{question.helperText}</p> : null}
      </AdvisorMessage>
      {active ? (
        <div className="ml-[57px] max-sm:ml-0">
          <div className="relative rounded-2xl border border-[var(--zs-line)] bg-white p-3 shadow-[var(--zs-shadow-card)]">
            <input
              type="number"
              inputMode="decimal"
              min={question.min}
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder={question.placeholder}
              className="h-12 w-full rounded-xl border border-[var(--zs-line)] px-4 pr-28 text-base font-semibold outline-none focus:border-[var(--zs-primary)]"
            />
            {question.unit ? <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs text-[var(--zs-sub)]">{question.unit}</span> : null}
          </div>
          <ContinueButton onClick={onContinue} label={question.optional && !value ? "跳过" : "继续"} />
        </div>
      ) : value ? (
        <UserBubble>{value}{question.unit ? ` ${question.unit}` : ""}</UserBubble>
      ) : (
        <UserBubble>已跳过</UserBubble>
      )}
    </div>
  );
}

function MatrixConversation({ question, answers, customValue, active, onAnswer, onCustomValue, onContinue }: {
  question: MatrixQuestion;
  answers: Answers;
  customValue: string;
  active: boolean;
  onAnswer: (field: string, value: string) => void;
  onCustomValue: (value: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <AdvisorMessage>{question.label}</AdvisorMessage>
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
                  {question.options.map(option => (
                    <label key={option} className="grid place-items-center">
                      <input type="radio" name={item.field} checked={getStringAnswer(answers, item.field) === option} onChange={() => onAnswer(item.field, option)} className="accent-[var(--zs-primary)]" />
                    </label>
                  ))}
                </div>
              ))}
            </div>
            <input value={customValue} onChange={event => onCustomValue(event.target.value)} placeholder={question.customPlaceholder} className="m-3 h-10 w-[calc(100%-1.5rem)] rounded-lg border border-[var(--zs-line)] px-3 text-sm outline-none focus:border-[var(--zs-primary)]" />
          </div>
          <ContinueButton onClick={onContinue} />
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

function FinanceTableConversation({ question, rows, active, onChange, onContinue }: {
  question: FinanceTableQuestion;
  rows: FinanceRowAnswer[];
  active: boolean;
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
        {question.label}
        {active && question.helperText ? <p className="mt-1 text-xs text-[var(--zs-sub)]">{question.helperText}</p> : null}
      </AdvisorMessage>
      {active ? (
        <div className="ml-[57px] max-sm:ml-0">
          <div className="overflow-x-auto rounded-2xl border border-[var(--zs-line)] bg-white shadow-[var(--zs-shadow-card)]">
            <table className="min-w-[620px] w-full text-left text-xs">
              <thead className="bg-[#f6f7f3] text-[var(--zs-sub)]"><tr>{question.columns.map(column => <th key={column.key} className="px-3 py-2">{column.label}{column.unit ? `（${column.unit}）` : ""}</th>)}<th className="w-12" /></tr></thead>
              <tbody>{visibleRows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-t border-[var(--zs-line)]">
                  {question.columns.map(column => <td key={column.key} className="p-2"><input type={column.inputType} value={String(row[column.key] ?? "")} onChange={event => updateCell(rowIndex, column.key, event.target.value)} className="h-9 w-full min-w-[92px] rounded-lg border border-[var(--zs-line)] px-2 outline-none focus:border-[var(--zs-primary)]" /></td>)}
                  <td><button type="button" onClick={() => onChange(visibleRows.filter((_, index) => index !== rowIndex))} className="p-2 text-[var(--zs-sub)]" aria-label="删除行"><Trash2 className="h-4 w-4" /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {(!question.maxRows || visibleRows.length < question.maxRows) ? <button type="button" onClick={() => onChange([...visibleRows, createEmptyFinanceRow(question)])} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--zs-primary)]"><Plus className="h-4 w-4" />{question.addButtonLabel}</button> : null}
            <ContinueButton onClick={onContinue} label={filledCount ? "继续" : "跳过"} />
          </div>
        </div>
      ) : (
        <UserBubble>{filledCount ? `已填写 ${filledCount} 条明细` : "已跳过"}</UserBubble>
      )}
    </div>
  );
}

function ArPairConversation({ questions, answers, active, onChange, onContinue }: {
  questions: TextQuestion[];
  answers: Answers;
  active: boolean;
  onChange: (question: TextQuestion, value: string) => void;
  onContinue: () => void;
}) {
  const values = questions.map(question => getStringAnswer(answers, question.field));
  return (
    <div className="space-y-4">
      <AdvisorMessage>最后补充一下应收账款余额和平均账期；两项请同时填写，也可以都跳过。</AdvisorMessage>
      {active ? (
        <div className="ml-[57px] grid gap-3 max-sm:ml-0 sm:grid-cols-2">
          {questions.map((question, index) => (
            <label key={question.id} className="rounded-2xl border border-[var(--zs-line)] bg-white p-3 text-xs text-[var(--zs-sub)] shadow-[var(--zs-shadow-card)]">
              {question.label}
              <div className="relative mt-2">
                <input type="number" inputMode="decimal" value={values[index]} onChange={event => onChange(question, event.target.value)} placeholder={question.placeholder} className="h-11 w-full rounded-xl border border-[var(--zs-line)] px-3 pr-16 text-sm text-[var(--zs-ink)] outline-none focus:border-[var(--zs-primary)]" />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">{question.unit}</span>
              </div>
            </label>
          ))}
          <div className="sm:col-span-2"><ContinueButton onClick={onContinue} label={values.some(Boolean) ? "继续" : "跳过"} /></div>
        </div>
      ) : values.some(Boolean) ? (
        <UserBubble>应收余额 {values[0]} 万元，平均账期 {values[1]} 天</UserBubble>
      ) : (
        <UserBubble>已跳过</UserBubble>
      )}
    </div>
  );
}

function ConversationUnitView({ unit, active, answers, customValues, onAnswers, onCustomValues, onContinue }: {
  unit: DiagnosisConversationUnit;
  active: boolean;
  answers: Answers;
  customValues: Record<string, string>;
  onAnswers: (answers: Answers) => void;
  onCustomValues: (customValues: Record<string, string>) => void;
  onContinue: () => void;
}) {
  if (unit.questions.length === 2 && unit.id === "finance-plus-ar") {
    return <ArPairConversation questions={unit.questions as TextQuestion[]} answers={answers} active={active} onChange={(question, value) => onAnswers(applyConversationNumberAnswer(answers, question, value))} onContinue={onContinue} />;
  }

  const question = unit.questions[0];
  if (question.type === "single" || question.type === "multi") {
    return <ChoiceConversation question={question} answers={question.type === "multi" ? getStringArrayAnswer(answers, question.field) : [getStringAnswer(answers, question.field)].filter(Boolean)} customValue={customValues[question.field] ?? ""} active={active} />;
  }
  if (question.type === "number") {
    return <NumberConversation question={question} value={getStringAnswer(answers, question.field)} active={active} onChange={value => onAnswers(applyConversationNumberAnswer(answers, question, value))} onContinue={onContinue} />;
  }
  if (question.type === "text" || question.type === "textarea") {
    return <TextConversation question={question} value={getStringAnswer(answers, question.field)} active={active} />;
  }
  if (question.type === "matrix") {
    return <MatrixConversation question={question} answers={answers} customValue={customValues[question.id] ?? ""} active={active} onAnswer={(field, value) => onAnswers(applyConversationMatrixAnswer(answers, field, value))} onCustomValue={value => onCustomValues({ ...customValues, [question.id]: value })} onContinue={onContinue} />;
  }
  return <FinanceTableConversation question={question} rows={getFinanceRows(answers, question.field)} active={active} onChange={rows => onAnswers(applyConversationFinanceRows(answers, question, rows))} onContinue={onContinue} />;
}

export default function DiagnosisConversation() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [draft] = useState(loadDiagnosisDraft);
  const [unitIndex, setUnitIndex] = useState(() => getInitialUnitIndex(draft));
  const [answers, setAnswers] = useState<Answers>(() => draft?.answers ?? {});
  const [customValues, setCustomValues] = useState<Record<string, string>>(() => draft?.customValues ?? {});
  const [reply, setReply] = useState("");
  const [replyHint, setReplyHint] = useState<string | null>(null);
  const [awaitingShortAnswerChoice, setAwaitingShortAnswerChoice] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentUnit = CONVERSATION_UNITS[unitIndex];
  const completedQuestionCount = CONVERSATION_UNITS.slice(0, unitIndex).reduce(
    (total, unit) => total + unit.questions.length,
    0,
  );
  const currentQuestion = currentUnit?.questions.length === 1 ? currentUnit.questions[0] : null;
  const usesComposer = currentQuestion?.type === "single" || currentQuestion?.type === "multi" || currentQuestion?.type === "text" || currentQuestion?.type === "textarea";
  const progress = Math.round((completedQuestionCount / TOTAL_QUESTIONS) * 100);

  const submitDiagnosis = trpc.diagnosis.submit.useMutation({
    onSuccess: ({ diagnosisId }) => {
      clearDiagnosisDraft();
      setLocation(`/diagnosis/${diagnosisId}/processing`);
    },
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "增长诊断对话 · 泽思AI";
    return () => { document.title = previousTitle; };
  }, []);

  useEffect(() => {
    saveDiagnosisDraft({
      stepIndex: getDraftStepIndex(unitIndex),
      conversationUnitIndex: unitIndex,
      answers,
      customValues,
    });
  }, [answers, customValues, unitIndex]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [unitIndex, awaitingShortAnswerChoice]);

  useEffect(() => {
    if (currentQuestion?.type === "text" || currentQuestion?.type === "textarea") {
      setReply(getStringAnswer(answers, currentQuestion.field));
    } else {
      setReply("");
    }
    setReplyHint(null);
    setAwaitingShortAnswerChoice(false);
  }, [unitIndex]);

  const updateAnswers = (nextAnswers: Answers) => {
    setValidationError(null);
    setAnswers(nextAnswers);
  };

  const updateCustomValues = (nextCustomValues: Record<string, string>) => {
    setValidationError(null);
    setCustomValues(nextCustomValues);
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
      setValidationError(error);
      return false;
    }
    setAnswers(nextAnswers);
    setCustomValues(nextCustomValues);
    setValidationError(null);
    setReply("");
    setReplyHint(null);
    setAwaitingShortAnswerChoice(false);
    setUnitIndex(index => Math.min(index + 1, CONVERSATION_UNITS.length));
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
      setValidationError(error);
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

  const submitReport = () => {
    if (authLoading) return;
    if (!isAuthenticated) {
      rememberLoginReturnPath("/diagnosis/conversation");
      setLocation("/login");
      return;
    }
    submitDiagnosis.mutate({ answers, customValues });
  };

  const visibleUnits = CONVERSATION_UNITS.slice(0, Math.min(unitIndex + 1, CONVERSATION_UNITS.length));

  return (
    <div className={`min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)] ${usesComposer ? "pb-32" : "pb-12"}`}>
      <header className="sticky top-0 z-30 border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.9)] backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[920px] items-center justify-between px-6">
          <Link href="/" aria-label="泽思AI 首页"><img src={APP_LOGO_FULL} alt="泽思AI" className="h-[36px]" /></Link>
          <div className="text-xs font-semibold text-[var(--zs-sub)]"><span className="text-[var(--zs-gold)]">访谈中</span> · 已完成 {Math.min(completedQuestionCount, TOTAL_QUESTIONS)} / {TOTAL_QUESTIONS}</div>
        </div>
        <div className="h-1 bg-[#eceadf]"><div className="h-full bg-[var(--zs-primary)] transition-[width] duration-500" style={{ width: `${progress}%` }} /></div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-6 py-9">
        <div className="space-y-8">
          <AdvisorMessage>{CONVERSATION_OPENING}</AdvisorMessage>
          {visibleUnits.map((unit, index) => {
            const showSectionIntro = index === 0 || unit.section !== visibleUnits[index - 1].section;
            const active = index === unitIndex;
            return (
              <div key={unit.id} className="space-y-8">
                {showSectionIntro ? <AdvisorMessage>{unit.sectionIntro}</AdvisorMessage> : null}
                <ConversationUnitView
                  unit={unit}
                  active={active}
                  answers={answers}
                  customValues={customValues}
                  onAnswers={updateAnswers}
                  onCustomValues={updateCustomValues}
                  onContinue={() => completeCurrentUnit()}
                />
              </div>
            );
          })}

          {unitIndex === CONVERSATION_UNITS.length ? (
            <div className="space-y-4">
              <AdvisorMessage>信息我都了解了。接下来我会结合 NBG 五维方法论，为你生成增长诊断报告。</AdvisorMessage>
              <div className="ml-[57px] max-sm:ml-0">
                <button type="button" onClick={submitReport} disabled={submitDiagnosis.isPending || authLoading} className="inline-flex items-center gap-2 rounded-xl bg-[var(--zs-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">
                  <Check className="h-4 w-4" />{submitDiagnosis.isPending ? "正在生成…" : "生成我的诊断报告"}
                </button>
              </div>
            </div>
          ) : null}

          {validationError ? <p className="ml-[57px] text-sm text-red-700 max-sm:ml-0">{validationError}</p> : null}
          {submitDiagnosis.error ? <p className="ml-[57px] text-sm text-red-700 max-sm:ml-0">提交失败：{submitDiagnosis.error.message}</p> : null}
          <div ref={bottomRef} />
        </div>
      </main>

      {usesComposer ? (
        <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--zs-line)] bg-[rgba(250,250,248,.94)] backdrop-blur-xl">
          <div className="mx-auto max-w-[720px] px-6 py-3">
            {replyHint ? <p className="mb-2 text-xs text-[var(--zs-gold-ink)]">{replyHint}</p> : null}
            {awaitingShortAnswerChoice ? (
              <button type="button" onClick={() => completeCurrentUnit()} className="mb-2 text-xs font-semibold text-[var(--zs-primary)] hover:underline">保留当前回答，直接继续</button>
            ) : null}
            <div className="flex items-center gap-2 rounded-2xl border border-[var(--zs-line)] bg-white p-2 pl-4 shadow-[var(--zs-shadow-card)]">
              <input
                value={reply}
                onChange={event => { setReply(event.target.value); setReplyHint(null); setAwaitingShortAnswerChoice(false); }}
                onKeyDown={event => { if (event.key === "Enter") sendComposerReply(); }}
                placeholder={currentQuestion?.type === "multi" ? "回复多个字母，如 b、c" : currentQuestion?.type === "single" ? "回复选项字母，如 B" : currentQuestion && "placeholder" in currentQuestion ? currentQuestion.placeholder : "输入回答"}
                className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--zs-weak)]"
              />
              {currentQuestion && "optional" in currentQuestion && currentQuestion.optional && !reply ? <button type="button" onClick={() => completeCurrentUnit()} className="px-2 text-xs font-semibold text-[var(--zs-sub)]">跳过</button> : null}
              <button type="button" onClick={sendComposerReply} disabled={!reply.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-[var(--zs-primary)] text-white disabled:opacity-35" aria-label="发送回答"><Send className="h-4 w-4" /></button>
            </div>
          </div>
        </footer>
      ) : null}
    </div>
  );
}
