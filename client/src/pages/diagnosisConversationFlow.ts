import type {
  DiagnosisQuestion,
  DiagnosisStep,
} from "./diagnosisQuestionnaire";

export const CONVERSATION_OPENING =
  "欢迎来到 NBG 增长诊断。我会像一位咨询顾问一样，通过商业模式、内部能力、财务健康、市场机会和竞争格局五个维度了解你的企业。整个过程分为深度访谈、五维诊断、形成突破方案三步，预计需要 8–12 分钟。你提供的所有信息都会严格保密，仅用于生成本次诊断，并加密存储、不会对外传递。";

type ConversationSection =
  | "basics"
  | "market"
  | "business"
  | "capability"
  | "finance"
  | "closing";

const SECTION_INTROS: Record<ConversationSection, string> = {
  basics: "先了解一下你公司的基本情况。",
  market: "接下来看看你的市场和竞争。",
  business: "聊聊你的生意怎么做。",
  capability: "看看团队和内部能力。",
  finance: "下面是财务部分，这些数据我们严格保密，仅用于本次诊断。",
  closing: "最后一个开放问题。",
};

const STEP_SECTIONS: Record<string, ConversationSection> = {
  "company-basics": "basics",
  "company-scale": "basics",
  "company-trend": "basics",
  "company-channel-anxiety": "basics",
  market: "market",
  competition: "market",
  "competitive-assets": "market",
  "business-model": "business",
  "business-model-plus": "business",
  capability: "capability",
  "finance-model": "finance",
  "finance-cash": "finance",
  "finance-plus-ar": "finance",
};

export type DiagnosisConversationUnit = {
  id: string;
  section: ConversationSection;
  sectionIntro: string;
  step: DiagnosisStep;
  stepIndex: number;
  questions: DiagnosisQuestion[];
};

export function buildDiagnosisConversationUnits(
  steps: DiagnosisStep[]
): DiagnosisConversationUnit[] {
  const regularUnits: DiagnosisConversationUnit[] = [];
  let anxietyUnit: DiagnosisConversationUnit | null = null;

  steps.forEach((step, stepIndex) => {
    const section = STEP_SECTIONS[step.id];
    if (!section) return;

    if (step.id === "finance-plus-ar") {
      regularUnits.push({
        id: step.id,
        section,
        sectionIntro: SECTION_INTROS[section],
        step,
        stepIndex,
        questions: step.questions,
      });
      return;
    }

    step.questions.forEach(question => {
      const unit: DiagnosisConversationUnit = {
        id: question.id,
        section,
        sectionIntro: SECTION_INTROS[section],
        step,
        stepIndex,
        questions: [question],
      };
      if (question.id === "top-anxiety") {
        anxietyUnit = {
          ...unit,
          section: "closing",
          sectionIntro: SECTION_INTROS.closing,
        };
      } else {
        regularUnits.push(unit);
      }
    });
  });

  return anxietyUnit ? [...regularUnits, anxietyUnit] : regularUnits;
}

export function getConversationValidationStep(
  unit: DiagnosisConversationUnit
): DiagnosisStep {
  return { ...unit.step, questions: unit.questions };
}
