import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Send } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { APP_LOGO_FULL } from "@/const";
import {
  clearDiagnosisDraft,
  loadDiagnosisDraft,
  saveDiagnosisDraft,
  type DiagnosisDraftAnswer,
} from "@/lib/diagnosisDraft";
import { rememberLoginReturnPath } from "@/lib/loginReturn";
import { trpc } from "@/lib/trpc";
import { validateCurrentStep } from "./Diagnosis";
import {
  applyConversationChoiceReply,
  applyConversationNumberAnswer,
  getChoiceLetter,
} from "./diagnosisConversationProtocol";
import {
  DIAGNOSIS_STEPS,
  type ChoiceQuestion,
  type DiagnosisQuestion,
  type TextQuestion,
} from "./diagnosisQuestionnaire";

type Answers = Record<string, DiagnosisDraftAnswer>;

function getStringAnswer(answers: Answers, field: string): string {
  const value = answers[field];
  return typeof value === "string" ? value : "";
}

function isSingleQuestion(question: DiagnosisQuestion): question is ChoiceQuestion {
  return question.type === "single";
}

function UnsupportedQuestion({ question }: { question: DiagnosisQuestion }) {
  return (
    <div className="ml-[57px] rounded-2xl border border-dashed border-[var(--zs-line)] bg-white px-5 py-4 text-sm leading-6 text-[var(--zs-sub)] max-sm:ml-0">
      <p className="font-semibold text-[var(--zs-ink)]">{question.label}</p>
      <p className="mt-1">该题型将在下一步接入对话流，本阶段暂保留为占位。</p>
      <Link href="/diagnosis" className="mt-2 inline-flex font-semibold text-[var(--zs-primary)] hover:underline">
        前往老版填写此题型
      </Link>
    </div>
  );
}

function ChoiceConversation({
  question,
  answer,
}: {
  question: ChoiceQuestion;
  answer: string;
}) {
  return (
    <>
      <div className="flex items-start gap-[13px]">
        <AdvisorAvatar />
        <div className="min-w-0 flex-1">
          <AdvisorIdentity />
          <div className="rounded-[5px_15px_15px_15px] bg-[var(--zs-primary-soft)] px-4 py-3 text-sm leading-7 text-[#33433b]">
            <p>{question.label}</p>
            <div className="mt-2 space-y-1">
              {question.options.map((option, index) => (
                <p key={option}>
                  <strong className="mr-2 text-[var(--zs-primary)]">{getChoiceLetter(index)}.</strong>
                  {option}
                </p>
              ))}
            </div>
            <p className="mt-3 border-l-2 border-[rgba(201,162,75,.58)] bg-white/55 px-3 py-2 text-xs text-[var(--zs-sub)]">
              回复对应字母即可，如 A
            </p>
          </div>
        </div>
      </div>
      {answer ? (
        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-[15px_5px_15px_15px] bg-[var(--zs-primary)] px-4 py-3 text-sm leading-6 text-white shadow-[0_15px_32px_-24px_rgba(31,61,50,.9)]">
            <span className="mb-1 block text-[10px] font-bold tracking-[.08em] text-white/60">我的回答</span>
            {answer}
          </div>
        </div>
      ) : null}
    </>
  );
}

function NumberConversation({
  question,
  value,
  onChange,
}: {
  question: TextQuestion;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <>
      <div className="flex items-start gap-[13px]">
        <AdvisorAvatar />
        <div className="min-w-0 flex-1">
          <AdvisorIdentity />
          <div className="rounded-[5px_15px_15px_15px] bg-[var(--zs-primary-soft)] px-4 py-3 text-sm leading-7 text-[#33433b]">
            {question.label}
          </div>
          <div className="relative mt-3 rounded-2xl border border-[var(--zs-line)] bg-white p-3 shadow-[var(--zs-shadow-card)]">
            <input
              type="number"
              inputMode="decimal"
              min={question.min}
              value={value}
              onChange={event => onChange(event.target.value)}
              placeholder={question.placeholder}
              className="h-12 w-full rounded-xl border border-[var(--zs-line)] bg-white px-4 pr-28 text-base font-semibold outline-none focus:border-[var(--zs-primary)] focus:ring-4 focus:ring-[rgba(31,61,50,.08)]"
            />
            {question.unit ? (
              <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-xs text-[var(--zs-sub)]">
                {question.unit}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {value ? (
        <div className="flex justify-end">
          <div className="max-w-[78%] rounded-[15px_5px_15px_15px] bg-[var(--zs-primary)] px-4 py-3 text-sm text-white">
            <span className="mb-1 block text-[10px] font-bold tracking-[.08em] text-white/60">我的回答</span>
            {value}{question.unit ? ` ${question.unit}` : ""}
          </div>
        </div>
      ) : null}
    </>
  );
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

export default function DiagnosisConversation() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [draft] = useState(loadDiagnosisDraft);
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(draft?.stepIndex ?? 0, DIAGNOSIS_STEPS.length - 1)
  );
  const [answers, setAnswers] = useState<Answers>(() => draft?.answers ?? {});
  const [customValues] = useState<Record<string, string>>(() => draft?.customValues ?? {});
  const [letterReply, setLetterReply] = useState("");
  const [replyHint, setReplyHint] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const step = DIAGNOSIS_STEPS[stepIndex];
  const singleQuestions = step.questions.filter(isSingleQuestion);
  const activeChoice = singleQuestions.find(
    question => !getStringAnswer(answers, question.field)
  );
  const fallbackChoice = singleQuestions[0];
  const inputQuestion = activeChoice ?? fallbackChoice;
  const progress = ((stepIndex + 1) / DIAGNOSIS_STEPS.length) * 100;

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
    saveDiagnosisDraft({ stepIndex, answers, customValues });
  }, [answers, customValues, stepIndex]);

  const sendLetterReply = () => {
    if (!inputQuestion) return;
    const result = applyConversationChoiceReply(answers, inputQuestion, letterReply);
    if (!result.matched) {
      setReplyHint("我没识别出这个选项。请只回复题目中的对应字母，例如 A。");
      return;
    }
    setAnswers(result.answers);
    setLetterReply("");
    setReplyHint(null);
    setValidationError(null);
  };

  const goNext = () => {
    const validationMessage = validateCurrentStep(step, answers, customValues);
    if (validationMessage) {
      setValidationError(validationMessage);
      return;
    }
    if (stepIndex === DIAGNOSIS_STEPS.length - 1) {
      if (authLoading) return;
      if (!isAuthenticated) {
        rememberLoginReturnPath("/diagnosis/conversation");
        setLocation("/login");
        return;
      }
      submitDiagnosis.mutate({ answers, customValues });
      return;
    }
    setStepIndex(current => current + 1);
    setLetterReply("");
    setReplyHint(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] pb-36 text-[var(--zs-ink)]">
      <header className="sticky top-0 z-30 border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.88)] backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[920px] items-center justify-between px-6">
          <Link href="/" aria-label="泽思AI 首页"><img src={APP_LOGO_FULL} alt="泽思AI" className="h-[36px]" /></Link>
          <div className="text-xs font-semibold text-[var(--zs-sub)]"><span className="text-[var(--zs-gold)]">访谈中</span> · 临时对话流</div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-6 py-9">
        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-[var(--zs-sub)]">
            <span>STEP {String(stepIndex + 1).padStart(2, "0")} / {DIAGNOSIS_STEPS.length} · {step.dimension}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-[#eceadf]"><div className="h-full rounded-full bg-[var(--zs-primary)]" style={{ width: `${progress}%` }} /></div>
        </div>

        <div className="space-y-7">
          {step.questions.map(question =>
            question.type === "single" ? (
              <ChoiceConversation key={question.id} question={question} answer={getStringAnswer(answers, question.field)} />
            ) : question.type === "number" ? (
              <NumberConversation
                key={question.id}
                question={question}
                value={getStringAnswer(answers, question.field)}
                onChange={value => {
                  setValidationError(null);
                  setAnswers(current => applyConversationNumberAnswer(current, question, value));
                }}
              />
            ) : (
              <UnsupportedQuestion key={question.id} question={question} />
            )
          )}
        </div>

        <div className="mt-8 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex(current => Math.max(0, current - 1))}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--zs-line)] bg-white px-4 py-3 text-sm font-semibold text-[var(--zs-sub)] disabled:invisible"
          >
            <ArrowLeft className="h-4 w-4" />上一步
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={submitDiagnosis.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--zs-primary)] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {stepIndex === DIAGNOSIS_STEPS.length - 1 ? <Check className="h-4 w-4" /> : <ArrowRight className="h-4 w-4" />}
            {stepIndex === DIAGNOSIS_STEPS.length - 1 ? "完成并生成诊断" : "下一步"}
          </button>
        </div>
        {validationError ? <p className="mt-4 text-right text-sm text-red-700">{validationError}</p> : null}
        {submitDiagnosis.error ? <p className="mt-4 text-right text-sm text-red-700">提交失败：{submitDiagnosis.error.message}</p> : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--zs-line)] bg-[rgba(250,250,248,.92)] backdrop-blur-xl">
        <div className="mx-auto max-w-[720px] px-6 py-3">
          {replyHint ? <p className="mb-2 text-xs text-[var(--zs-gold-ink)]">{replyHint}</p> : null}
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--zs-line)] bg-white p-2 pl-4 shadow-[var(--zs-shadow-card)]">
            <input
              value={letterReply}
              onChange={event => { setLetterReply(event.target.value); setReplyHint(null); }}
              onKeyDown={event => { if (event.key === "Enter") sendLetterReply(); }}
              disabled={!inputQuestion}
              placeholder={inputQuestion ? "回复选项字母，如 B" : "当前题型使用上方控件"}
              className="h-9 min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-[var(--zs-weak)] disabled:cursor-not-allowed"
            />
            <button
              type="button"
              onClick={sendLetterReply}
              disabled={!inputQuestion || !letterReply.trim()}
              className="grid h-10 w-10 place-items-center rounded-full bg-[var(--zs-primary)] text-white disabled:opacity-35"
              aria-label="发送回答"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
