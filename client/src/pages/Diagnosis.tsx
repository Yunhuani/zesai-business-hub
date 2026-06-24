import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, LockKeyhole } from "lucide-react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  clearDiagnosisDraft,
  loadDiagnosisDraft,
  saveDiagnosisDraft,
} from "@/lib/diagnosisDraft";
import { rememberLoginReturnPath } from "@/lib/loginReturn";
import {
  DIAGNOSIS_STEPS,
  type ChoiceQuestion,
  type DiagnosisQuestion,
  type MatrixQuestion,
  type TextQuestion,
} from "./diagnosisQuestionnaire";

type Answer = string | string[];
type Answers = Record<string, Answer>;

function isChoiceQuestion(question: DiagnosisQuestion): question is ChoiceQuestion {
  return question.type === "single" || question.type === "multi";
}

function ChoiceCards({
  question,
  answers,
  customValues,
  onAnswer,
  onCustomValue,
}: {
  question: ChoiceQuestion;
  answers: Answers;
  customValues: Record<string, string>;
  onAnswer: (field: string, value: Answer) => void;
  onCustomValue: (field: string, value: string) => void;
}) {
  const selected = answers[question.field];
  const isMulti = question.type === "multi";

  const toggleOption = (option: string) => {
    if (!isMulti) {
      onAnswer(question.field, option);
      return;
    }

    const current = Array.isArray(selected) ? selected : [];
    onAnswer(
      question.field,
      current.includes(option)
        ? current.filter(value => value !== option)
        : [...current, option]
    );
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {question.options.map(option => {
          const active = Array.isArray(selected)
            ? selected.includes(option)
            : selected === option;

          return (
            <button
              key={option}
              type="button"
              aria-pressed={active}
              onClick={() => toggleOption(option)}
              className={[
                "flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left text-[15px] font-medium transition-all",
                active
                  ? "border-[#AE8A48] bg-[#FCFAF5] text-[#24221E] shadow-[0_0_0_1px_rgba(174,138,72,0.18)]"
                  : "border-[#DFDCD5] bg-white text-[#45423D] hover:border-[#BDB7AB] hover:bg-[#FDFCF9]",
              ].join(" ")}
            >
              <span>{option}</span>
              {active ? <Check className="h-4 w-4 text-[#AE8A48]" strokeWidth={2} /> : null}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        value={customValues[question.field] ?? ""}
        onChange={event => onCustomValue(question.field, event.target.value)}
        placeholder={question.customPlaceholder}
        className="h-12 w-full rounded-xl border border-[#DFDCD5] bg-white px-4 text-[15px] text-[#24221E] outline-none transition placeholder:text-[#A6A198] focus:border-[#AE8A48] focus:ring-4 focus:ring-[#AE8A48]/10"
      />
    </div>
  );
}

function TextAnswer({
  question,
  value,
  onChange,
}: {
  question: TextQuestion;
  value: Answer | undefined;
  onChange: (field: string, value: string) => void;
}) {
  const sharedClassName =
    "w-full rounded-xl border border-[#DFDCD5] bg-white px-4 text-[15px] leading-7 text-[#24221E] outline-none transition placeholder:text-[#A6A198] focus:border-[#AE8A48] focus:ring-4 focus:ring-[#AE8A48]/10";

  if (question.type === "textarea") {
    return (
      <textarea
        rows={4}
        value={typeof value === "string" ? value : ""}
        onChange={event => onChange(question.field, event.target.value)}
        placeholder={question.placeholder}
        className={`${sharedClassName} min-h-28 resize-none py-3`}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <input
          type={question.type}
          inputMode={question.type === "number" ? "decimal" : undefined}
          min={question.type === "number" ? 0 : undefined}
          value={typeof value === "string" ? value : ""}
          onChange={event => onChange(question.field, event.target.value)}
          placeholder={question.placeholder}
          className={`${sharedClassName} h-12 ${question.unit ? "pr-24" : ""}`}
        />
        {question.unit ? (
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-[#78736A]">
            {question.unit}
          </span>
        ) : null}
      </div>
      {question.helperText ? (
        <p className="text-[13px] leading-6 text-[#817B71]">{question.helperText}</p>
      ) : null}
    </div>
  );
}

function MatrixAnswer({
  question,
  answers,
  customValue,
  onAnswer,
  onCustomValue,
}: {
  question: MatrixQuestion;
  answers: Answers;
  customValue: string;
  onAnswer: (field: string, value: string) => void;
  onCustomValue: (field: string, value: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-[#DFDCD5] bg-white">
        {question.items.map((item, index) => (
          <div
            key={item.field}
            className={`grid grid-cols-[minmax(88px,1fr)_repeat(3,58px)] items-center gap-2 px-4 py-3 ${
              index === 0 ? "" : "border-t border-[#ECE9E3]"
            }`}
          >
            <span className="text-sm font-medium text-[#45423D]">{item.label}</span>
            {question.options.map(option => {
              const active = answers[item.field] === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onAnswer(item.field, option)}
                  className={`h-8 rounded-lg border text-xs font-medium transition ${
                    active
                      ? "border-[#AE8A48] bg-[#FCFAF5] text-[#8A6A31]"
                      : "border-[#E2DED7] text-[#777168] hover:border-[#BDB7AB]"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <input
        type="text"
        value={customValue}
        onChange={event => onCustomValue(question.id, event.target.value)}
        placeholder={question.customPlaceholder}
        className="h-12 w-full rounded-xl border border-[#DFDCD5] bg-white px-4 text-[15px] text-[#24221E] outline-none transition placeholder:text-[#A6A198] focus:border-[#AE8A48] focus:ring-4 focus:ring-[#AE8A48]/10"
      />
    </div>
  );
}

function QuestionBlock({
  question,
  index,
  answers,
  customValues,
  onAnswer,
  onCustomValue,
}: {
  question: DiagnosisQuestion;
  index: number;
  answers: Answers;
  customValues: Record<string, string>;
  onAnswer: (field: string, value: Answer) => void;
  onCustomValue: (field: string, value: string) => void;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-baseline gap-3">
        <span className="font-mono text-[11px] text-[#9A958C]">0{index + 1}</span>
        <h2 className="text-[19px] font-semibold leading-8 tracking-[-0.02em] text-[#24221E]">
          {question.label}
          {"optional" in question && question.optional ? (
            <span className="ml-2 align-middle text-xs font-normal text-[#9A958C]">选填，可跳过</span>
          ) : null}
        </h2>
      </div>

      {isChoiceQuestion(question) ? (
        <ChoiceCards
          question={question}
          answers={answers}
          customValues={customValues}
          onAnswer={onAnswer}
          onCustomValue={onCustomValue}
        />
      ) : question.type === "matrix" ? (
        <MatrixAnswer
          question={question}
          answers={answers}
          customValue={customValues[question.id] ?? ""}
          onAnswer={(field, value) => onAnswer(field, value)}
          onCustomValue={onCustomValue}
        />
      ) : (
        <TextAnswer
          question={question}
          value={answers[question.field]}
          onChange={(field, value) => onAnswer(field, value)}
        />
      )}
    </section>
  );
}

function FinanceUploadTeaser() {
  return (
    <section className="rounded-2xl border border-[#D9CFBB] bg-[#FCFAF5] p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D8C8A8] bg-white text-[#9A783D]">
            <FileSpreadsheet className="h-5 w-5" strokeWidth={1.7} />
          </div>
          <div>
            <div className="mb-1.5 flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A783D]">
                Advanced
              </span>
              <LockKeyhole className="h-3.5 w-3.5 text-[#A89470]" />
            </div>
            <h2 className="text-[17px] font-semibold tracking-[-0.02em] text-[#2C2924]">
              上传财务明细，解锁精确测算
            </h2>
            <p className="mt-1.5 text-[13px] leading-6 text-[#777065]">
              可进一步测算产品利润、客户集中度与现金风险。
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled
          className="h-10 shrink-0 cursor-not-allowed rounded-xl border border-[#D8CDB8] bg-white px-4 text-sm font-medium text-[#9A8F7D]"
        >
          敬请期待
        </button>
      </div>
    </section>
  );
}

export default function Diagnosis() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [draft] = useState(loadDiagnosisDraft);
  const [stepIndex, setStepIndex] = useState(() =>
    Math.min(draft?.stepIndex ?? 0, DIAGNOSIS_STEPS.length - 1)
  );
  const [answers, setAnswers] = useState<Answers>(() => draft?.answers ?? {});
  const [customValues, setCustomValues] = useState<Record<string, string>>(
    () => draft?.customValues ?? {}
  );

  const step = DIAGNOSIS_STEPS[stepIndex];
  const progress = ((stepIndex + 1) / DIAGNOSIS_STEPS.length) * 100;
  const submitDiagnosis = trpc.diagnosis.submit.useMutation({
    onSuccess: ({ diagnosisId }) => {
      clearDiagnosisDraft();
      setLocation(`/diagnosis/${diagnosisId}/processing`);
    },
  });

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "公司诊断问卷 · 泽思";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    saveDiagnosisDraft({ stepIndex, answers, customValues });
  }, [answers, customValues, stepIndex]);

  const updateAnswer = (field: string, value: Answer) => {
    setAnswers(current => ({ ...current, [field]: value }));
  };

  const updateCustomValue = (field: string, value: string) => {
    setCustomValues(current => ({ ...current, [field]: value }));
  };

  const goNext = () => {
    if (stepIndex === DIAGNOSIS_STEPS.length - 1) {
      if (authLoading) return;
      if (!isAuthenticated) {
        rememberLoginReturnPath("/diagnosis");
        setLocation("/login");
        return;
      }
      submitDiagnosis.mutate({ answers, customValues });
      return;
    }
    setStepIndex(current => current + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goBack = () => {
    setStepIndex(current => Math.max(0, current - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#FBFAF7] text-[#24221E] [font-family:Inter,'Noto_Sans_SC','PingFang_SC',sans-serif]">
      <header className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between px-5 sm:px-8">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-[-0.025em] text-[#24221E] transition hover:text-[#6E685E]"
        >
          泽思 · 公司诊断
        </Link>
        <span className="text-xs tracking-wide text-[#8B867D]">提交后将开始生成诊断</span>
      </header>

      <main className="mx-auto w-full max-w-[780px] px-5 pb-20 pt-5 sm:px-8 sm:pt-10">
        <>
            <div className="mb-12 sm:mb-16">
              <div className="mb-4 flex items-center justify-between text-[11px] font-medium tracking-[0.08em] text-[#837E75]">
                <span>STEP {String(stepIndex + 1).padStart(2, "0")} / {String(DIAGNOSIS_STEPS.length).padStart(2, "0")}</span>
                <span>{Math.round(progress)}% 完成</span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-[#E7E3DB]">
                <div
                  className="h-full rounded-full bg-[#AE8A48] transition-[width] duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <div className="mb-10 border-l-2 border-[#AE8A48] pl-5 sm:mb-12 sm:pl-7">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#837E75]">
                {step.dimension}
              </p>
              <h1 className="max-w-2xl text-[30px] font-semibold leading-[1.2] tracking-[-0.045em] text-[#24221E] sm:text-[38px]">
                {step.title}
              </h1>
            </div>

            <div className="space-y-10 sm:space-y-12">
              {step.questions.map((question, index) => (
                <QuestionBlock
                  key={question.id}
                  question={question}
                  index={index}
                  answers={answers}
                  customValues={customValues}
                  onAnswer={updateAnswer}
                  onCustomValue={updateCustomValue}
                />
              ))}
              {step.showFinanceUpload ? <FinanceUploadTeaser /> : null}
            </div>

            <div className="mt-14 flex items-center justify-between border-t border-[#E3E0D9] pt-6 sm:mt-16">
              <button
                type="button"
                onClick={goBack}
                disabled={stepIndex === 0}
                className="inline-flex h-11 items-center gap-2 rounded-xl px-1 text-sm font-medium text-[#6F6A62] transition hover:text-[#24221E] disabled:pointer-events-none disabled:opacity-0"
              >
                <ArrowLeft className="h-4 w-4" />
                上一步
              </button>
              <button
                type="button"
                onClick={goNext}
                disabled={submitDiagnosis.isPending}
                className="inline-flex h-11 min-w-28 items-center justify-center gap-2 rounded-xl bg-[#AE8A48] px-5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(174,138,72,0.18)] transition hover:-translate-y-0.5 hover:bg-[#96753C] hover:shadow-[0_12px_28px_rgba(174,138,72,0.24)] focus:outline-none focus:ring-4 focus:ring-[#AE8A48]/20 disabled:pointer-events-none disabled:opacity-60"
              >
                {stepIndex === DIAGNOSIS_STEPS.length - 1
                  ? submitDiagnosis.isPending
                    ? "正在提交"
                    : "完成填写"
                  : "下一步"}
                {stepIndex === DIAGNOSIS_STEPS.length - 1 ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </button>
            </div>
            {submitDiagnosis.error ? (
              <p className="mt-4 text-right text-sm text-red-700">
                提交失败：{submitDiagnosis.error.message}
              </p>
            ) : null}
        </>
      </main>
    </div>
  );
}
