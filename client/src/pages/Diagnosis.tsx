import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowLeft, ArrowRight, Check, FileSpreadsheet, LockKeyhole, Plus, Trash2 } from "lucide-react";
import { Link, useLocation } from "wouter";
import { APP_LOGO_FULL } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  clearDiagnosisDraft,
  loadDiagnosisDraft,
  saveDiagnosisDraft,
  type DiagnosisDraftAnswer,
  type FinanceRowAnswer,
} from "@/lib/diagnosisDraft";
import { rememberLoginReturnPath } from "@/lib/loginReturn";
import { validateFinanceBasicAnswers } from "@shared/diagnosisFinanceBasicValidation";
import {
  DIAGNOSIS_STEPS,
  type ChoiceQuestion,
  type DiagnosisQuestion,
  type FinanceTableQuestion,
  type MatrixQuestion,
  type TextQuestion,
} from "./diagnosisQuestionnaire";

type Answer = DiagnosisDraftAnswer;
type Answers = Record<string, Answer>;

function isChoiceQuestion(question: DiagnosisQuestion): question is ChoiceQuestion {
  return question.type === "single" || question.type === "multi";
}

function getStringArrayAnswer(value: Answer | undefined): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
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

    const current = getStringArrayAnswer(selected);
    onAnswer(
      question.field,
      current.includes(option)
        ? current.filter(value => value !== option)
        : [...current, option]
    );
  };

  return (
    <div className="space-y-[11px]">
      {question.options.map(option => {
        const selectedValues = getStringArrayAnswer(selected);
        const active = selectedValues.length > 0 ? selectedValues.includes(option) : selected === option;

        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            onClick={() => toggleOption(option)}
            className="flex w-full items-center gap-3.5 rounded-[13px] border px-[18px] py-4 text-left text-[15.5px] font-medium transition-colors hover:border-[#b9c4bd]"
            style={{
              background: active ? "var(--zs-primary-soft)" : "#fff",
              borderColor: active ? "var(--zs-primary)" : "var(--zs-line)",
              color: "var(--zs-ink)",
            }}
          >
            <span
              className="flex h-[22px] w-[22px] shrink-0 items-center justify-center"
              style={
                isMulti
                  ? {
                      borderRadius: 7,
                      background: active ? "var(--zs-primary)" : "#fff",
                      border: active ? "0" : "1.6px solid #cfd3c9",
                      color: "#fff",
                      fontSize: 13,
                      fontWeight: 700,
                    }
                  : {
                      borderRadius: 999,
                      background: "#fff",
                      border: active
                        ? "6.5px solid var(--zs-primary)"
                        : "1.6px solid #cfd3c9",
                    }
              }
            >
              {isMulti && active ? "✓" : ""}
            </span>
            <span className="flex-1">{option}</span>
          </button>
        );
      })}
      <input
        type="text"
        value={customValues[question.field] ?? ""}
        onChange={event => onCustomValue(question.field, event.target.value)}
        placeholder={question.customPlaceholder}
        className="mt-[11px] h-12 w-full rounded-[11px] border bg-white px-[15px] text-[15px] outline-none transition placeholder:text-[#b4b9b1] focus:ring-4"
        style={{
          borderColor: "var(--zs-line)",
          color: "var(--zs-ink)",
          "--tw-ring-color": "rgba(31,61,50,.12)",
        } as CSSProperties}
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
  const inputClassName =
    "w-full rounded-xl border bg-white px-4 text-base leading-7 outline-none transition placeholder:text-[#b4b9b1] focus:ring-4";
  const inputStyle = {
    borderColor: "var(--zs-line)",
    color: "var(--zs-ink)",
    "--tw-ring-color": "rgba(31,61,50,.12)",
  } as CSSProperties;

  if (question.type === "textarea") {
    return (
      <textarea
        rows={5}
        value={typeof value === "string" ? value : ""}
        onChange={event => onChange(question.field, event.target.value)}
        placeholder={question.placeholder}
        className={`${inputClassName} min-h-32 resize-y py-[15px]`}
        style={inputStyle}
      />
    );
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <input
          type={question.type}
          inputMode={question.type === "number" ? "decimal" : undefined}
          min={question.type === "number" ? question.min : undefined}
          value={typeof value === "string" ? value : ""}
          onChange={event => onChange(question.field, event.target.value)}
          placeholder={question.placeholder}
          className={`${inputClassName} h-[52px] ${question.unit ? "pr-24" : ""}`}
          style={inputStyle}
        />
        {question.unit ? (
          <span
            className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm"
            style={{ color: "var(--zs-sub)" }}
          >
            {question.unit}
          </span>
        ) : null}
      </div>
      {question.helperText ? (
        <p className="text-[13px] leading-6" style={{ color: "var(--zs-sub)" }}>
          {question.helperText}
        </p>
      ) : null}
    </div>
  );
}

function getFinanceRows(value: Answer | undefined): FinanceRowAnswer[] {
  return Array.isArray(value)
    ? value.filter((item): item is FinanceRowAnswer => typeof item === "object" && item !== null && !Array.isArray(item))
    : [];
}

function createEmptyFinanceRow(question: FinanceTableQuestion): FinanceRowAnswer {
  return Object.fromEntries(question.columns.map(column => [column.key, ""]));
}

function FinanceTableAnswer({
  question,
  value,
  onChange,
}: {
  question: FinanceTableQuestion;
  value: Answer | undefined;
  onChange: (field: string, value: FinanceRowAnswer[]) => void;
}) {
  const rows = getFinanceRows(value);
  const visibleRows = rows.length > 0 ? rows : [createEmptyFinanceRow(question)];
  const canAddRow = !question.maxRows || visibleRows.length < question.maxRows;

  const updateCell = (rowIndex: number, key: string, cellValue: string) => {
    const nextRows = visibleRows.map((row, index) =>
      index === rowIndex ? { ...row, [key]: cellValue } : row
    );
    onChange(question.field, nextRows);
  };

  const addRow = () => {
    if (!canAddRow) return;
    onChange(question.field, [...visibleRows, createEmptyFinanceRow(question)]);
  };

  const removeRow = (rowIndex: number) => {
    const nextRows = visibleRows.filter((_, index) => index !== rowIndex);
    onChange(question.field, nextRows.length > 0 ? nextRows : [createEmptyFinanceRow(question)]);
  };

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-[14px] border bg-white" style={{ borderColor: "var(--zs-line)" }}>
        <div
          className="grid min-w-[620px] items-center gap-2 border-b px-4 py-3 text-[12px] font-bold"
          style={{
            borderColor: "var(--zs-line)",
            color: "var(--zs-sub)",
            gridTemplateColumns: `repeat(${question.columns.length}, minmax(120px, 1fr)) 44px`,
          }}
        >
          {question.columns.map(column => (
            <span key={column.key}>{column.label}{column.unit ? ` / ${column.unit}` : ""}</span>
          ))}
          <span />
        </div>
        {visibleRows.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="grid min-w-[620px] items-center gap-2 border-b px-4 py-3 last:border-b-0"
            style={{
              borderColor: "var(--zs-line)",
              gridTemplateColumns: `repeat(${question.columns.length}, minmax(120px, 1fr)) 44px`,
            }}
          >
            {question.columns.map(column => (
              <input
                key={column.key}
                type={column.inputType}
                inputMode={column.inputType === "number" ? "decimal" : undefined}
                min={column.inputType === "number" ? 0 : undefined}
                value={String(row[column.key] ?? "")}
                onChange={event => updateCell(rowIndex, column.key, event.target.value)}
                placeholder={column.label}
                className="h-11 w-full rounded-[10px] border bg-white px-3 text-[14px] outline-none transition placeholder:text-[#b4b9b1] focus:ring-4"
                style={{
                  borderColor: "var(--zs-line)",
                  color: "var(--zs-ink)",
                  "--tw-ring-color": "rgba(31,61,50,.12)",
                } as CSSProperties}
              />
            ))}
            <button
              type="button"
              onClick={() => removeRow(rowIndex)}
              aria-label="删除这一行"
              className="flex h-10 w-10 items-center justify-center rounded-[10px] text-[#8d968f] transition hover:bg-[#f1f2ee] hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {question.helperText ? (
          <p className="text-[13px] leading-6" style={{ color: "var(--zs-sub)" }}>
            {question.helperText}
          </p>
        ) : <span />}
        <button
          type="button"
          onClick={addRow}
          disabled={!canAddRow}
          className="inline-flex items-center gap-2 rounded-[10px] border bg-white px-4 py-2 text-[13px] font-semibold transition disabled:pointer-events-none disabled:opacity-45"
          style={{ borderColor: "var(--zs-line)", color: "var(--zs-primary)" }}
        >
          <Plus className="h-4 w-4" />
          {question.addButtonLabel}
        </button>
      </div>
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
  const gridTemplateColumns = `minmax(0,1fr) repeat(${question.options.length}, minmax(54px, 68px))`;

  return (
    <div className="space-y-[13px]">
      <div className="overflow-hidden rounded-[14px] border bg-white" style={{ borderColor: "var(--zs-line)" }}>
        <div
          className="grid items-center px-[18px] pb-[7px] pt-[11px] max-sm:px-3"
          style={{ gridTemplateColumns }}
        >
          <span />
          {question.options.map(option => (
            <span
              key={option}
              className="text-center text-[12px] font-bold"
              style={{ color: "var(--zs-sub)" }}
            >
              {option}
            </span>
          ))}
        </div>
        {question.items.map(item => (
          <div
            key={item.field}
            className="grid items-center border-t px-[18px] py-[13px] max-sm:px-3"
            style={{ borderColor: "var(--zs-line)", gridTemplateColumns }}
          >
            <span className="text-[15px] font-semibold" style={{ color: "var(--zs-ink)" }}>
              {item.label}
            </span>
            {question.options.map(option => {
              const active = answers[item.field] === option;
              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onAnswer(item.field, option)}
                  className="flex justify-center"
                >
                  <span
                    className="h-[22px] w-[22px] rounded-full bg-white"
                    style={{
                      border: active
                        ? "6.5px solid var(--zs-primary)"
                        : "1.6px solid #cfd3c9",
                    }}
                  />
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <textarea
        value={customValue}
        onChange={event => onCustomValue(question.id, event.target.value)}
        placeholder={question.customPlaceholder}
        className="min-h-[62px] w-full resize-y rounded-[11px] border bg-white px-[15px] py-[13px] text-[14.5px] leading-6 outline-none transition placeholder:text-[#b4b9b1] focus:ring-4"
        style={{
          borderColor: "var(--zs-line)",
          color: "var(--zs-ink)",
          "--tw-ring-color": "rgba(31,61,50,.12)",
        } as CSSProperties}
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
      <div className="space-y-2">
        <p className="font-mono text-[11px] font-semibold tracking-[0.16em]" style={{ color: "var(--zs-gold)" }}>
          {String(index + 1).padStart(2, "0")}
        </p>
        <h2 className="text-[25px] font-extrabold leading-[1.42] tracking-[0.01em]" style={{ color: "var(--zs-ink)" }}>
          {question.label}
          {"optional" in question && question.optional ? (
            <span className="ml-2 align-middle text-xs font-normal" style={{ color: "var(--zs-sub)" }}>
              选填，可跳过
            </span>
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
      ) : question.type === "finance-table" ? (
        <FinanceTableAnswer
          question={question}
          value={answers[question.field]}
          onChange={(field, value) => onAnswer(field, value)}
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
    <section className="flex cursor-not-allowed items-center gap-4 rounded-[14px] border border-dashed bg-[#f7f7f3] px-[22px] py-[19px] max-sm:flex-col max-sm:items-start">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] bg-[#eceee9] text-[#9aa39c]">
        <FileSpreadsheet className="h-[22px] w-[22px]" strokeWidth={1.7} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[15px] font-bold text-[#4a504a]">上传财务明细，解锁精确测算</span>
          <span className="rounded-[5px] bg-[rgba(201,162,75,.22)] px-2 py-1 text-[10.5px] font-bold tracking-[.06em] text-[#5a4516]">
            ADVANCED
          </span>
        </div>
        <p className="mt-1 text-[12.5px] leading-6" style={{ color: "var(--zs-sub)" }}>
          上传利润表 / 资产负债表后，诊断将给出更精确的财务测算与行业对标。
          <span className="text-[#9aa39c]">即将开放</span>
        </p>
      </div>
      <LockKeyhole className="h-[18px] w-[18px] shrink-0 text-[#b4bbb2]" />
    </section>
  );
}

function isBlankCell(value: unknown): boolean {
  return value == null || (typeof value === "string" && value.trim().length === 0);
}

function isBlankFinanceRow(row: FinanceRowAnswer, question: FinanceTableQuestion): boolean {
  return question.columns.every(column => isBlankCell(row[column.key]));
}

function getStringAnswer(answers: Answers, field: string): string {
  const value = answers[field];
  return typeof value === "string" ? value.trim() : "";
}

function getCustomAnswer(customValues: Record<string, string>, field: string): string {
  return customValues[field]?.trim() ?? "";
}

function validateFinanceTableQuestion(question: FinanceTableQuestion, answers: Answers): string | null {
  const rows = getFinanceRows(answers[question.field]);
  const filledRows = rows.filter(row => !isBlankFinanceRow(row, question));

  if (question.maxRows && filledRows.length > question.maxRows) {
    return `${question.label}最多填写 ${question.maxRows} 行`;
  }

  for (const [index, row] of filledRows.entries()) {
    for (const column of question.columns) {
      const value = row[column.key];
      if (isBlankCell(value)) {
        return `${question.label}第 ${index + 1} 行请填写完整`;
      }
      if (column.inputType === "number") {
        const parsed = typeof value === "number" ? value : Number(String(value).trim());
        if (!Number.isFinite(parsed) || parsed < 0) {
          return `${question.label}第 ${index + 1} 行的${column.label}请输入非负数字`;
        }
      }
    }
  }

  return null;
}

function validateRequiredQuestion(
  question: DiagnosisQuestion,
  answers: Answers,
  customValues: Record<string, string>
): string | null {
  if (question.type === "finance-table") {
    return null;
  }

  if (question.type === "matrix") {
    const missingItem = question.items.find(item => !getStringAnswer(answers, item.field));
    return missingItem ? `请完成「${question.label}」里的「${missingItem.label}」` : null;
  }

  if ("optional" in question && question.optional) {
    return null;
  }

  if (isChoiceQuestion(question)) {
    const selected = answers[question.field];
    const hasPreset = question.type === "multi"
      ? getStringArrayAnswer(selected).length > 0
      : getStringAnswer(answers, question.field).length > 0;
    const hasCustom = getCustomAnswer(customValues, question.field).length > 0;
    return hasPreset || hasCustom ? null : `请填写或选择「${question.label}」`;
  }

  return getStringAnswer(answers, question.field) ? null : `请填写「${question.label}」`;
}

function validateCurrentStep(
  step: typeof DIAGNOSIS_STEPS[number],
  answers: Answers,
  customValues: Record<string, string>
): string | null {
  for (const question of step.questions) {
    const requiredError = validateRequiredQuestion(question, answers, customValues);
    if (requiredError) return requiredError;
  }

  const checksFinanceBasic = step.questions.some(
    question => "field" in question && question.field.startsWith("finance_basic.")
  );
  if (checksFinanceBasic) {
    const financeBasicError = validateFinanceBasicAnswers(answers, customValues);
    if (financeBasicError) return financeBasicError;
  }

  for (const question of step.questions) {
    if (question.type === "finance-table") {
      const error = validateFinanceTableQuestion(question, answers);
      if (error) return error;
    }
  }

  const checksArFields = step.questions.some(
    question => "field" in question && question.field.startsWith("finance_plus.ar.")
  );
  if (!checksArFields) {
    return null;
  }

  const arBalance = getStringAnswer(answers, "finance_plus.ar.balance");
  const arDays = getStringAnswer(answers, "finance_plus.ar.days");
  if ((arBalance && !arDays) || (!arBalance && arDays)) {
    return "应收账款余额和账期需要同时填写，或都不填";
  }
  for (const [field, label] of [
    ["finance_plus.ar.balance", "应收账款余额"],
    ["finance_plus.ar.days", "平均账期"],
  ] as const) {
    const value = getStringAnswer(answers, field);
    if (!value) continue;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return `${label}请输入非负数字`;
    }
  }

  return null;
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
  const [validationError, setValidationError] = useState<string | null>(null);

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
    document.title = "增长诊断问卷 · 泽思AI";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    saveDiagnosisDraft({ stepIndex, answers, customValues });
  }, [answers, customValues, stepIndex]);

  const updateAnswer = (field: string, value: Answer) => {
    setValidationError(null);
    setAnswers(current => ({ ...current, [field]: value }));
  };

  const updateCustomValue = (field: string, value: string) => {
    setValidationError(null);
    setCustomValues(current => ({ ...current, [field]: value }));
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
    <div className="min-h-screen [font-family:'Noto_Sans_SC','Inter',sans-serif]" style={{ background: "var(--zs-bg)", color: "var(--zs-ink)" }}>
      <header className="sticky top-0 z-50 border-b bg-[rgba(250,250,248,.86)] backdrop-blur-xl backdrop-saturate-150" style={{ borderColor: "var(--zs-line)" }}>
        <div className="mx-auto flex max-w-[980px] items-center justify-between px-8 py-[13px] max-sm:px-5">
          <Link href="/" aria-label="泽思AI 首页">
            <img src={APP_LOGO_FULL} alt="泽思AI" className="h-[38px] w-auto" />
          </Link>
          <div className="flex items-center gap-[9px] text-[13px] font-semibold tracking-[.01em]" style={{ color: "var(--zs-sub)" }}>
            <span className="h-[7px] w-[7px] rounded-full shadow-[0_0_0_3px_rgba(201,162,75,.18)]" style={{ background: "var(--zs-gold)" }} />
            泽思AI · 增长诊断
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-8 pb-[92px] pt-[46px] max-sm:px-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-baseline gap-[13px]">
            <span className="font-mono text-[13px] font-bold tracking-[.16em]" style={{ color: "var(--zs-gold)" }}>
              STEP {String(stepIndex + 1).padStart(2, "0")} / {String(DIAGNOSIS_STEPS.length).padStart(2, "0")}
            </span>
            <span className="text-[12.5px] font-medium" style={{ color: "var(--zs-sub)" }}>
              {step.dimension}
            </span>
          </div>
          <span className="font-mono text-[13px] font-semibold" style={{ color: "var(--zs-sub)" }}>
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-[5px] overflow-hidden rounded-[3px] bg-[#eceadf]">
          <div
            className="h-full rounded-[3px] transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%`, background: "var(--zs-primary)" }}
          />
        </div>

        <div className="mt-[26px] rounded-[20px] border bg-white px-[38px] pb-[34px] pt-[38px] shadow-[0_30px_64px_-42px_rgba(31,61,50,.32)] max-sm:px-5 max-sm:py-6" style={{ borderColor: "var(--zs-line)" }}>
          <div className="flex items-start gap-3.5">
            <div className="flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-xl bg-[#16231d] shadow-[inset_0_0_0_1px_rgba(201,162,75,.5)]">
              <span className="font-serif text-[23px] font-bold leading-none text-[#e8dcba]">泽</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-[7px] flex items-center gap-2.5">
                <span className="text-[13px] font-bold" style={{ color: "var(--zs-ink)" }}>
                  泽思 · AI 增长顾问
                </span>
                <span className="inline-flex items-center gap-[5px] text-[11px] font-semibold" style={{ color: "var(--zs-gold)" }}>
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--zs-gold)" }} />
                  访谈中
                </span>
              </div>
              <div className="rounded-[4px_13px_13px_13px] px-4 py-3 text-sm leading-[1.65] text-[#33433b]" style={{ background: "var(--zs-primary-soft)" }}>
                {step.title}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-10">
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
        </div>

        <div className="mt-[22px] flex items-center gap-3.5">
          <button
            type="button"
            onClick={goBack}
            disabled={stepIndex === 0}
            className="mr-auto inline-flex items-center gap-2 rounded-[11px] border bg-white px-[22px] py-3 text-[15px] font-semibold transition disabled:pointer-events-none disabled:opacity-0"
            style={{ borderColor: "var(--zs-line)", color: "var(--zs-sub)" }}
          >
            <ArrowLeft className="h-4 w-4" />
            上一步
          </button>
          <button
            type="button"
            onClick={goNext}
            disabled={submitDiagnosis.isPending}
            className="ml-auto inline-flex items-center gap-[9px] rounded-[11px] px-8 py-[13px] text-[15.5px] font-semibold text-white shadow-[0_18px_38px_-20px_rgba(31,61,50,.6)] transition hover:-translate-y-0.5 disabled:pointer-events-none disabled:opacity-60"
            style={{ background: "var(--zs-primary)" }}
          >
            {stepIndex === DIAGNOSIS_STEPS.length - 1
              ? submitDiagnosis.isPending
                ? "正在提交"
                : "完成填写，生成诊断"
              : "下一步"}
            {stepIndex === DIAGNOSIS_STEPS.length - 1 ? (
              <Check className="h-4 w-4" />
            ) : (
              <ArrowRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {validationError ? (
          <p className="mt-4 text-right text-sm text-red-700">
            {validationError}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-center gap-[7px] text-[12.5px] text-[#a7aca4]">
          <Check className="h-3.5 w-3.5" />
          回答已自动保存 · 可随时离开，下次回来继续
        </div>

        {submitDiagnosis.error ? (
          <p className="mt-4 text-right text-sm text-red-700">
            提交失败：{submitDiagnosis.error.message}
          </p>
        ) : null}
      </main>
    </div>
  );
}
