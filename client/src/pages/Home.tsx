import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { ExpertConsultationDialog } from "@/components/ExpertConsultationDialog";
import { WeChatBrowserGuide } from "@/components/WeChatBrowserGuide";
import { isWeChatBrowser } from "@/utils/wechatDetector";
import { trackConversion, ConversionEvents, trackAgent, AgentEvents } from "@/lib/analytics";
import { APP_LOGO, getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";

const navLinks = [
  { href: "/", label: "首页" },
  { href: "/pricing", label: "价格套餐" },
  { href: "/about", label: "关于我们" },
  { href: "/support", label: "联系客服" },
];

const placeholderQuestions = [
  "公司业绩上不去怎么办？",
  "三个合伙人股权怎么分？",
  "创业怎么写商业计划书？",
  "怎么做好团队管理？",
  "KPI/OKR 怎么定？",
];

const skillCards = [
  {
    title: "要融资，但没有像样的计划书",
    agentName: "融资商业计划书",
    tag: "融资材料",
    Icon: Icons.FileText,
  },
  {
    title: "合伙人股权怎么分才合理",
    agentName: "股权架构师",
    tag: "股权设计",
    Icon: Icons.Network,
  },
  {
    title: "看不清竞争对手怎么办",
    agentName: "竞品分析专家",
    tag: "竞争分析",
    Icon: Icons.Search,
  },
  {
    title: "团队目标定不下来",
    agentName: "OKR目标管理教练",
    tag: "组织管理",
    Icon: Icons.ListChecks,
  },
];

const toolboxItems = ["商业计划书", "增长诊断", "股权方案", "OKR 拆解"];

const processSteps = [
  { title: "结构化访谈", Icon: Icons.MessagesSquare },
  { title: "框架与咨询方法论", Icon: Icons.LayoutTemplate },
  { title: "独家 AI Skill + Agent", Icon: Icons.Bot },
  { title: "交付解决方案", Icon: Icons.PackageCheck },
];

const caseCards = [
  {
    industry: "消费品牌",
    scene: "区域饮品品牌，增长停滞。",
    problem: "盲目扩 SKU 与门店，利润反降。",
    method: "NBG 诊断厘清五维，聚焦核心单品与渠道。",
    result: "砍掉低效 SKU，单店模型转正，营收回升。",
    Icon: Icons.CupSoda,
  },
  {
    industry: "制造企业",
    scene: "以代工为主，想转自有品牌。",
    problem: "战略取舍混乱，资源分散。",
    method: "用诊断收敛战略路径，明确取舍。",
    result: "确立两年品牌化路线，毛利结构改善。",
    Icon: Icons.Factory,
  },
  {
    industry: "科技服务",
    scene: "SaaS 团队，获客成本高企。",
    problem: "增长靠烧钱，留存与转化不足。",
    method: "诊断定位到产品价值与定价错配。",
    result: "重设定价与激活，回收周期缩短。",
    Icon: Icons.CloudCog,
  },
  {
    industry: "本地服务",
    scene: "连锁服务门店，扩张乏力。",
    problem: "复制开店但坪效持续走低。",
    method: "诊断锁定标准化与选址模型问题。",
    result: "跑通可复制单店，坪效回正。",
    Icon: Icons.Store,
  },
];

const footerColumns = [
  {
    title: "产品",
    links: [
      { href: "/diagnosis", label: "NBG 增长诊断" },
      { href: "/", label: "方法论" },
      { href: "/", label: "即将上线" },
    ],
  },
  {
    title: "资源",
    links: [
      { href: "/pricing", label: "AI经营工具箱" },
      { href: "/", label: "行业洞察" },
      { href: "/", label: "客户案例" },
    ],
  },
  {
    title: "公司",
    links: [
      { href: "/about", label: "关于我们" },
      { href: "/about", label: "加入我们" },
      { href: "/support", label: "联系我们" },
    ],
  },
];

function HomeNavbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--zs-line)] bg-[rgba(250,250,248,.86)] backdrop-blur-[12px] backdrop-saturate-150">
      <div className="mx-auto flex h-[72px] max-w-[var(--zs-content-max)] items-center justify-between px-6 md:px-10">
        <Link href="/" className="flex items-center gap-3">
          <img
            src={APP_LOGO}
            alt="泽思AI"
            className="h-[42px] w-[42px] rounded-[var(--zs-radius-icon)] object-contain"
          />
          <span className="font-serif text-xl font-bold text-[var(--zs-primary)]">
            泽思AI
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[14.5px] font-medium text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={getLoginUrl()}
            className="hidden text-[14.5px] font-medium text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)] sm:inline-flex"
          >
            登录
          </a>
          <Button asChild size="sm">
            <a href={getLoginUrl()}>注册</a>
          </Button>
        </div>
      </div>
    </header>
  );
}

function HomeFooter() {
  return (
    <footer className="border-t border-[var(--zs-line)] bg-[var(--zs-bg)]">
      <div className="mx-auto flex max-w-[var(--zs-content-max)] flex-col gap-10 px-6 py-[60px] pb-[42px] md:flex-row md:justify-between md:px-10">
        <div className="max-w-sm">
          <div className="flex items-center gap-3">
            <img
              src={APP_LOGO}
              alt="泽思AI"
              className="h-12 w-12 rounded-[var(--zs-radius-icon)] object-contain"
            />
            <span className="font-serif text-xl font-bold text-[var(--zs-primary)]">
              泽思AI
            </span>
          </div>
          <p className="mt-4 text-[15px] leading-[var(--zs-text-body-line)] text-[var(--zs-sub)]">
            泽思AI，您身边的顶级商业咨询顾问。
          </p>
        </div>

        <div className="grid gap-8 sm:grid-cols-3 md:gap-[72px]">
          {footerColumns.map((column) => (
            <div key={column.title}>
              <h2 className="text-[13px] font-bold text-[var(--zs-ink)]">
                {column.title}
              </h2>
              <div className="mt-4 flex flex-col gap-3">
                {column.links.map((link) => (
                  <Link
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    className="text-[13.5px] text-[var(--zs-sub)] transition-colors hover:text-[var(--zs-ink)]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-[var(--zs-line)]">
        <div className="mx-auto max-w-[var(--zs-content-max)] px-6 py-5 text-[12.5px] text-[var(--zs-weak)] md:px-10">
          © 2026 泽思AI · 沪ICP备2024051234号-1
        </div>
      </div>
    </footer>
  );
}

function ReportSampleCarousel({
  activeIndex,
  setActiveIndex,
}: {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
}) {
  const slides = [
    {
      key: "radar",
      content: (
        <div className="grid gap-5 md:grid-cols-[.9fr_1.1fr]">
          <div className="relative mx-auto aspect-square w-full max-w-[210px]">
            <svg viewBox="0 0 220 220" className="h-full w-full">
              {[88, 66, 44].map((radius) => (
                <polygon
                  key={radius}
                  points={radarPoints(radius)}
                  fill="none"
                  stroke="rgba(201,162,75,.22)"
                  strokeWidth="1"
                />
              ))}
              {[0, 1, 2, 3, 4].map((item) => {
                const angle = -90 + item * 72;
                const point = polarPoint(88, angle);
                return (
                  <line
                    key={item}
                    x1="110"
                    y1="110"
                    x2={point.x}
                    y2={point.y}
                    stroke="rgba(201,162,75,.18)"
                    strokeWidth="1"
                  />
                );
              })}
              <polygon
                points={[
                  polarPoint(76, -90),
                  polarPoint(54, -18),
                  polarPoint(68, 54),
                  polarPoint(47, 126),
                  polarPoint(82, 198),
                ]
                  .map((point) => `${point.x},${point.y}`)
                  .join(" ")}
                fill="rgba(201,162,75,.18)"
                stroke="var(--zs-gold)"
                strokeWidth="3"
              />
            </svg>
          </div>
          <div className="space-y-3">
            {["战略聚焦", "获客效率", "转化质量", "复购潜力", "组织执行"].map((label, index) => (
              <div key={label} className="flex items-center justify-between rounded-[var(--zs-radius-badge)] border border-[rgba(201,162,75,.2)] px-3 py-2 text-sm">
                <span className="text-[var(--zs-dark-panel-muted)]">{label}</span>
                <span className="font-bold text-[var(--zs-gold)]">{[86, 61, 74, 52, 79][index]}</span>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      key: "bottlenecks",
      content: (
        <div className="space-y-4">
          {[
            ["关键卡点 01", "核心单品不清晰，资源被低效 SKU 分散。"],
            ["关键卡点 02", "渠道动作多，但没有统一的转化指标。"],
            ["关键卡点 03", "复购依赖活动刺激，会员经营链路薄弱。"],
          ].map(([title, text]) => (
            <div key={title} className="rounded-[var(--zs-radius-card)] border border-[rgba(201,162,75,.24)] bg-[rgba(255,255,255,.04)] p-4">
              <p className="text-sm font-bold text-[var(--zs-gold)]">{title}</p>
              <p className="mt-2 text-sm leading-[var(--zs-text-body-line)] text-[var(--zs-dark-panel-muted)]">{text}</p>
            </div>
          ))}
        </div>
      ),
    },
    {
      key: "path",
      content: (
        <div className="space-y-5">
          {["收敛核心问题", "确定优先级", "拆解行动路径", "建立复盘指标"].map((title, index) => (
            <div key={title} className="flex gap-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--zs-gold)] text-sm font-bold text-[var(--zs-gold-ink)]">
                {index + 1}
              </div>
              <div className="border-b border-[rgba(201,162,75,.18)] pb-4">
                <p className="font-bold text-[var(--zs-dark-panel-foreground)]">{title}</p>
                <p className="mt-1 text-sm text-[var(--zs-dark-panel-muted)]">
                  将诊断结论转化为下一次经营会议可以执行的动作。
                </p>
              </div>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="rounded-[var(--zs-radius-report)] border border-[var(--zs-dark-panel-border)] bg-[rgba(255,255,255,.04)] p-5 shadow-[var(--zs-shadow-report)]">
      <div className="flex items-center justify-between border-b border-[rgba(201,162,75,.28)] pb-4">
        <h4 className="text-xl font-bold">增长诊断报告</h4>
        <Icons.Activity className="h-8 w-8 text-[var(--zs-gold)]" />
      </div>
      <div className="mt-6 min-h-[270px]">{slides[activeIndex].content}</div>
      <div className="mt-6 flex justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            aria-label={`查看样张 ${index + 1}`}
            onClick={() => setActiveIndex(index)}
            className={`h-2.5 rounded-full transition-all ${
              activeIndex === index
                ? "w-8 bg-[var(--zs-gold)]"
                : "w-2.5 bg-[rgba(255,255,255,.22)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

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
      setReportSlideIndex((current) => (current + 1) % 3);
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
      <HomeNavbar />

      <main>
        <section className="border-b border-[var(--zs-line)] bg-[linear-gradient(180deg,rgba(238,242,237,.75)_0%,rgba(250,250,248,0)_72%)]">
          <div className="mx-auto max-w-[var(--zs-content-max)] px-6 pb-[var(--zs-space-20)] pt-[var(--zs-space-16)] text-center md:px-10">
            {isInWeChatBrowser && <WeChatBrowserGuide />}

            <h1 className="text-[var(--zs-text-display-size)] font-[var(--zs-text-display-weight)] leading-[var(--zs-text-display-line)] text-[var(--zs-ink)]">
              您的 AI 商业顾问
            </h1>
            <p className="mx-auto mt-[var(--zs-space-6)] max-w-[760px] text-[var(--zs-text-lead-size)] leading-[var(--zs-text-lead-line)] text-[var(--zs-sub)]">
              将全球顶级咨询公司的方法论，与前沿 AI 大模型相结合。提供麦肯锡级别的经营解决方案。
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
                <div className="relative min-w-0 flex-1">
                  {!heroQuery && (
                    <span
                      className={`pointer-events-none absolute inset-y-0 left-0 flex items-center text-base text-[var(--zs-weak)] transition-opacity duration-200 ${
                        placeholderVisible ? "opacity-100" : "opacity-0"
                      }`}
                    >
                      {placeholderQuestions[placeholderIndex]}
                    </span>
                  )}
                  <input
                    value={heroQuery}
                    onChange={(event) => setHeroQuery(event.target.value)}
                    className="relative z-10 min-w-0 flex-1 bg-transparent text-base text-[var(--zs-ink)] outline-none"
                    aria-label="您可以问我"
                  />
                </div>
              </div>
              <Button
                type="submit"
                size="lg"
                className="w-full shrink-0 md:w-auto"
                disabled={agentsLoading || !smartAssistantId}
              >
                开始 →
              </Button>
            </form>
          </div>
        </section>

        <section id="services" className="mx-auto max-w-[var(--zs-content-max)] px-6 py-[var(--zs-space-20)] md:px-10">
          <div className="mx-auto max-w-[760px] text-center">
            <h2 className="text-[var(--zs-text-h2-size)] font-[var(--zs-text-h2-weight)] leading-[var(--zs-text-h2-line)]">
              您现在面临什么问题？
            </h2>
            <p className="mt-4 text-[var(--zs-text-body-size)] leading-[var(--zs-text-body-line)] text-[var(--zs-sub)]">
              从业务的现状出发，匹配对应的 AI 顾问，不再被工具入口分心。
            </p>
          </div>

          <Card variant="feature" className="mt-[var(--zs-space-12)] overflow-hidden p-0">
            <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.05fr_.95fr]">
              <div className="p-[var(--zs-space-8)] md:p-[var(--zs-space-12)]">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-[var(--zs-radius-pill)] bg-[var(--zs-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--zs-primary)]">
                    引流主打 · 完整可用
                  </span>
                </div>
                <h3 className="mt-[var(--zs-space-6)] text-[var(--zs-text-h3-size)] font-[var(--zs-text-h3-weight)] leading-[var(--zs-text-h3-line)]">
                  增长卡住了，找不到突破口
                </h3>
                <p className="mt-4 max-w-xl text-[var(--zs-text-body-size)] leading-[var(--zs-text-body-line)] text-[var(--zs-sub)]">
                  通过 NBG 增长诊断，给企业做一次全面体检，五个维度系统排查，找出真正限制增长的那一环——而不是表面症状。
                </p>
                <div className="mt-[var(--zs-space-8)] flex flex-col gap-3 sm:flex-row">
                  <Button asChild size="lg">
                    <Link href="/diagnosis">
                      开始诊断 →
                    </Link>
                  </Button>
                  <Button variant="outlineGold" size="lg" asChild>
                    <Link href="/pricing">查看会员权益</Link>
                  </Button>
                </div>
              </div>

              <div className="border-t border-[var(--zs-line)] bg-[image:var(--zs-dark-panel)] p-[var(--zs-space-8)] text-[var(--zs-dark-panel-foreground)] lg:border-l lg:border-t-0">
                <ReportSampleCarousel
                  activeIndex={reportSlideIndex}
                  setActiveIndex={setReportSlideIndex}
                />
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
                    <h3 className="mt-5 flex-1 text-xl font-bold leading-tight">{skill.title}</h3>
                    <div className="mt-5 flex items-center justify-between border-t border-[var(--zs-line)] pt-4 text-sm font-semibold">
                      <span className="text-[var(--zs-gold-ink)]">{skill.tag}</span>
                      <span className="flex items-center gap-1 text-[var(--zs-primary)]">
                        开始 →
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
              <h3 className="text-2xl font-bold">AI 经营工具箱</h3>
              <p className="mt-3 text-sm leading-[var(--zs-text-body-line)] text-[var(--zs-dark-panel-muted)]">
                每一个工具，都对应一个真实经营动作。
              </p>
              <div className="mt-5 rounded-[var(--zs-radius-pill)] border border-[rgba(201,162,75,.34)] px-3 py-1 text-sm text-[var(--zs-dark-panel-muted)]">
                {toolboxItems.join(" · ")}
              </div>
            </div>
            <Button variant="gold" size="lg" className="mt-6 md:mt-0" asChild>
              <Link href="/pricing">
                进入工具箱 →
              </Link>
            </Button>
          </div>
        </section>

        <section className="border-y border-[var(--zs-line)] bg-[var(--zs-card)]">
          <div className="mx-auto max-w-[var(--zs-content-max)] px-6 py-[var(--zs-space-20)] md:px-10">
            <div className="max-w-[760px]">
              <h2 className="text-[var(--zs-text-h2-size)] font-[var(--zs-text-h2-weight)] leading-[var(--zs-text-h2-line)]">
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
                  </div>
                );
              })}
            </div>

            <p className="mt-[var(--zs-space-12)] max-w-[900px] border-l-2 border-[var(--zs-gold)] pl-5 text-[var(--zs-text-lead-size)] leading-[var(--zs-text-lead-line)] text-[var(--zs-ink-strong)]">
              泽思AI 的价值，不在于"用了 AI"，而在于把专业咨询能力变成了一套可复制运行的业务系统。
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-[var(--zs-content-max)] px-6 py-[var(--zs-space-20)] md:px-10">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-[var(--zs-text-h2-size)] font-[var(--zs-text-h2-weight)] leading-[var(--zs-text-h2-line)]">
                成功客户案例
              </h2>
            </div>
            <p className="max-w-md text-[var(--zs-text-body-sm-size)] leading-[var(--zs-text-body-sm-line)] text-[var(--zs-sub)]">
              面向各行各业，不限领域——制造、消费、科技、服务皆有落地。
            </p>
          </div>

          <div className="mt-[var(--zs-space-10)] grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {caseCards.map((item) => {
              const CaseIcon = item.Icon;
              return (
                <Card key={item.industry} className="h-full">
                  <CardContent className="flex h-full flex-col p-6">
                    <div className="flex items-center justify-between">
                      <span className="rounded-[var(--zs-radius-pill)] bg-[var(--zs-primary-soft)] px-3 py-1 text-xs font-bold text-[var(--zs-primary)]">
                        {item.industry}
                      </span>
                      <CaseIcon className="h-5 w-5 text-[var(--zs-gold)]" />
                    </div>
                    <div className="mt-5 space-y-4 text-sm leading-[var(--zs-text-body-line)]">
                      <div>
                        <p className="font-bold text-[var(--zs-ink)]">场景</p>
                        <p className="mt-1 text-[var(--zs-sub)]">{item.scene}</p>
                      </div>
                      <div className="border-t border-[var(--zs-line)] pt-4">
                        <p className="font-bold text-[var(--zs-ink)]">问题</p>
                        <p className="mt-1 text-[var(--zs-sub)]">{item.problem}</p>
                      </div>
                      <div className="border-t border-[var(--zs-line)] pt-4">
                        <p className="font-bold text-[var(--zs-ink)]">我们的方法</p>
                        <p className="mt-1 text-[var(--zs-sub)]">{item.method}</p>
                      </div>
                      <div className="border-t border-[var(--zs-line)] pt-4">
                        <p className="font-bold text-[var(--zs-ink)]">关键结果</p>
                        <p className="mt-1 font-bold text-[var(--zs-gold-ink)]">{item.result}</p>
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
            <h2 className="text-2xl font-bold">需要深入支持？联系我们的专家顾问。</h2>
            <Button
              variant="gold"
              size="lg"
              className="mt-6 md:mt-0"
              onClick={() => setExpertDialogOpen(true)}
            >
              了解人工咨询 →
            </Button>
          </div>
        </section>
      </main>

      <HomeFooter />

      <ExpertConsultationDialog
        open={expertDialogOpen}
        onOpenChange={setExpertDialogOpen}
      />
    </div>
  );
}
