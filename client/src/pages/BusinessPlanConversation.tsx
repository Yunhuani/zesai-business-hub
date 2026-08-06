import { useEffect, useRef, useState } from "react";
import { Check, Pencil } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO_FULL } from "@/const";
import {
  loadBusinessPlanDraft,
  saveBusinessPlanDraft,
  type BusinessPlanDraftAnswer,
} from "@/lib/businessPlanDraft";
import { completeConversationPosition } from "./diagnosisConversationProtocol";
import {
  BUSINESS_PLAN_SECTIONS,
  type BPSectionId,
} from "./businessPlanQuestionnaire";

type Answers = Record<string, BusinessPlanDraftAnswer>;

type PlaceholderConversationUnit = {
  id: string;
  section: BPSectionId;
  sectionIntro: string;
  label: string;
  optional: boolean;
};

const CONVERSATION_UNITS: PlaceholderConversationUnit[] =
  BUSINESS_PLAN_SECTIONS.map(section => ({
    id: `placeholder-${section.id}`,
    section: section.id,
    sectionIntro: section.intro,
    label: "（题目待实现）",
    optional: false,
  }));

const TOTAL_QUESTIONS = CONVERSATION_UNITS.length;

function AdvisorMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--pri)] text-xs font-semibold text-white">
        泽
      </div>
      <div className="max-w-[82%] rounded-2xl rounded-tl-md border border-[var(--line)] bg-white px-4 py-3 text-sm leading-7 shadow-sm">
        {children}
      </div>
    </div>
  );
}

function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[82%] rounded-2xl rounded-tr-md bg-[var(--pri)] px-4 py-3 text-sm leading-6 text-white">
        {children}
      </div>
    </div>
  );
}

function SectionIntro({ children }: { children: React.ReactNode }) {
  return (
    <AdvisorMessage>
      <span className="text-[#586158]">{children}</span>
    </AdvisorMessage>
  );
}

function getInitialUnitIndex(savedIndex: number | undefined): number {
  return Math.min(Math.max(savedIndex ?? 0, 0), TOTAL_QUESTIONS);
}

export default function BusinessPlanConversation() {
  const [initialDraft] = useState(loadBusinessPlanDraft);
  const [unitIndex, setUnitIndex] = useState(() =>
    getInitialUnitIndex(initialDraft?.conversationUnitIndex)
  );
  const [editingUnitIndex, setEditingUnitIndex] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Answers>(
    () => initialDraft?.answers ?? {}
  );
  const [customValues] = useState<Record<string, string>>(
    () => initialDraft?.customValues ?? {}
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeUnitIndex = editingUnitIndex ?? unitIndex;
  const completedQuestionCount = unitIndex;
  const progress = Math.round((completedQuestionCount / TOTAL_QUESTIONS) * 100);
  const visibleUnits = CONVERSATION_UNITS.slice(
    0,
    Math.min(unitIndex + 1, TOTAL_QUESTIONS)
  );

  useEffect(() => {
    saveBusinessPlanDraft({
      conversationUnitIndex: unitIndex,
      answers,
      customValues,
    });
  }, [answers, customValues, unitIndex]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [editingUnitIndex, unitIndex]);

  const completeCurrentUnit = (skipped = false) => {
    const currentUnit = CONVERSATION_UNITS[activeUnitIndex];
    if (!currentUnit) return;

    setAnswers(currentAnswers => ({
      ...currentAnswers,
      [currentUnit.id]: skipped ? "已跳过" : "已完成（占位回答）",
    }));
    const nextPosition = completeConversationPosition(
      { unitIndex, editingUnitIndex },
      TOTAL_QUESTIONS
    );
    setUnitIndex(nextPosition.unitIndex);
    setEditingUnitIndex(nextPosition.editingUnitIndex);
  };

  const editCompletedUnit = (index: number) => {
    setEditingUnitIndex(index);
  };

  return (
    <div
      className="min-h-screen bg-[var(--bg)] pb-16 text-[var(--ink)]"
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
              访谈中 · {completedQuestionCount} / {TOTAL_QUESTIONS} 题
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
        <div className="space-y-11">
          <AdvisorMessage>（开场白待补充）</AdvisorMessage>

          {visibleUnits.map((unit, index) => {
            const active = index === activeUnitIndex;
            const answer = answers[unit.id];
            const displayedAnswer = typeof answer === "string" ? answer : "";
            const showSectionIntro =
              index === 0 || unit.section !== visibleUnits[index - 1].section;

            return (
              <div key={unit.id} className="space-y-5">
                {showSectionIntro ? (
                  <SectionIntro>{unit.sectionIntro}</SectionIntro>
                ) : null}
                <AdvisorMessage>{unit.label}</AdvisorMessage>

                {active ? (
                  <div className="ml-11 flex flex-wrap gap-2">
                    {unit.optional ? (
                      <button
                        type="button"
                        onClick={() => completeCurrentUnit(true)}
                        className="rounded-lg px-3 py-2 text-xs font-semibold text-[#586158]"
                      >
                        跳过
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => completeCurrentUnit()}
                      className="inline-flex items-center gap-2 rounded-xl bg-[var(--pri)] px-4 py-2.5 text-sm font-semibold text-white"
                    >
                      <Check className="h-4 w-4" />
                      继续
                    </button>
                  </div>
                ) : displayedAnswer ? (
                  <div className="space-y-2">
                    <UserBubble>{displayedAnswer}</UserBubble>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => editCompletedUnit(index)}
                        className="inline-flex items-center gap-1 rounded-lg border border-[var(--line)] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#586158]"
                      >
                        <Pencil className="h-3 w-3" />
                        修改
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}

          {unitIndex === TOTAL_QUESTIONS && editingUnitIndex === null ? (
            <AdvisorMessage>
              占位对话流程已完成，具体题目将在后续阶段接入。
            </AdvisorMessage>
          ) : null}
          <div ref={bottomRef} className="h-4" aria-hidden="true" />
        </div>
      </main>
    </div>
  );
}
