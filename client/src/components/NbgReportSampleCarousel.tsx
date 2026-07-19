import { ArrowLeft, ArrowRight, TrendingUp } from "lucide-react";

export const NBG_REPORT_SAMPLE_SLIDE_COUNT = 5;

const GOLD = "#C9A24B";
const dimensions = [
  { label: "市场机会", score: 8.4 },
  { label: "竞争格局", score: 7.8 },
  { label: "商业模式", score: 7.2 },
  { label: "内部能力", score: 7.6 },
  { label: "财务健康", score: 6.5 },
];

const slideLabels = ["报告封面", "诊断总览", "三大关键发现", "五维评分", "增长突破方向"];

function polarPoint(radius: number, angle: number) {
  const radians = (Math.PI / 180) * angle;
  return {
    x: Number((120 + radius * Math.cos(radians)).toFixed(2)),
    y: Number((112 + radius * Math.sin(radians)).toFixed(2)),
  };
}

function polygonPoints(radius: number) {
  return dimensions
    .map((_, index) => {
      const point = polarPoint(radius, -90 + index * 72);
      return `${point.x},${point.y}`;
    })
    .join(" ");
}

function ReportCardChrome({
  activeIndex,
  onChange,
  children,
}: {
  activeIndex: number;
  onChange: (index: number) => void;
  children: React.ReactNode;
}) {
  const goTo = (index: number) => {
    onChange((index + NBG_REPORT_SAMPLE_SLIDE_COUNT) % NBG_REPORT_SAMPLE_SLIDE_COUNT);
  };

  return (
    <div className="relative mx-auto w-full max-w-[340px] pb-8 pt-1">
      <p className="mb-3 text-center text-[11px] font-semibold tracking-[.03em] text-[var(--zs-weak)]">
        某制造业公司 · 诊断报告节选
      </p>
      <div className="absolute bottom-[24px] left-[12px] right-[-8px] h-[34px] rounded-b-[20px] border border-[rgba(201,162,75,.18)] bg-[#08130f] shadow-[0_24px_34px_-18px_rgba(8,19,15,.72)]" />
      <div
        className="absolute bottom-[37px] right-[-16px] top-[42px] w-[34px] rounded-[0_18px_18px_0] border border-[rgba(201,162,75,.18)] bg-[#08130f] shadow-[14px_18px_28px_-18px_rgba(8,19,15,.8)]"
        style={{ clipPath: "polygon(0 0, calc(100% - 14px) 0, 100% 14px, 100% 100%, 0 100%)" }}
      />
      <div
        className="relative h-[410px] overflow-hidden rounded-[18px] border border-[rgba(201,162,75,.38)] bg-[radial-gradient(circle_at_32%_18%,rgba(201,162,75,.16),transparent_34%),linear-gradient(160deg,#17261F_0%,#0E1914_100%)] p-[18px] text-[#EEF2ED] shadow-[0_24px_42px_-24px_rgba(8,19,15,.78)]"
        style={{ clipPath: "polygon(0 0, calc(100% - 22px) 0, 100% 22px, 100% 100%, 0 100%)" }}
      >
        <div className="pointer-events-none absolute inset-[7px] rounded-[14px] border border-[rgba(201,162,75,.16)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-7 w-7 bg-[linear-gradient(135deg,rgba(201,162,75,.22),rgba(201,162,75,.04)_55%,transparent_56%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="text-[14px] font-extrabold tracking-[.02em] text-[var(--zs-gold)]">
              NBG 增长诊断报告
            </div>
            <div className="mt-1 text-[9.5px] tracking-[.08em] text-[#8FA096]">
              {slideLabels[activeIndex]}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="上一张"
              onClick={() => goTo(activeIndex - 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(201,162,75,.34)] bg-white/[.03] text-[var(--zs-gold)] transition hover:bg-[rgba(201,162,75,.12)]"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => goTo(activeIndex + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(201,162,75,.34)] bg-white/[.03] text-[var(--zs-gold)] transition hover:bg-[rgba(201,162,75,.12)]"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="relative mt-3 h-[318px]">{children}</div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2">
        {slideLabels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => goTo(index)}
            className={`h-1.5 rounded-full transition-all ${
              activeIndex === index ? "w-5 bg-[var(--zs-gold)]" : "w-1.5 bg-[#C8CEC6]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function CoverSlide() {
  return (
    <div className="relative flex h-[281px] flex-col overflow-hidden rounded-[12px] border border-[rgba(201,162,75,.18)] bg-[radial-gradient(circle_at_50%_44%,rgba(201,162,75,.15),transparent_38%)] px-6 py-5 text-center">
      <div className="absolute left-1/2 top-5 h-px w-24 -translate-x-1/2 bg-gradient-to-r from-transparent via-[var(--zs-gold)] to-transparent" />
      <p className="mt-3 text-[10px] font-semibold tracking-[.32em] text-[#91A097]">五维增长解码</p>
      <h2 className="mt-2 text-[24px] font-bold leading-[1.35] tracking-[.04em] text-[#F4F0E4]">
        NBG 增长诊断报告
      </h2>
      <p className="mt-2 text-[12px] tracking-[.16em] text-[#AEBBB2]">某制造业公司</p>
      <div className="mx-auto mt-3 w-full max-w-[220px] border-y border-[rgba(201,162,75,.24)] py-2.5">
        <p className="text-[10px] tracking-[.16em] text-[#829188]">综合健康度</p>
        <p className="mt-1.5 text-[26px] font-bold text-[#F2E8CC]">健康度 7.5</p>
        <span className="mt-1.5 inline-flex rounded-full border border-[rgba(201,162,75,.42)] bg-[rgba(201,162,75,.1)] px-4 py-0.5 text-[11px] font-bold text-[var(--zs-gold)]">
          良好
        </span>
      </div>
      <p className="absolute bottom-2.5 left-0 right-0 text-[10.5px] font-semibold tracking-[.08em] text-[var(--zs-gold)]">翻看完整报告 →</p>
    </div>
  );
}

function RadarSlide() {
  const dataPoints = dimensions
    .map((dimension, index) => polarPoint(65 * (dimension.score / 10), -90 + index * 72))
    .map(point => `${point.x},${point.y}`)
    .join(" ");

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-end justify-between border-b border-white/[.08] pb-3">
        <div>
          <p className="text-[10px] tracking-[.12em] text-[#829188]">综合健康度</p>
          <p className="mt-1 text-[21px] font-bold text-[#F2E8CC]">7.5分 · 良好</p>
        </div>
        <div className="rounded-full border border-[rgba(201,162,75,.35)] bg-[rgba(201,162,75,.1)] px-3 py-1 text-[9.5px] font-semibold text-[var(--zs-gold)]">
          结构总体健康
        </div>
      </div>
      <svg viewBox="0 0 240 210" className="mx-auto mt-1 h-[210px] w-full max-w-[270px]">
        {[65, 48, 31].map(radius => (
          <polygon key={radius} points={polygonPoints(radius)} fill="none" stroke="rgba(201,162,75,.17)" />
        ))}
        {dimensions.map((_, index) => {
          const point = polarPoint(65, -90 + index * 72);
          return <line key={index} x1="120" y1="112" x2={point.x} y2={point.y} stroke="rgba(201,162,75,.13)" />;
        })}
        <polygon points={dataPoints} fill="rgba(201,162,75,.24)" stroke={GOLD} strokeWidth="2.5" />
        {dimensions.map((dimension, index) => {
          const point = polarPoint(65 * (dimension.score / 10), -90 + index * 72);
          return <circle key={dimension.label} cx={point.x} cy={point.y} r="3" fill={GOLD} />;
        })}
        <g fill="#D6DED8" fontSize="10.5" fontWeight="700" fontFamily="Noto Sans SC, Inter, sans-serif">
          <text x="120" y="20" textAnchor="middle">市场机会</text>
          <text x="196" y="74" textAnchor="middle">竞争格局</text>
          <text x="173" y="193" textAnchor="middle">商业模式</text>
          <text x="67" y="193" textAnchor="middle">内部能力</text>
          <text x="43" y="74" textAnchor="middle" fill={GOLD}>财务健康</text>
        </g>
      </svg>
      <p className="mt-auto text-center text-[10.5px] leading-5 text-[#9DAA9F]">
        五个维度系统体检，一眼看清强项与短板
      </p>
    </div>
  );
}

function FindingCard({
  title,
  detail,
  highlight,
  children,
}: {
  title: string;
  detail: string;
  highlight?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid grid-cols-[76px_1fr] items-center gap-3 rounded-[12px] border p-3 ${
      highlight
        ? "border-[rgba(201,162,75,.72)] bg-[rgba(201,162,75,.1)] shadow-[0_0_24px_rgba(201,162,75,.08)]"
        : "border-white/[.08] bg-white/[.035]"
    }`}>
      {children}
      <div>
        <p className="text-[13px] font-bold text-[#F4F0E4]">{title}</p>
        <p className="mt-1 text-[10.5px] leading-4 text-[#91A097]">{detail}</p>
      </div>
    </div>
  );
}

function FindingsSlide() {
  return (
    <div className="flex h-full flex-col">
      <p className="mb-3 text-[11px] leading-5 text-[#AEBBB2]">三项数据同时指向现金流与利润结构风险</p>
      <div className="space-y-2.5">
        <FindingCard title="现金跑道1.6个月" detail="低于安全区间，现金缓冲接近耗尽">
          <div>
            <div className="flex items-end justify-between text-[9px] text-[#829188]"><span>0</span><span>安全 6月</span></div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-white/[.1]">
              <div className="h-full w-[27%] rounded-full bg-[var(--zs-gold)]" />
            </div>
            <p className="mt-1 text-right text-[9px] font-bold text-[var(--zs-gold)]">告急</p>
          </div>
        </FindingCard>
        <FindingCard title="法兰线年亏410万" detail="单一亏损线吞噬大量公司净利润" highlight>
          <div className="flex h-12 items-end justify-center gap-2 border-b border-white/[.12]">
            <div className="w-4 bg-[#52665B]" style={{ height: "62%" }} />
            <div className="w-4 bg-[var(--zs-gold)]" style={{ height: "38%" }} />
            <span className="mb-1 text-[9px] font-bold leading-3 text-[var(--zs-gold)]">占净利38%</span>
          </div>
        </FindingCard>
        <FindingCard title="前三大客户65%" detail="客户集中度偏高，议价与回款风险叠加">
          <div className="relative mx-auto h-[58px] w-[58px] rounded-full" style={{ background: `conic-gradient(${GOLD} 0 65%, rgba(255,255,255,.1) 65% 100%)` }}>
            <div className="absolute inset-[7px] flex items-center justify-center rounded-full bg-[#122019] text-[12px] font-bold text-[#F2E8CC]">65%</div>
          </div>
        </FindingCard>
      </div>
    </div>
  );
}

function ScoresSlide() {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-end justify-between">
        <div>
          <p className="text-[11px] text-[#91A097]">五维评分 / 10</p>
          <p className="mt-1 text-[18px] font-bold text-[#F4F0E4]">财务健康是首要短板</p>
        </div>
        <TrendingUp className="h-6 w-6 text-[var(--zs-gold)]" />
      </div>
      <div className="space-y-4">
        {dimensions.map(dimension => (
          <div key={dimension.label}>
            <div className="mb-1.5 flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[#D6DED8]">{dimension.label}</span>
              <span className="font-mono font-bold text-[var(--zs-gold)]">{dimension.score.toFixed(1)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/[.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8F6825] to-[#E8B84B]"
                style={{ width: `${dimension.score * 10}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-auto border-t border-white/[.08] pt-3 text-[10px] leading-5 text-[#829188]">
        分数用于定位结构性短板，具体判断以证据链为准。
      </p>
    </div>
  );
}

function DirectionSlide() {
  return (
    <div className="flex h-full flex-col">
      <div>
        <p className="text-[11px] text-[#91A097]">增长影响 × 执行难度</p>
        <p className="mt-1 text-[18px] font-bold text-[#F4F0E4]">优先释放现金，再重构增长</p>
      </div>
      <div className="relative mt-3 flex-1 pb-6 pl-7">
        <span className="absolute -left-[42px] top-1/2 -translate-y-1/2 -rotate-90 whitespace-nowrap text-[8.5px] tracking-[.04em] text-[#91A097]">增长影响：低 → 高</span>
        <div className="grid h-full grid-cols-2 grid-rows-2 overflow-hidden border border-[rgba(201,162,75,.42)]">
          <div className="relative border-b border-r border-[rgba(201,162,75,.42)] bg-[linear-gradient(145deg,rgba(201,162,75,.22),rgba(201,162,75,.08))] p-2">
            <span className="text-[8px] font-bold tracking-[.06em] text-[var(--zs-gold)]">高影响 · 易执行</span>
            <div className="mt-2 space-y-1.5">
              <div className="rounded border border-[rgba(201,162,75,.65)] bg-[#342E18] px-2 py-1.5 text-[9px] font-semibold leading-3 text-[#F2E8CC]">压缩账期释放现金</div>
              <div className="rounded border border-[rgba(201,162,75,.48)] bg-[#25291F] px-2 py-1.5 text-[9px] font-semibold leading-3 text-[#D9D6C5]">砍掉亏损法兰线</div>
            </div>
          </div>
          <div className="border-b border-[rgba(201,162,75,.42)] p-2">
            <span className="text-[8px] tracking-[.06em] text-[#829188]">高影响 · 难执行</span>
            <div className="mt-4 rounded border border-white/[.14] bg-white/[.04] px-2 py-2 text-[9px] font-semibold leading-3 text-[#C5CEC8]">降低客户集中度</div>
          </div>
          <div className="border-r border-[rgba(201,162,75,.42)] p-2">
            <span className="text-[8px] tracking-[.06em] text-[#66776D]">低影响 · 易执行</span>
          </div>
          <div className="p-2">
            <span className="text-[8px] tracking-[.06em] text-[#66776D]">低影响 · 难执行</span>
            <div className="mt-4 rounded border border-white/[.1] bg-white/[.025] px-2 py-2 text-[9px] font-semibold leading-3 text-[#91A097]">开拓新兴市场</div>
          </div>
        </div>
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8.5px] tracking-[.04em] text-[#91A097]">执行难度：易 → 难</span>
      </div>
    </div>
  );
}

export function NbgReportSampleCarousel({
  activeIndex,
  onChange,
}: {
  activeIndex: number;
  onChange: (index: number) => void;
}) {
  return (
    <ReportCardChrome activeIndex={activeIndex} onChange={onChange}>
      {activeIndex === 0 ? <CoverSlide /> : null}
      {activeIndex === 1 ? <RadarSlide /> : null}
      {activeIndex === 2 ? <FindingsSlide /> : null}
      {activeIndex === 3 ? <ScoresSlide /> : null}
      {activeIndex === 4 ? <DirectionSlide /> : null}
    </ReportCardChrome>
  );
}
