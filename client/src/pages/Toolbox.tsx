import { AppFooter, AppHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ArrowRight,
  Bell,
  ChartNoAxesCombined,
  FileText,
  Goal,
  Network,
  Search,
  Sparkles,
  Target,
  Users,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

type SkillStatus = "live" | "soon";

type ProductSkill = {
  title: string;
  category: string;
  description: string;
  status: SkillStatus;
  href?: string;
  Icon: LucideIcon;
};

const skillGroups: Array<{ category: string; no: string; skills: ProductSkill[] }> = [
  {
    category: "增长诊断",
    no: "01",
    skills: [
      {
        title: "NBG 增长诊断",
        category: "增长诊断",
        description: "从企业经营基本盘出发，完成五维健康度诊断，定位真正限制增长的关键卡点。",
        status: "live",
        href: "/diagnosis",
        Icon: ChartNoAxesCombined,
      },
      {
        title: "竞争分析",
        category: "增长诊断",
        description: "拆解竞争对手、市场位置与差异化机会，形成可执行的竞争策略判断。",
        status: "soon",
        Icon: Search,
      },
    ],
  },
  {
    category: "战略规划",
    no: "02",
    skills: [
      {
        title: "战略规划",
        category: "战略规划",
        description: "梳理企业战略方向、增长路径与关键取舍，形成清晰的阶段性经营路线。",
        status: "soon",
        Icon: Target,
      },
      {
        title: "商业模式设计",
        category: "战略规划",
        description: "围绕客户、价值、收入与成本结构，设计更清晰、可验证的商业模式。",
        status: "soon",
        Icon: Sparkles,
      },
    ],
  },
  {
    category: "资本融资",
    no: "03",
    skills: [
      {
        title: "商业计划书",
        category: "资本融资",
        description: "用投资人视角组织项目亮点、市场逻辑、商业模型与融资叙事。",
        status: "soon",
        Icon: FileText,
      },
      {
        title: "股权架构设计",
        category: "资本融资",
        description: "围绕合伙人、控制权、激励与退出机制，设计更稳健的股权结构。",
        status: "soon",
        Icon: Network,
      },
    ],
  },
  {
    category: "组织管理",
    no: "04",
    skills: [
      {
        title: "OKR 制定",
        category: "组织管理",
        description: "把战略目标拆成可执行、可追踪、可复盘的组织目标与关键结果。",
        status: "soon",
        Icon: Goal,
      },
      {
        title: "薪酬绩效设计",
        category: "组织管理",
        description: "设计目标、绩效、激励与薪酬之间的联动机制，让团队动作对齐业务结果。",
        status: "soon",
        Icon: WalletCards,
      },
    ],
  },
];

function notifyUpcoming(skill: ProductSkill) {
  toast("预约通知已记录", {
    description: `${skill.title} 即将上线，我们会优先开放给预约用户。`,
  });
}

function SkillCard({ skill }: { skill: ProductSkill }) {
  const Icon = skill.Icon;
  const isLive = skill.status === "live";
  const statusLabel = isLive ? "已上线 · 完整可用" : "即将上线";

  return (
    <Card
      className={`h-full rounded-[20px] border bg-white transition hover:-translate-y-1 hover:shadow-[0_30px_64px_-42px_rgba(31,61,50,.32)] ${
        isLive
          ? "border-[var(--zs-primary)] shadow-[0_16px_48px_-32px_rgba(31,61,50,.30)]"
          : "border-[var(--zs-line)]"
      }`}
    >
      <CardContent className="flex h-full flex-col p-7">
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-[46px] w-[46px] items-center justify-center rounded-[12px] ${
              isLive
                ? "bg-[var(--zs-primary)] text-white"
                : "bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]"
            }`}
          >
            <Icon className="h-[23px] w-[23px]" strokeWidth={1.7} />
          </div>
          <span
            className={`rounded-md px-[9px] py-[3px] text-[11px] font-bold tracking-[.06em] ${
              isLive
                ? "bg-[rgba(201,162,75,.24)] text-[#5a4516]"
                : "bg-[#f0eee7] text-[#8a8f88]"
            }`}
          >
            {statusLabel}
          </span>
        </div>

        <div className="mt-5 text-[12px] font-bold tracking-[.08em] text-[var(--zs-gold)]">
          {skill.category}
        </div>
        <h3 className="mt-2 text-[21px] font-extrabold leading-[1.35]">{skill.title}</h3>
        <p className="mt-3 flex-1 text-[14px] leading-[1.75] text-[var(--zs-sub)]">
          {skill.description}
        </p>

        {isLive && skill.href ? (
          <Button asChild className="mt-7 w-full justify-between rounded-[11px]">
            <Link href={skill.href}>
              开始使用
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="mt-7 w-full justify-between rounded-[11px] border-[var(--zs-line)]"
            onClick={() => notifyUpcoming(skill)}
          >
            预约通知
            <Bell className="h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function Toolbox() {
  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />

      <main>
        <section className="zs-container pb-16 pt-[84px] text-center">
          <div className="inline-flex items-center gap-2 rounded-[7px] bg-[rgba(201,162,75,.2)] px-[13px] py-1.5 text-xs font-bold tracking-[.08em] text-[#5a4516]">
            <Sparkles className="h-3.5 w-3.5" />
            AI 顾问矩阵
          </div>
          <h1 className="mt-[22px] text-[48px] font-black leading-[1.14] tracking-[.01em] md:text-[56px]">
            AI 经营工具箱
          </h1>
          <p className="mx-auto mt-6 max-w-[680px] text-[20px] font-medium leading-[1.7] text-[var(--zs-ink)]">
            企业经营的每一个难题，都有一位专属的 AI 顾问。
          </p>
          <p className="mx-auto mt-[14px] max-w-[620px] text-[16px] leading-[1.8] text-[var(--zs-sub)]">
            每一位 AI 顾问，都装载了顶级咨询方法论——不是简单问答，而是结构化的咨询交付。
          </p>
        </section>

        <section className="zs-container pb-20">
          <div className="space-y-12">
            {skillGroups.map((group) => (
              <section key={group.category}>
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <div className="font-['Inter'] text-[14px] font-bold text-[var(--zs-gold)]">
                      {group.no}
                    </div>
                    <h2 className="mt-2 text-[26px] font-extrabold leading-[1.3]">{group.category}</h2>
                  </div>
                  <span className="hidden text-[13.5px] text-[var(--zs-sub)] sm:inline">
                    {group.skills.length} 个经营动作
                  </span>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  {group.skills.map((skill) => (
                    <SkillCard key={skill.title} skill={skill} />
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-14 flex flex-col gap-8 rounded-[22px] bg-[var(--zs-primary)] p-8 text-[#eef2ed] md:flex-row md:items-center md:justify-between md:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-white/10 text-[var(--zs-gold)]">
                <Users className="h-[23px] w-[23px]" strokeWidth={1.7} />
              </div>
              <div>
                <div className="text-[12px] font-bold tracking-[.08em] text-[var(--zs-gold)]">
                  不知道从哪里开始？
                </div>
                <h2 className="mt-2 text-[28px] font-extrabold leading-[1.32] text-white">
                  先让 NBG 增长诊断顾问
                  <br />
                  帮你看看。
                </h2>
              </div>
            </div>
            <Button variant="gold" size="lg" asChild>
              <Link href="/diagnosis">开始 NBG 诊断 →</Link>
            </Button>
          </div>
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
