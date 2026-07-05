import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { ExpertConsultationDialog } from "@/components/ExpertConsultationDialog";
import { WeChatBrowserGuide } from "@/components/WeChatBrowserGuide";
import { isWeChatBrowser } from "@/utils/wechatDetector";
import { trackConversion, ConversionEvents, trackAgent, AgentEvents } from "@/lib/analytics";
import { Footer, Navbar } from "@/components/layout";
import { Link, useLocation } from "wouter";

const skillCards = [
  {
    title: "想融资，但没有清晰材料",
    description: "把商业模式、增长数据与融资故事整理成投资人能快速理解的结构。",
    agentName: "融资商业计划书",
    tag: "融资材料",
    Icon: Icons.FileText,
  },
  {
    title: "合伙人股权怎么分才合理",
    description: "从贡献、风险、退出机制和长期激励出发，形成可讨论的股权框架。",
    agentName: "股权架构师",
    tag: "股权设计",
    Icon: Icons.Network,
  },
  {
    title: "看不清竞争对手怎么办",
    description: "拆解竞品定位、渠道动作与差异化空间，找到真正值得投入的机会。",
    agentName: "竞品分析专家",
    tag: "竞争分析",
    Icon: Icons.Search,
  },
  {
    title: "团队目标定不下来",
    description: "把战略方向拆成可执行的 OKR、关键结果与阶段复盘动作。",
    agentName: "OKR目标管理教练",
    tag: "组织管理",
    Icon: Icons.ListChecks,
  },
];

const toolboxItems = ["商业计划书", "增长诊断", "股权方案", "OKR 拆解"];

const processSteps = [
  {
    title: "结构化访谈",
    description: "从真实经营问题出发，先厘清目标、约束与关键事实。",
    Icon: Icons.MessagesSquare,
  },
  {
    title: "框架与咨询方法论",
    description: "引入战略、增长、组织和财务模型，避免只给泛泛建议。",
    Icon: Icons.LayoutTemplate,
  },
  {
    title: "独家 AI Skill + Agent",
    description: "让专用顾问完成推理、拆解与交叉验证，形成可执行判断。",
    Icon: Icons.Bot,
  },
  {
    title: "交付解决方案",
    description: "输出诊断报告、行动清单和下一步决策依据。",
    Icon: Icons.PackageCheck,
  },
];

const caseCards = [
  {
    industry: "消费品牌",
    title: "新渠道增长诊断",
    problem: "投放效率下降，团队无法判断是渠道、内容还是产品问题。",
    result: "明确三类高优先级增长动作，试错成本下降 45%。",
    Icon: Icons.Megaphone,
  },
  {
    industry: "制造企业",
    title: "年度战略取舍",
    problem: "多条业务线并行，资源投入分散，管理层判断难以统一。",
    result: "形成业务优先级矩阵，决策周期缩短 50%。",
    Icon: Icons.Factory,
  },
  {
    industry: "科技服务",
    title: "融资 BP 重构",
    problem: "商业逻辑表达不清，投资人反馈分散，材料反复修改。",
    result: "重建融资叙事与数据结构，沟通效率显著提升。",
    Icon: Icons.LineChart,
  },
  {
    industry: "本地服务",
    title: "门店经营复盘",
    problem: "客流波动大，无法判断会员、产品和活动哪个环节拖累业绩。",
    result: "拆出关键指标看板，月度经营复盘更稳定。",
    Icon: Icons.Store,
  },
];

export default function Home() {
  const [isInWeChatBrowser] = useState(isWeChatBrowser());
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [heroQuery, setHeroQuery] = useState("公司业绩上不去怎么办？");
  const [, setLocation] = useLocation();
  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery();

  const agentByName = useMemo(() => {
    return new Map((agents ?? []).map((agent) => [agent.name, agent]));
  }, [agents]);

  const smartAssistantId = agentByName.get("智能AI助手")?.id ?? 0;

  useEffect(() => {
    trackConversion(ConversionEvents.HOME_VISIT);
  }, []);

  const handleHeroSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!smartAssistantId) return;

    const query = heroQuery.trim() || "公司业绩上不去怎么办？";
    setLocation(`/agent/${smartAssistantId}?initial=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <Navbar />

      <main>
        <section className="border-b border-[var(--zs-line)] bg-[linear-gradient(180deg,rgba(238,242,237,.75)_0%,rgba(250,250,248,0)_72%)]">
          <div className="mx-auto max-w-[var(--zs-content-max)] px-6 pb-[var(--zs-space-20)] pt-[var(--zs-space-16)] text-center md:px-10">
            {isInWeChatBrowser && <WeChatBrowserGuide />}

            <p className="mx-auto mb-[var(--zs-space-5)] w-fit rounded-[var(--zs-radius-pill)] border border-[var(--zs-line)] bg-[var(--zs-card)] px-4 py-2 text-[var(--zs-text-eyebrow-size)] font-bold tracking-[var(--zs-text-eyebrow-spacing)] text-[var(--zs-gold-ink)] shadow-[var(--zs-shadow-card)]">
              ZESI AI BUSINESS ADVISOR
            </p>
            <h1 className="text-[var(--zs-text-display-size)] font-[var(--zs-text-display-weight)] leading-[var(--zs-text-display-line)] text-[var(--zs-ink)]">
              您的AI商业顾问
            </h1>
            <p className="mx-auto mt-[var(--zs-space-6)] max-w-[760px] text-[var(--zs-text-lead-size)] leading-[var(--zs-text-lead-line)] text-[var(--zs-sub)]">
              将全球顶级咨询公司的方法论，与前沿 AI 模型相结合。提供麦肯锡级别的经营解决方案。
            </p>

            <form
              onSubmit={handleHeroSubmit}
              className="mx-auto mt-[var(--zs-space-10)] flex max-w-[960px] flex-col gap-3 rounded-[var(--zs-radius-panel)] border border-[var(--zs-line)] bg-[var(--zs-card)] p-3 text-left shadow-[var(--zs-shadow-large)] md:flex-row md:items-center md:gap-4"
            >
              <div className="flex min-h-12 flex-1 items-center gap-3 px-2 md:px-4">
                <Icons.MessageCircle className="h-5 w-5 shrink-0 text-[var(--zs-gold)]" />
                <span className="hidden shrink-0 text-sm font-semibold text-[var(--zs-ink)] sm:inline">
                  您可以问我：
                </span>
                <input
                  value={heroQuery}
                  onChange={(event) => setHeroQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent text-base text-[var(--zs-ink)] outline-none placeholder:text-[var(--zs-weak)]"
                  placeholder="公司业绩上不去怎么办？"
                />
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full shrink-0 md:w-auto"
                disabled={agentsLoading || !smartAssistantId}
              >
                开始
                <Icons.ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-[var(--zs-content-max)] px-6 py-[var(--zs-space-20)] md:px-10">
          <div className="mx-auto max-w-[760px] text-center">
            <p className="text-[var(--zs-text-eyebrow-size)] font-bold tracking-[var(--zs-text-eyebrow-spacing)] text-[var(--zs-gold-ink)]">
              START WITH THE PROBLEM
            </p>
            <h2 className="mt-3 text-[var(--zs-text-h2-size)] font-[var(--zs-text-h2-weight)] leading-[var(--zs-text-h2-line)]">
              您现在面临什么问题？
            </h2>
            <p className="mt-4 text-[var(--zs-text-body-size)] leading-[var(--zs-text-body-line)] text-[var(--zs-sub)]">
              从业务的现状出发，匹配对应的 AI 顾问，不再被工具入口分流。
            </p>
          </div>

          <Card variant="feature" className="mt-[var(--zs-space-12)] overflow-hidden p-0">
            <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.05fr_.95fr]">
              <div className="p-[var(--zs-space-8)] md:p-[var(--zs-space-12)]">
                <div className="flex flex-wrap gap-2">
                  {["引流获客", "经营诊断", "增长突破"].map((label) => (
                    <span
                      key={label}
                      className="rounded-[var(--zs-radius-pill)] bg-[var(--zs-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--zs-primary)]"
                    >
                      {label}
                    </span>
                  ))}
                </div>
                <h3 className="mt-[var(--zs-space-6)] text-[var(--zs-text-h3-size)] font-[var(--zs-text-h3-weight)] leading-[var(--zs-text-h3-line)]">
                  增长卡住了，找不到突破口
                </h3>
                <p className="mt-4 max-w-xl text-[var(--zs-text-body-size)] leading-[var(--zs-text-body-line)] text-[var(--zs-sub)]">
                  通过 NBG 增长诊断，把企业的获客、转化、复购和组织执行拆成可分析的经营问题，生成一份可直接开会讨论的诊断报告。
                </p>
                <div className="mt-[var(--zs-space-8)] flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/diagnosis">
                      开始诊断
                      <Icons.ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button variant="outlineGold" size="lg" asChild>
                    <Link href="/pricing">查看会员权益</Link>
                  </Button>
                </div>
              </div>

              <div className="border-t border-[var(--zs-line)] bg-[image:var(--zs-dark-panel)] p-[var(--zs-space-8)] text-[var(--zs-dark-panel-foreground)] lg:border-l lg:border-t-0">
                <div className="rounded-[var(--zs-radius-report)] border border-[var(--zs-dark-panel-border)] bg-[rgba(255,255,255,.04)] p-5 shadow-[var(--zs-shadow-report)]">
                  <div className="flex items-center justify-between border-b border-[rgba(201,162,75,.28)] pb-4">
                    <div>
                      <p className="text-xs font-bold tracking-[var(--zs-text-eyebrow-spacing)] text-[var(--zs-gold)]">
                        NBG REPORT SAMPLE
                      </p>
                      <h4 className="mt-2 text-xl font-bold">增长诊断报告</h4>
                    </div>
                    <Icons.Activity className="h-8 w-8 text-[var(--zs-gold)]" />
                  </div>
                  <div className="mt-6 grid gap-5 md:grid-cols-[.9fr_1.1fr]">
                    <div className="relative mx-auto flex aspect-square w-full max-w-[180px] items-center justify-center rounded-full border border-[rgba(201,162,75,.32)]">
                      <div className="absolute h-[72%] w-[72%] rounded-full border border-[rgba(201,162,75,.22)]" />
                      <div className="absolute h-[42%] w-[42%] rounded-full border border-[rgba(201,162,75,.18)]" />
                      <div className="h-[48%] w-[66%] rotate-12 rounded-[42%] border-2 border-[var(--zs-gold)] bg-[rgba(201,162,75,.16)]" />
                    </div>
                    <div className="space-y-4">
                      {[
                        ["获客效率", "72%"],
                        ["转化质量", "58%"],
                        ["复购潜力", "81%"],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <div className="mb-2 flex justify-between text-sm">
                            <span className="text-[var(--zs-dark-panel-muted)]">{label}</span>
                            <span className="font-bold text-[var(--zs-gold)]">{value}</span>
                          </div>
                          <div className="h-2 rounded-full bg-[rgba(255,255,255,.12)]">
                            <div
                              className="h-2 rounded-full bg-[var(--zs-gold)]"
                              style={{ width: value }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="mt-[var(--zs-space-6)] grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {skillCards.map((skill) => {
              const agent = agentByName.get(skill.agentName);
              const SkillIcon = skill.Icon;
              const content = (
                <Card className="h-full transition-transform hover:-translate-y-1 hover:shadow-[var(--zs-shadow-float)]">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[var(--zs-radius-icon)] bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]">
                      <SkillIcon className="h-6 w-6" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold leading-tight">{skill.title}</h3>
                    <p className="mt-3 flex-1 text-sm leading-[var(--zs-text-body-line)] text-[var(--zs-sub)]">
                      {skill.description}
                    </p>
                    <div className="mt-5 flex items-center justify-between border-t border-[var(--zs-line)] pt-4 text-sm font-semibold">
                      <span className="text-[var(--zs-gold-ink)]">{skill.tag}</span>
                      <span className="flex items-center gap-1 text-[var(--zs-primary)]">
                        开始
                        <Icons.ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );

              return agent ? (
                <Link
                  key={skill.title}
                  href={`/agent/${agent.id}`}
                  onClick={() => trackAgent(AgentEvents.AGENT_CLICK, agent.id, agent.name)}
                  className="block h-full"
                >
                  {content}
                </Link>
              ) : (
                <div key={skill.title} className="h-full">
                  {content}
                </div>
              );
            })}
          </div>

          <div className="mt-[var(--zs-space-10)] overflow-hidden rounded-[var(--zs-radius-panel)] border border-[var(--zs-dark-panel-border)] bg-[image:var(--zs-dark-panel)] p-[var(--zs-space-8)] text-[var(--zs-dark-panel-foreground)] shadow-[var(--zs-shadow-report)] md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <p className="text-[var(--zs-text-eyebrow-size)] font-bold tracking-[var(--zs-text-eyebrow-spacing)] text-[var(--zs-gold)]">
                AI 经营工具箱
              </p>
              <h3 className="mt-3 text-2xl font-bold">每一个工具，都对应一个真实经营动作。</h3>
              <div className="mt-5 flex flex-wrap gap-2">
                {toolboxItems.map((item) => (
                  <span
                    key={item}
                    className="rounded-[var(--zs-radius-pill)] border border-[rgba(201,162,75,.34)] px-3 py-1 text-sm text-[var(--zs-dark-panel-muted)]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <Button variant="gold" size="lg" className="mt-6 md:mt-0" asChild>
              <Link href="/pricing">
                进入工具箱
                <Icons.ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-[var(--zs-line)] bg-[var(--zs-card)]">
          <div className="mx-auto max-w-[var(--zs-content-max)] px-6 py-[var(--zs-space-20)] md:px-10">
            <div className="max-w-[760px]">
              <p className="text-[var(--zs-text-eyebrow-size)] font-bold tracking-[var(--zs-text-eyebrow-spacing)] text-[var(--zs-gold-ink)]">
                HOW IT WORKS
              </p>
              <h2 className="mt-3 text-[var(--zs-text-h2-size)] font-[var(--zs-text-h2-weight)] leading-[var(--zs-text-h2-line)]">
                每一步，都是顶级咨询方法论与 AI 模型的结合
              </h2>
            </div>

            <div className="mt-[var(--zs-space-12)] grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {processSteps.map((step, index) => {
                const StepIcon = step.Icon;
                return (
                  <div key={step.title} className="border-t border-[var(--zs-line)] pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[var(--zs-radius-icon)] bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]">
                        <StepIcon className="h-5 w-5" />
                      </div>
                      <span className="font-serif text-3xl font-bold text-[var(--zs-line)]">
                        0{index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{step.title}</h3>
                    <p className="mt-3 text-sm leading-[var(--zs-text-body-line)] text-[var(--zs-sub)]">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>

            <p className="mt-[var(--zs-space-12)] max-w-[900px] border-l-2 border-[var(--zs-gold)] pl-5 text-[var(--zs-text-lead-size)] leading-[var(--zs-text-lead-line)] text-[var(--zs-ink-strong)]">
              泽思AI 的价值，不在于“用了 AI”，而在于把专业咨询能力变成了一套可复制运行的业务系统。
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[var(--zs-content-max)] px-6 py-[var(--zs-space-20)] md:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-[var(--zs-text-eyebrow-size)] font-bold tracking-[var(--zs-text-eyebrow-spacing)] text-[var(--zs-gold-ink)]">
                CASES
              </p>
              <h2 className="mt-3 text-[var(--zs-text-h2-size)] font-[var(--zs-text-h2-weight)] leading-[var(--zs-text-h2-line)]">
                成功客户案例
              </h2>
            </div>
            <p className="max-w-md text-[var(--zs-text-body-sm-size)] leading-[var(--zs-text-body-sm-line)] text-[var(--zs-sub)]">
              覆盖增长、战略、融资和组织管理场景，帮助团队把复杂问题变成可执行的下一步。
            </p>
          </div>

          <div className="mt-[var(--zs-space-10)] grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {caseCards.map((item) => {
              const CaseIcon = item.Icon;
              return (
                <Card key={item.title} className="h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <span className="rounded-[var(--zs-radius-pill)] bg-[var(--zs-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--zs-primary)]">
                        {item.industry}
                      </span>
                      <CaseIcon className="h-5 w-5 text-[var(--zs-gold)]" />
                    </div>
                    <h3 className="mt-5 text-xl font-bold">{item.title}</h3>
                    <div className="mt-5 space-y-4 text-sm leading-[var(--zs-text-body-line)]">
                      <div>
                        <p className="font-bold text-[var(--zs-ink)]">使用场景</p>
                        <p className="mt-1 text-[var(--zs-sub)]">{item.problem}</p>
                      </div>
                      <div className="border-t border-[var(--zs-line)] pt-4">
                        <p className="font-bold text-[var(--zs-ink)]">关键结果</p>
                        <p className="mt-1 text-[var(--zs-sub)]">{item.result}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[var(--zs-content-max)] px-6 pb-[var(--zs-space-20)] md:px-10">
          <div className="rounded-[var(--zs-radius-panel)] border border-[var(--zs-dark-panel-border)] bg-[image:var(--zs-dark-panel)] p-[var(--zs-space-8)] text-[var(--zs-dark-panel-foreground)] shadow-[var(--zs-shadow-report)] md:flex md:items-center md:justify-between md:gap-8">
            <div>
              <p className="text-[var(--zs-text-eyebrow-size)] font-bold tracking-[var(--zs-text-eyebrow-spacing)] text-[var(--zs-gold)]">
                EXPERT CONSULTING
              </p>
              <h2 className="mt-3 text-2xl font-bold">需要深入支持？联系我们的专家顾问。</h2>
              <p className="mt-3 max-w-2xl text-sm leading-[var(--zs-text-body-line)] text-[var(--zs-dark-panel-muted)]">
                当 AI 诊断之外还需要战略共创、专项访谈或高层工作坊，可以预约人工专家进一步支持。
              </p>
            </div>
            <Button
              variant="gold"
              size="lg"
              className="mt-6 md:mt-0"
              onClick={() => setExpertDialogOpen(true)}
            >
              <Icons.MessageCircle className="h-4 w-4" />
              了解人工咨询
            </Button>
          </div>
        </section>
      </main>

      <Footer />

      <ExpertConsultationDialog
        open={expertDialogOpen}
        onOpenChange={setExpertDialogOpen}
      />
    </div>
  );
}
