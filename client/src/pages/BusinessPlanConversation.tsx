import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO_FULL } from "@/const";
import {
  loadBusinessPlanDraft,
  saveBusinessPlanDraft,
} from "@/lib/businessPlanDraft";
import { BUSINESS_PLAN_STEPS } from "./businessPlanQuestionnaire";

const TOTAL_STEPS = BUSINESS_PLAN_STEPS.length;

function getInitialStepIndex(): number {
  const draft = loadBusinessPlanDraft();
  const savedIndex = draft?.conversationUnitIndex ?? draft?.stepIndex ?? 0;
  return Math.min(Math.max(savedIndex, 0), TOTAL_STEPS - 1);
}

export default function BusinessPlanConversation() {
  const [currentStepIndex, setCurrentStepIndex] = useState(getInitialStepIndex);
  const currentStep = BUSINESS_PLAN_STEPS[currentStepIndex];
  const progress = Math.round(((currentStepIndex + 1) / TOTAL_STEPS) * 100);

  useEffect(() => {
    saveBusinessPlanDraft({
      stepIndex: currentStepIndex,
      conversationUnitIndex: currentStepIndex,
      answers: {},
      customValues: {},
    });
  }, [currentStepIndex]);

  const goToNextStep = () => {
    setCurrentStepIndex(index => Math.min(index + 1, TOTAL_STEPS - 1));
  };

  return (
    <div
      className="min-h-screen bg-[var(--bg)] text-[var(--ink)]"
      style={
        {
          "--pri": "#1F3D32",
          "--acc": "#C9A24B",
          "--bg": "#FAFAF8",
          "--ink": "#1E2B25",
          "--line": "#E6E4DA",
        } as React.CSSProperties
      }
    >
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[rgba(250,250,248,.92)] backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-[920px] items-center justify-between gap-6 px-6">
          <Link href="/" aria-label="泽思 AI 首页">
            <img src={APP_LOGO_FULL} alt="泽思 AI" className="h-[36px]" />
          </Link>
          <div className="text-right">
            <div className="text-xs font-semibold text-[var(--pri)]">
              商业计划书访谈
            </div>
            <div className="mt-0.5 text-[11px] text-[#586158]">
              第 {currentStepIndex + 1}/{TOTAL_STEPS} 步 · {progress}%
            </div>
          </div>
        </div>
        <div className="h-0.5 bg-[#eceadf]">
          <div
            className="h-full bg-[var(--acc)] transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[720px] px-6 py-12 sm:py-14">
        <section className="rounded-2xl border border-[var(--line)] bg-white px-6 py-5 shadow-sm">
          <p className="text-sm leading-7 text-[#586158]">（开场白待补充）</p>
        </section>

        <section className="mt-10 rounded-3xl border border-[var(--line)] bg-white p-7 shadow-sm sm:p-9">
          <div className="text-xs font-semibold tracking-[0.16em] text-[var(--acc)]">
            STEP {currentStepIndex + 1}
          </div>
          <h1 className="mt-3 text-2xl font-semibold text-[var(--pri)]">
            {currentStep.title}
          </h1>
          {currentStep.transition ? (
            <p className="mt-4 text-sm leading-7 text-[#586158]">
              {currentStep.transition}
            </p>
          ) : null}

          <div className="mt-8 grid min-h-40 place-items-center rounded-2xl border border-dashed border-[#d8cfb8] bg-[#fbf8f0] px-6 text-sm text-[#8e7b51]">
            （本步题目待实现）
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={goToNextStep}
              disabled={currentStepIndex === TOTAL_STEPS - 1}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--pri)] px-5 py-3 text-sm font-semibold text-white transition-[filter] hover:brightness-90 disabled:cursor-default disabled:opacity-40"
            >
              下一步
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
