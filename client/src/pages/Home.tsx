import { type FormEvent, useEffect, useMemo, useState } from "react";
import { AppFooter, AppHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ExpertConsultationDialog } from "@/components/ExpertConsultationDialog";
import { WeChatBrowserGuide } from "@/components/WeChatBrowserGuide";
import { trackAgent, AgentEvents, trackConversion, ConversionEvents } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { isWeChatBrowser } from "@/utils/wechatDetector";
import {
  Bot,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  ClipboardList,
  Factory,
  FileText,
  Goal,
  Landmark,
  ListChecks,
  MessageCircle,
  Network,
  Search,
  Store,
  Users,
} from "lucide-react";
import { Link, useLocation } from "wouter";

const placeholderQuestions = [
  "公司业绩上不去怎办？",
  "三个合伙人怎么分配股权？",
  "创业怎么写商业计划书？",
  "怎么做好团队管理？",
];

const serviceCards = [
  {
    problem: "要融资，但没有像样的计划书",
    service: "商业计划书",
    meta: "约 20 分钟 · 输出投资人视角的结构化 BP",
    agentName: "融资商业计划书",
    Icon: FileText,
  },
  {
    problem: "合伙人股权怎么分才合理",
    service: "股权架构设计",
    meta: "约 15 分钟 · 输出股权结构与机制建议",
    agentName: "股权架构师",
    Icon: Network,
  },
  {
    problem: "看不清竞争对手怎么打",
    service: "竞争分析",
    meta: "约 15 分钟 · 输出竞争格局与打法建议",
    agentName: "竞品分析专家",
    Icon: ChartNoAxesCombined,
  },
  {
    problem: "团队目标定不下来",
    service: "OKR 制定",
    meta: "约 10 分钟 · 输出对齐可衡量的目标体系",
    agentName: "OKR目标管理教练",
    Icon: Goal,
  },
];

const processSteps = [
  {
    no: "01",
    title: "结构化访谈",
    desc: "像资深商业顾问一样提问，精准获取企业经营中的真实问题与关键信息。",
  },
  {
    no: "02",
    title: "框架与咨询方法论",
    desc: "融合经典咨询框架与原创商业方法论，对商业问题进行拆解。",
  },
  {
    no: "03",
    title: "独家 AI Skill + Agent",
    desc: "运用泽思AI 处理数据信息，分析每一个经营决策的场景。",
  },
  {
    no: "04",
    title: "交付解决方案",
    desc: "输出清晰、专业、可执行的商业分析报告与行动建议。",
  },
];

const caseCards = [
  {
    industry: "消费品牌",
    scene: "区域饮品品牌，增长停滞。",
    problem: "盲目扩 SKU 与门店，利润反降。",
    method: "NBG 诊断厘清五维，聚焦核心单品与渠道。",
    resultPrefix: "砍掉低效 SKU，",
    resultGold: "单店模型转正",
    resultSuffix: "，营收回升。",
    Icon: BriefcaseBusiness,
  },
  {
    industry: "制造企业",
    scene: "以代工为主，想转自有品牌。",
    problem: "战略取舍混乱，资源分散。",
    method: "用诊断收敛战略路径，明确取舍。",
    resultPrefix: "确立",
    resultGold: "两年品牌化路线",
    resultSuffix: "，毛利结构改善。",
    Icon: Factory,
  },
  {
    industry: "科技服务",
    scene: "SaaS 团队，获客成本高企。",
    problem: "增长靠烧钱，留存与转化不足。",
    method: "诊断定位到产品价值与定价错配。",
    resultPrefix: "重设定价与激活，",
    resultGold: "回收周期缩短",
    resultSuffix: "。",
    Icon: Building2,
  },
  {
    industry: "本地服务",
    scene: "连锁服务门店，扩张乏力。",
    problem: "复制开店但坪效持续走低。",
    method: "诊断锁定标准化与选址模型问题。",
    resultPrefix: "跑通可复制单店，",
    resultGold: "坪效回正",
    resultSuffix: "。",
    Icon: Store,
  },
];

function polarPoint(radius: number, angle: number) {
  const radians = (Math.PI / 180) * angle;
  return {
    x: Number((110 + radius * Math.cos(radians)).toFixed(2)),
    y: Number((110 + radius * Math.sin(radians)).toFixed(2)),
  };
}

function radarPoints(radius: number) {
  return [0, 1, 2, 3, 4]
    .map((item) => {
      const point = polarPoint(radius, -90 + item * 72);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function ReportSampleCarousel({
  activeIndex,
  onChange,
}: {
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  const labels = ["五维健康度", "关键卡点", "行动路径", "核心结论"];

  return (
    <div className="rounded-[18px] border border-[rgba(201,162,75,.42)] bg-[linear-gradient(165deg,#1B2C24_0%,#121D18_100%)] p-[22px] text-[#EEF2ED] shadow-[0_36px_72px_-28px_rgba(15,25,20,.78)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[15px] font-extrabold tracking-[.02em] text-[var(--zs-gold)]">
            NBG 增长诊断报告
          </div>
          <div className="mt-1 text-[9.5px] tracking-[.06em] text-[#7e9085]">
            {labels[activeIndex]} · 示例
          </div>
        </div>
        <div className="rounded-md border border-[rgba(201,162,75,.35)] px-2 py-1 text-[10px] text-[var(--zs-gold)]">
          SAMPLE
        </div>
      </div>

      <div className="mt-5 min-h-[300px]">
        {activeIndex === 0 && (
          <div className="grid gap-5 md:grid-cols-[220px_1fr]">
            <svg viewBox="0 0 220 220" className="mx-auto h-[220px] w-[220px]">
              {[86, 64, 42].map((radius) => (
                <polygon
                  key={radius}
                  points={radarPoints(radius)}
                  fill="none"
                  stroke="rgba(201,162,75,.24)"
                  strokeWidth="1"
                />
              ))}
              {[0, 1, 2, 3, 4].map((item) => {
                const point = polarPoint(86, -90 + item * 72);
                return (
                  <line
                    key={item}
                    x1="110"
                    y1="110"
                    x2={point.x}
                    y2={point.y}
                    stroke="rgba(201,162,75,.16)"
                    strokeWidth="1"
                  />
                );
              })}
              <polygon
                points={[
                  polarPoint(78, -90),
                  polarPoint(73, -18),
                  polarPoint(43, 54),
                  polarPoint(32, 126),
                  polarPoint(66, 198),
                ]
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                fill="rgba(201,162,75,.18)"
                stroke="var(--zs-gold)"
                strokeWidth="3"
              />
              <g fill="#9fb0a6" fontSize="11" fontFamily="Inter, sans-serif">
                <text x="110" y="18" textAnchor="middle">
                  战略
                </text>
                <text x="152" y="56" textAnchor="start">
                  产品力
                </text>
                <text x="132" y="150" textAnchor="start">
                  渠道效率
                </text>
                <text x="48" y="150" textAnchor="end" fill="#C9A24B">
                  定价毛利
                </text>
                <text x="28" y="56" textAnchor="end">
                  组织执行
                </text>
              </g>
            </svg>
            <div className="space-y-3 self-center">
              {[
                ["战略", "78", "78%"],
                ["产品力", "85", "85%"],
                ["渠道效率", "50", "50%"],
                ["定价毛利", "38", "38%"],
                ["组织执行", "75", "75%"],
              ].map(([name, score, width]) => (
                <div key={name} className="flex items-center gap-2.5">
                  <span
                    className={`w-[54px] shrink-0 text-[11px] ${
                      name === "定价毛利" ? "font-bold text-[var(--zs-gold)]" : "text-[#cdd5cf]"
                    }`}
                  >
                    {name}
                  </span>
                  <div className="h-[7px] flex-1 overflow-hidden rounded bg-white/10">
                    <div
                      className={`h-full rounded ${name === "定价毛利" ? "bg-[var(--zs-gold)]" : "bg-[#3f6b54]"}`}
                      style={{ width }}
                    />
                  </div>
                  <span
                    className={`w-[18px] text-right text-[10px] ${
                      name === "定价毛利" ? "font-bold text-[var(--zs-gold)]" : "text-[#9fb0a6]"
                    }`}
                  >
                    {score}
                  </span>
                </div>
              ))}
              <div className="mt-3 flex items-start gap-2 rounded-[9px] border border-[rgba(201,162,75,.28)] bg-[rgba(201,162,75,.1)] px-[13px] py-[11px]">
                <span className="shrink-0 text-[11px] font-bold text-[var(--zs-gold)]">卡点</span>
                <span className="text-[11.5px] leading-[1.55] text-[#dfe5e0]">
                  定价毛利得分最低，是当前最该优先处理的瓶颈。
                </span>
              </div>
            </div>
          </div>
        )}

        {activeIndex === 1 && (
          <div className="space-y-[13px]">
            {[
              ["定价与价值交付错配", "核心利润被持续稀释，客户感知价值不足。"],
              ["老客户流失", "交付体验不稳定，复购不是获客能单独解决的问题。"],
              ["渠道效率偏低", "动作很多，但缺少统一转化指标和复盘机制。"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-[12px] border border-[rgba(201,162,75,.24)] bg-white/[.04] p-4">
                <div className="text-[13.5px] font-bold text-[#eef2ed]">{title}</div>
                <div className="mt-2 text-[12px] leading-[1.65] text-[#9fb0a6]">{desc}</div>
              </div>
            ))}
          </div>
        )}

        {activeIndex === 2 && (
          <div className="space-y-0">
            {[
              ["重构定价分层", "止住利润流失，优先级最高。"],
              ["定义核心单品", "压缩低效 SKU，把资源集中到可复制模型。"],
              ["建立复盘指标", "每周跟踪渠道效率、毛利与复购。"],
            ].map(([title, desc], index) => (
              <div key={title} className="flex items-start gap-[13px]">
                <div className="flex shrink-0 flex-col items-center">
                  <div className="flex h-[25px] w-[25px] items-center justify-center rounded-full border border-[var(--zs-gold)] bg-[rgba(201,162,75,.16)] text-xs font-bold text-[var(--zs-gold)]">
                    {index + 1}
                  </div>
                  {index < 2 && <div className="min-h-[26px] w-px flex-1 bg-[rgba(201,162,75,.3)]" />}
                </div>
                <div className="pb-[18px]">
                  <div className="text-[13.5px] font-bold text-[#eef2ed]">{title}</div>
                  <div className="mt-[3px] text-[11px] leading-[1.5] text-[#9fb0a6]">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeIndex === 3 && (
          <div className="flex flex-col gap-[13px] pt-6">
            {[
              "定价与价值交付错配，是拖累利润的首要短板。",
              "老客户流失源于交付体验，而非获客不足。",
              "优先重构定价分层，预计毛利提升 6–8 点。",
            ].map((item) => (
              <div key={item} className="flex items-start gap-[9px]">
                <span className="mt-px text-[11px] text-[var(--zs-gold)]">▸</span>
                <span className="text-[12.5px] leading-[1.6] text-[#dfe5e0]">{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex justify-center gap-2">
        {labels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => onChange(index)}
            className={`h-1.5 rounded-full transition-all ${
              activeIndex === index ? "w-[18px] bg-[var(--zs-gold)]" : "w-1.5 bg-[#cfd3cb]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  const [isInWeChatBrowser] = useState(isWeChatBrowser());
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholderVisible, setPlaceholderVisible] = useState(true);
  const [reportSlideIndex, setReportSlideIndex] = useState(0);
  const [, setLocation] = useLocation();
  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery();

  const agentByName = useMemo(() => {
    return new Map((agents ?? []).map((agent) => [agent.name, agent]));
  }, [agents]);

  const smartAssistantId = agentByName.get("智能AI助手")?.id ?? 0;

  useEffect(() => {
    trackConversion(ConversionEvents.HOME_VISIT);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPlaceholderVisible(false);
      window.setTimeout(() => {
        setPlaceholderIndex((current) => (current + 1) % placeholderQuestions.length);
        setPlaceholderVisible(true);
      }, 200);
    }, 2500);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setReportSlideIndex((current) => (current + 1) % 4);
    }, 3500);

    return () => window.clearInterval(interval);
  }, []);

  const handleHeroSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!smartAssistantId) return;

    const query = heroQuery.trim() || placeholderQuestions[placeholderIndex];
    setLocation(`/agent/${smartAssistantId}?initial=${encodeURIComponent(query)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />

      <main>
        <section className="mx-auto max-w-[1200px] px-6 py-[88px] pb-[96px] text-center md:px-10">
          {isInWeChatBrowser && <WeChatBrowserGuide />}

          <h1 className="m-0 text-[48px] font-black leading-[1.14] tracking-[.01em] text-[var(--zs-ink)] md:text-[62px]">
            您的 AI 商业顾问
          </h1>
          <p className="mx-auto mt-[26px] max-w-[740px] text-[19px] font-normal leading-[1.85] text-[var(--zs-sub)]">
            将全球顶级咨询公司的方法论，与前沿AI大模型相结合。提供麦肯锡级别的经营解决方案。
          </p>

          <form
            onSubmit={handleHeroSubmit}
            className="mx-auto mt-10 flex max-w-[920px] flex-col gap-3 rounded-[20px] border border-[var(--zs-line)] bg-[var(--zs-card)] p-3 text-left shadow-[0_30px_66px_-32px_rgba(31,61,50,.36)] md:flex-row md:items-center"
          >
            <div className="flex h-[60px] flex-1 items-center gap-3 px-3 md:px-5">
              <MessageCircle className="h-5 w-5 shrink-0 text-[var(--zs-gold)]" strokeWidth={1.7} />
              <span className="hidden shrink-0 text-[15px] font-semibold text-[var(--zs-ink)] sm:inline">
                您可以问我：
              </span>
              <div className="relative min-w-0 flex-1">
                {!heroQuery && (
                  <span
                    className={`pointer-events-none absolute inset-y-0 left-0 flex items-center text-[16px] font-semibold text-[var(--zs-primary)] transition-opacity duration-200 ${
                      placeholderVisible ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {placeholderQuestions[placeholderIndex]}
                  </span>
                )}
                <input
                  value={heroQuery}
                  onChange={(event) => setHeroQuery(event.target.value)}
                  className="relative z-10 h-full w-full bg-transparent text-[16px] text-[var(--zs-ink)] outline-none"
                  aria-label="您可以问我"
                />
              </div>
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-[54px] shrink-0 px-[34px] text-[16px] md:h-[60px]"
              disabled={agentsLoading || !smartAssistantId}
            >
              开始 →
            </Button>
          </form>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 pb-[80px] md:px-10">
          <div className="mb-9 text-center">
            <h2 className="m-0 text-[34px] font-extrabold leading-[1.3]">您现在面临什么问题？</h2>
            <p className="mx-auto mt-4 max-w-[680px] text-[16px] leading-[1.8] text-[var(--zs-sub)]">
              不用先选择工具。先说问题，泽思AI 会把它匹配到对应的咨询能力。
            </p>
          </div>

          <Card className="overflow-hidden rounded-[20px] border-[var(--zs-line)] bg-white shadow-[0_16px_48px_-32px_rgba(31,61,50,.30)]">
            <CardContent className="grid gap-0 p-0 lg:grid-cols-[1fr_440px]">
              <div className="p-7 md:p-10">
                <span className="rounded-md bg-[rgba(201,162,75,.22)] px-[11px] py-[5px] text-[11.5px] font-bold tracking-[.06em] text-[#5a4516]">
                  引流主打 · 完整可用
                </span>
                <h3 className="mt-4 text-[27px] font-extrabold leading-[1.3]">
                  增长卡住了，找不到突破口
                </h3>
                <p className="mt-3 max-w-[520px] text-[16px] leading-[1.75] text-[var(--zs-sub)]">
                  通向 <b className="text-[var(--zs-ink)]">NBG 增长诊断</b>
                  ：给企业做一次全面体检，五个维度系统排查，找出真正限制增长的那一环——而不是表面症状。
                </p>
                <div className="mt-[22px] flex flex-wrap items-center gap-5">
                  <Button asChild className="rounded-[11px] px-[30px] py-[14px] text-[16px]">
                    <Link href="/diagnosis">开始诊断 →</Link>
                  </Button>
                  <Link
                    href="/pricing"
                    className="text-[15px] font-semibold text-[var(--zs-primary)] underline-offset-4 hover:underline"
                  >
                    查看会员权益
                  </Link>
                </div>
              </div>

              <div className="bg-[var(--zs-primary)] p-6 lg:p-7">
                <ReportSampleCarousel activeIndex={reportSlideIndex} onChange={setReportSlideIndex} />
              </div>
            </CardContent>
          </Card>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {serviceCards.map((service) => {
              const agent = agentByName.get(service.agentName);
              const Icon = service.Icon;
              const card = (
                <Card className="h-full rounded-[16px] border-[var(--zs-line)] bg-white transition hover:-translate-y-1 hover:shadow-[0_30px_64px_-42px_rgba(31,61,50,.32)]">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]">
                      <Icon className="h-[22px] w-[22px]" strokeWidth={1.7} />
                    </div>
                    <h3 className="mt-5 text-[18px] font-bold leading-[1.4]">{service.problem}</h3>
                    <p className="mt-3 text-[13.5px] leading-[1.7] text-[var(--zs-sub)]">{service.meta}</p>
                    <div className="mt-auto flex items-center justify-between pt-6">
                      <span className="text-[13px] font-bold text-[var(--zs-gold)]">{service.service}</span>
                      <span className="text-[14px] font-semibold text-[var(--zs-primary)]">开始 →</span>
                    </div>
                  </CardContent>
                </Card>
              );

              return agent ? (
                <Link
                  key={service.problem}
                  href={`/agent/${agent.id}`}
                  onClick={() => trackAgent(AgentEvents.AGENT_CLICK, agent.id, agent.name)}
                  className="block h-full"
                >
                  {card}
                </Link>
              ) : (
                <div key={service.problem} className="h-full">
                  {card}
                </div>
              );
            })}
          </div>

          <Link
            href="/toolbox"
            className="mt-5 flex flex-col gap-6 rounded-[16px] bg-[var(--zs-primary)] p-6 text-[#eef2ed] no-underline md:flex-row md:items-center md:justify-between md:px-8"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[11px] bg-white/10 text-[var(--zs-gold)]">
                <Bot className="h-[22px] w-[22px]" strokeWidth={1.7} />
              </div>
              <div>
                <div className="text-[17px] font-bold text-white">AI 经营工具箱</div>
                <div className="mt-[3px] text-[13.5px] text-[#b9c7bf]">
                  每一个经营难题，都有一位专属 AI 顾问——查看全部 AI 顾问。
                </div>
              </div>
            </div>
            <span className="shrink-0 text-[15px] font-semibold text-[var(--zs-gold)]">进入工具箱 →</span>
          </Link>
        </section>

        <section className="border-y border-[var(--zs-line)] bg-white">
          <div className="mx-auto max-w-[1200px] px-6 py-20 md:px-10">
            <div className="mb-12 text-center">
              <h2 className="m-0 text-[30px] font-bold">每一步，都是顶级咨询方法论与 AI 模型的结合</h2>
              <p className="mx-auto mt-4 max-w-[680px] text-[16px] leading-[1.8] text-[var(--zs-sub)]">
                泽思AI 不是一个普通 AI 问答工具，而是一套咨询顾问式工作流程：先诊断问题，再用咨询方法论分析，最后交付可落地的解决方案。
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-4 xl:gap-0">
              {processSteps.map((step, index) => (
                <div
                  key={step.no}
                  className={`xl:px-[30px] ${index < processSteps.length - 1 ? "xl:border-r xl:border-[var(--zs-line)]" : ""}`}
                >
                  <div className="font-['Inter'] text-[14px] font-bold text-[var(--zs-gold)]">{step.no}</div>
                  <div className="mt-[14px] text-[18px] font-bold leading-[1.4]">{step.title}</div>
                  <div className="mt-2.5 text-[14px] leading-[1.75] text-[var(--zs-sub)]">{step.desc}</div>
                </div>
              ))}
            </div>

            <div className="mt-[52px] border-t border-[var(--zs-line)] pt-9 text-center">
              <p className="mx-auto max-w-[760px] text-[16.5px] font-medium leading-[1.8] text-[var(--zs-ink)]">
                泽思AI 的价值，不在于"用了 AI"，而在于把
                <b className="text-[var(--zs-primary)]">专业咨询能力</b>变成了一套
                <b className="text-[var(--zs-primary)]">可持续运行的AI交付系统</b>。
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 py-20 md:px-10">
          <div className="mb-10 text-center">
            <h2 className="m-0 text-[34px] font-extrabold">成功客户案例</h2>
            <p className="mx-auto mt-4 max-w-[640px] text-[16px] leading-[1.8] text-[var(--zs-sub)]">
              面向各行各业，不限领域——制造、消费、科技、服务皆有落地。
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {caseCards.map((item) => {
              const Icon = item.Icon;
              return (
                <Card key={item.industry} className="rounded-[16px] border-[var(--zs-line)] bg-white">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-[var(--zs-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--zs-primary)]">
                        {item.industry}
                      </span>
                      <Icon className="h-5 w-5 text-[var(--zs-gold)]" strokeWidth={1.7} />
                    </div>
                    <div className="mt-5 space-y-4 text-sm leading-[1.75]">
                      <CaseRow label="场景" value={item.scene} />
                      <CaseRow label="问题" value={item.problem} />
                      <CaseRow label="我们的方法" value={item.method} />
                      <div className="border-t border-[var(--zs-line)] pt-4">
                        <p className="font-bold text-[var(--zs-ink)]">关键结果</p>
                        <p className="mt-1 font-semibold text-[var(--zs-sub)]">
                          {item.resultPrefix}
                          <span className="font-bold text-[var(--zs-gold)]">{item.resultGold}</span>
                          {item.resultSuffix}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        <section className="mx-auto max-w-[1200px] px-6 pb-20 md:px-10">
          <div className="relative flex flex-col gap-8 overflow-hidden rounded-[22px] bg-[var(--zs-primary)] p-8 text-[#eef2ed] md:flex-row md:items-center md:justify-between md:p-[60px]">
            <div className="max-w-[680px]">
              <h2 className="m-0 text-[34px] font-extrabold leading-[1.3] text-white">
                需要深入支持？
                <br />
                联系我们的专家顾问。
              </h2>
              <p className="mt-[18px] text-[16px] leading-[1.8] text-[#b9c7bf]">
                <br />
              </p>
            </div>
            <Button
              variant="gold"
              size="lg"
              className="shrink-0"
              onClick={() => setExpertDialogOpen(true)}
            >
              了解人工咨询 →
            </Button>
          </div>
        </section>
      </main>

      <AppFooter />

      <ExpertConsultationDialog open={expertDialogOpen} onOpenChange={setExpertDialogOpen} />
    </div>
  );
}

function CaseRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-t border-[var(--zs-line)] pt-4 first:border-t-0 first:pt-0">
      <p className="font-bold text-[var(--zs-ink)]">{label}</p>
      <p className="mt-1 text-[var(--zs-sub)]">{value}</p>
    </div>
  );
}
