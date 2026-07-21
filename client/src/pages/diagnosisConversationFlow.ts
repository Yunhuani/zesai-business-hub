import type {
  DiagnosisQuestion,
  DiagnosisStep,
} from "./diagnosisQuestionnaire";

export const CONVERSATION_OPENING =
  `您好，我是您的泽思增长顾问。

接下来的十几分钟，我会像一次真正的顾问访谈那样，从商业模式、内部能力、财务、市场和竞争五个方面，系统地了解一下您的生意。这个过程分三步：先访谈问诊，把情况聊清楚；再用泽思 NBG 五维增长模型做诊断，帮您看清问题；最后给出增长建议。

聊完之后，您会拿到一份完整的增长诊断报告——它不只是罗列数据，而是像一位资深顾问那样，帮您找到眼下真正卡住增长的地方、指出下一步该往哪走。这也正是我们想做的事：把过去要花几万块请咨询公司才能得到的诊断，用 AI 做到人人可及。

过程需要您一点耐心，您提供的信息越真实、越具体，诊断就越准。也请放心，您的所有信息我们都会严格保密，只用于本次诊断。

那我们开始吧。`;

type ConversationSection =
  | "basics"
  | "market"
  | "business"
  | "capability"
  | "finance"
  | "closing";

const SECTION_INTROS: Record<ConversationSection, string> = {
  basics: "先从一些基本情况聊起，让我对您的公司有个整体印象。",
  market: "接下来，我们看看您所在的市场，以及您面对的竞争。",
  business: "下面聊聊您这门生意——是怎么赚钱的、靠什么留住客户的。",
  capability: "一门生意能不能做大，很大程度看内部。我们来盘一盘您的团队和能力。",
  finance: "接下来是财务部分。这块最能反映生意的健康度，也最敏感——请放心，这些数据我们严格保密，只用于本次诊断。",
  closing: "最后，我想听听您自己的想法。",
};

type ConversationQuestionCopy = {
  label?: string;
  placeholder?: string;
  customPlaceholder?: string;
  helperText?: string;
};

const CONVERSATION_QUESTION_COPY: Record<string, ConversationQuestionCopy> = {
  "company-name": {
    label: "首先，请问您公司叫什么名字？",
  },
  "industry-sub": {
    label: "公司主要业务是什么？介绍一下贵公司的产品或服务。",
  },
  "revenue-band": {
    label: "去年公司的营收大概是多少，在哪个区间？",
  },
  "headcount-band": {
    label: "目前公司团队大概多少人？",
  },
  region: {
    label: "目前公司业务覆盖哪些区域？（可以多选）",
  },
  "revenue-trend": {
    label: "过去这一年，公司的营收是涨、是平、还是有点下滑？",
  },
  channels: {
    label: "您的业务主要通过哪些渠道销售？（可以多选）",
  },
  "home-market": {
    label: "目前公司最主要的市场是哪里？",
  },
  competitors: {
    label: "主要的竞争对手有哪些？请写出前三家竞争对手的公司名或品牌名。",
  },
  "customer-values": {
    label: "您觉得，在这个行业，客户最看重的是什么？（可以多选）",
  },
  "unique-assets": {
    label: "有没有什么是您有、但对手不太容易复制的能力或资源？比如独家资源、技术、老客户关系……（没有也没关系，可跳过）",
  },
  "revenue-sources": {
    label: "您的收入主要来自哪些产品或服务？",
  },
  "earn-retain": {
    label: "说说看，您这门生意主要靠什么赚钱？靠什么把客户留住的？",
  },
  "team-structure": {
    label: "目前公司团队，以下几个维度，您觉得处在什么水平？（没有的选\"不适用\"）",
    customPlaceholder: "关于团队，还有什么想补充的吗？（选填）",
  },
  "function-strength": {
    label: "以下几项关键能力，评估一下我们当前的水平。",
    customPlaceholder: "关于这些能力，还有什么想补充的吗？（选填）",
  },
  "net-margin": {
    label: "公司去年的净利率大概在什么区间？",
  },
  "cost-structure": {
    label: "公司的成本主要用在哪儿了？比如原材料、人工、房租、推广……说说大头在哪。",
  },
  cash: {
    label: "账上大概还有多少可动用的现金？（选填，方便的话填个大概数）",
  },
  "monthly-fixed": {
    label: "每个月不管有没有生意都得花出去的固定开销，大概多少？（选填）",
  },
  "finance-product-lines": {
    label: "再来看一下主要产品线——每条产品线的收入和成本情况。最多可以填 6 条。（没有明细可跳过）",
    helperText: undefined,
  },
  "finance-customers": {
    label: "您最大的几个客户，各占多少收入？列出前三位就可以。（没有可跳过）",
    helperText: undefined,
  },
  "top-anxiety": {
    label: "最后我想听您说说心里话：当前您最焦虑、最想解决的一件事是什么？",
    placeholder: "只写眼下最重要的一件事，越具体越好",
  },
};

function applyConversationCopy(question: DiagnosisQuestion): DiagnosisQuestion {
  const copy = CONVERSATION_QUESTION_COPY[question.id];
  return copy ? { ...question, ...copy } as DiagnosisQuestion : question;
}

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
        questions: step.questions.map(applyConversationCopy),
      });
      return;
    }

    step.questions.forEach(sourceQuestion => {
      const question = applyConversationCopy(sourceQuestion);
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
