import { AppFooter, AppHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AgentEvents, trackAgent } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  Bot,
  Boxes,
  ChartNoAxesCombined,
  FileText,
  Goal,
  Network,
  Search,
  Sparkles,
} from "lucide-react";
import { Link } from "wouter";

type AgentItem = NonNullable<ReturnType<typeof trpc.agent.list.useQuery>["data"]>[number];

const categoryOrder = ["增长诊断", "战略与计划", "组织与股权", "市场与竞争", "其他顾问"];

function getAgentCategory(agent: AgentItem) {
  const text = `${agent.name} ${agent.description ?? ""}`;
  if (/增长|诊断|NBG/.test(text)) return "增长诊断";
  if (/商业计划|战略|融资|BP/.test(text)) return "战略与计划";
  if (/股权|组织|OKR|团队|管理/.test(text)) return "组织与股权";
  if (/竞争|竞品|市场|渠道|品牌/.test(text)) return "市场与竞争";
  return "其他顾问";
}

function getAgentIcon(agent: AgentItem) {
  const text = `${agent.name} ${agent.description ?? ""}`;
  if (/增长|诊断|NBG/.test(text)) return ChartNoAxesCombined;
  if (/商业计划|融资|BP/.test(text)) return FileText;
  if (/股权/.test(text)) return Network;
  if (/OKR|目标|团队|组织/.test(text)) return Goal;
  if (/竞争|竞品|市场/.test(text)) return Search;
  return Bot;
}

export default function Toolbox() {
  const { data: agents, isLoading } = trpc.agent.list.useQuery();
  const groupedAgents = categoryOrder
    .map((category) => ({
      category,
      agents: (agents ?? []).filter((agent) => getAgentCategory(agent) === category),
    }))
    .filter((group) => group.agents.length > 0);

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />

      <main>
        <section className="mx-auto max-w-[1200px] px-6 pb-16 pt-[84px] text-center md:px-10">
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

        <section className="mx-auto max-w-[1200px] px-6 pb-20 md:px-10">
          {isLoading ? (
            <div className="flex min-h-[260px] items-center justify-center rounded-[20px] border border-[var(--zs-line)] bg-white">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--zs-primary)] border-t-transparent" />
            </div>
          ) : groupedAgents.length > 0 ? (
            <div className="space-y-12">
              {groupedAgents.map((group, groupIndex) => (
                <section key={group.category}>
                  <div className="mb-5 flex items-end justify-between gap-4">
                    <div>
                      <div className="font-['Inter'] text-[14px] font-bold text-[var(--zs-gold)]">
                        {String(groupIndex + 1).padStart(2, "0")}
                      </div>
                      <h2 className="mt-2 text-[26px] font-extrabold leading-[1.3]">{group.category}</h2>
                    </div>
                    <span className="hidden text-[13.5px] text-[var(--zs-sub)] sm:inline">
                      {group.agents.length} 位 AI 顾问
                    </span>
                  </div>

                  <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                    {group.agents.map((agent, index) => {
                      const Icon = getAgentIcon(agent);
                      const isFlagship = groupIndex === 0 && index === 0;
                      return (
                        <Link
                          key={agent.id}
                          href={`/agent/${agent.id}`}
                          onClick={() => trackAgent(AgentEvents.AGENT_CLICK, agent.id, agent.name)}
                          className="block h-full"
                        >
                          <Card
                            className={`h-full rounded-[20px] border-[var(--zs-line)] bg-white transition hover:-translate-y-1 hover:shadow-[0_30px_64px_-42px_rgba(31,61,50,.32)] ${
                              isFlagship ? "shadow-[0_16px_48px_-32px_rgba(31,61,50,.30)]" : ""
                            }`}
                          >
                            <CardContent className="flex h-full flex-col p-7">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]">
                                  <Icon className="h-[23px] w-[23px]" strokeWidth={1.7} />
                                </div>
                                <span
                                  className={`rounded-md px-[9px] py-[3px] text-[11px] font-bold tracking-[.06em] ${
                                    isFlagship
                                      ? "bg-[rgba(201,162,75,.24)] text-[#5a4516]"
                                      : "bg-[#f0eee7] text-[#8a8f88]"
                                  }`}
                                >
                                  {isFlagship ? "主打 · 完整可用" : "可用"}
                                </span>
                              </div>
                              <h3 className="mt-5 text-[20px] font-extrabold leading-[1.35]">{agent.name}</h3>
                              <p className="mt-3 flex-1 text-[14px] leading-[1.75] text-[var(--zs-sub)]">
                                {agent.description || "进入对话后，根据你的问题生成结构化咨询建议。"}
                              </p>
                              <div className="mt-7 flex items-center justify-between border-t border-[var(--zs-line)] pt-4">
                                <span className="text-[13px] font-semibold text-[var(--zs-primary)]">开始咨询</span>
                                <ArrowRight className="h-4 w-4 text-[var(--zs-gold)]" />
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <div className="rounded-[20px] border border-[var(--zs-line)] bg-white p-10 text-center">
              <Boxes className="mx-auto h-10 w-10 text-[var(--zs-primary)]" strokeWidth={1.7} />
              <h2 className="mt-5 text-[24px] font-extrabold">AI 顾问暂未配置</h2>
              <p className="mt-3 text-[15px] leading-[1.7] text-[var(--zs-sub)]">
                工具箱会自动展示后端已配置的 AI 顾问。
              </p>
            </div>
          )}

          <div className="mt-14 flex flex-col gap-8 rounded-[22px] bg-[var(--zs-primary)] p-8 text-[#eef2ed] md:flex-row md:items-center md:justify-between md:p-10">
            <div className="flex items-center gap-4">
              <div className="flex h-[46px] w-[46px] items-center justify-center rounded-[12px] bg-white/10 text-[var(--zs-gold)]">
                <ChartNoAxesCombined className="h-[23px] w-[23px]" strokeWidth={1.7} />
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
