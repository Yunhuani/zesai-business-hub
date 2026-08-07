import type { LucideIcon } from "lucide-react";
import {
  ChartNoAxesCombined,
  FileText,
  Goal,
  Network,
  Search,
  Sparkles,
  Target,
  WalletCards,
} from "lucide-react";

export type AgentStatus = "live" | "upcoming";

export type AgentMethodology = {
  title: string;
  description: string;
};

export type AgentStep = {
  title: string;
  description: string;
};

export type Agent = {
  id: string;
  name: string;
  problem: string;
  outcomes: string[];
  summary: string;
  methodology: AgentMethodology | null;
  structure: string[];
  steps: AgentStep[];
  status: AgentStatus;
  startPath?: string;
  icon: LucideIcon;
  homeCard: boolean;
  toolboxCategory: string;
  toolboxNo: string;
};

export const agents: Agent[] = [
  {
    id: "nbg-diagnosis",
    name: "NBG 增长诊断",
    problem: "增长卡住了，找不到突破口",
    outcomes: [], // TODO: 待业务方提供
    summary: "从企业经营基本盘出发，完成五维健康度诊断，定位真正限制增长的关键卡点。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [
      { title: "填写经营信息", description: "几分钟填写企业情况，信息越全，诊断越精准" },
      { title: "AI 五维深度分析", description: "基于 NBG 方法论，从五个维度系统排查，找出真正制约增长的那一环" },
      { title: "获得增长诊断报告", description: "五维健康度、三大关键发现、增长瓶颈与突破方向" },
    ],
    status: "live",
    startPath: "/diagnosis/conversation",
    icon: ChartNoAxesCombined,
    homeCard: false,
    toolboxCategory: "增长诊断",
    toolboxNo: "01",
  },
  {
    id: "competitive-analysis",
    name: "竞争分析",
    problem: "看不清竞争对手怎么打",
    outcomes: [], // TODO: 待业务方提供
    summary: "拆解竞争对手、市场位置与差异化机会，形成可执行的竞争策略判断。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [], // TODO: 待业务方提供
    status: "upcoming",
    icon: Search,
    homeCard: true,
    toolboxCategory: "增长诊断",
    toolboxNo: "01",
  },
  {
    id: "strategy-planning",
    name: "战略规划",
    problem: "", // TODO: 待业务方提供
    outcomes: [], // TODO: 待业务方提供
    summary: "梳理企业战略方向、增长路径与关键取舍，形成清晰的阶段性经营路线。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [], // TODO: 待业务方提供
    status: "upcoming",
    icon: Target,
    homeCard: false,
    toolboxCategory: "战略规划",
    toolboxNo: "02",
  },
  {
    id: "business-model-design",
    name: "商业模式设计",
    problem: "", // TODO: 待业务方提供
    outcomes: [], // TODO: 待业务方提供
    summary: "围绕客户、价值、收入与成本结构，设计更清晰、可验证的商业模式。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [], // TODO: 待业务方提供
    status: "upcoming",
    icon: Sparkles,
    homeCard: false,
    toolboxCategory: "战略规划",
    toolboxNo: "02",
  },
  {
    id: "business-plan",
    name: "商业计划书",
    problem: "要融资，但没有像样的计划书",
    outcomes: [], // TODO: 待业务方提供
    summary: "用投资人视角组织项目亮点、市场逻辑、商业模型与融资叙事。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [], // TODO: 待业务方提供
    status: "live",
    startPath: "/business-plan/conversation",
    icon: FileText,
    homeCard: true,
    toolboxCategory: "资本融资",
    toolboxNo: "03",
  },
  {
    id: "equity-structure",
    name: "股权架构设计",
    problem: "合伙人股权怎么分才合理",
    outcomes: [], // TODO: 待业务方提供
    summary: "围绕合伙人、控制权、激励与退出机制，设计更稳健的股权结构。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [], // TODO: 待业务方提供
    status: "upcoming",
    icon: Network,
    homeCard: true,
    toolboxCategory: "资本融资",
    toolboxNo: "03",
  },
  {
    id: "okr-management",
    name: "OKR 制定",
    problem: "团队目标定不下来",
    outcomes: [], // TODO: 待业务方提供
    summary: "把战略目标拆成可执行、可追踪、可复盘的组织目标与关键结果。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [], // TODO: 待业务方提供
    status: "upcoming",
    icon: Goal,
    homeCard: true,
    toolboxCategory: "组织管理",
    toolboxNo: "04",
  },
  {
    id: "compensation-performance",
    name: "薪酬绩效设计",
    problem: "", // TODO: 待业务方提供
    outcomes: [], // TODO: 待业务方提供
    summary: "设计目标、绩效、激励与薪酬之间的联动机制，让团队动作对齐业务结果。",
    methodology: null, // TODO: 待业务方提供
    structure: [], // TODO: 待业务方提供
    steps: [], // TODO: 待业务方提供
    status: "upcoming",
    icon: WalletCards,
    homeCard: false,
    toolboxCategory: "组织管理",
    toolboxNo: "04",
  },
];
