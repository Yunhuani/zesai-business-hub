import { ArrowLeft, ArrowRight } from "lucide-react";

export const NBG_REPORT_SAMPLE_SLIDE_COUNT = 4;

const dimensions = [
  { label: "客户结构", score: 72, radius: 0.72 },
  { label: "产品力", score: 84, radius: 0.84 },
  { label: "渠道效率", score: 48, radius: 0.48 },
  { label: "定价毛利", score: 38, radius: 0.38 },
  { label: "组织执行", score: 64, radius: 0.64 },
];

const slideLabels = ["五维健康度", "关键卡点", "行动路径", "核心结论"];

function polarPoint(radius: number, angle: number) {
  const radians = (Math.PI / 180) * angle;
  return {
    x: Number((120 + radius * Math.cos(radians)).toFixed(2)),
    y: Number((120 + radius * Math.sin(radians)).toFixed(2)),
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
    <div className="relative mx-auto w-full max-w-[360px] pb-7">
      <div
        className="absolute bottom-[22px] right-[-13px] top-[16px] w-[52px] rounded-[0_18px_18px_0] border border-[rgba(201,162,75,.18)] bg-[#08130f] shadow-[16px_20px_32px_-20px_rgba(8,19,15,.8)]"
        style={{ clipPath: "polygon(0 0, calc(100% - 18px) 0, 100% 18px, 100% 100%, 0 100%)" }}
      />
      <div
        className="relative overflow-hidden rounded-[18px] border border-[rgba(201,162,75,.38)] bg-[radial-gradient(circle_at_32%_18%,rgba(201,162,75,.16),transparent_34%),linear-gradient(160deg,#17261F_0%,#0E1914_100%)] p-[22px] text-[#EEF2ED] shadow-[0_28px_46px_-24px_rgba(8,19,15,.78)]"
        style={{ clipPath: "polygon(0 0, calc(100% - 24px) 0, 100% 24px, 100% 100%, 0 100%)" }}
      >
        <div className="pointer-events-none absolute inset-[8px] rounded-[14px] border border-[rgba(201,162,75,.16)]" />
        <div className="pointer-events-none absolute right-0 top-0 h-8 w-8 bg-[linear-gradient(135deg,rgba(201,162,75,.22),rgba(201,162,75,.04)_55%,transparent_56%)]" />

        <div className="relative flex items-start justify-between gap-4">
          <div>
            <div className="text-[15px] font-extrabold tracking-[.02em] text-[var(--zs-gold)]">
              NBG 增长诊断报告
            </div>
            <div className="mt-1 text-[10px] tracking-[.06em] text-[#8FA096]">
              {slideLabels[activeIndex]} · 示例
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              aria-label="上一张"
              onClick={() => goTo(activeIndex - 1)}
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[rgba(201,162,75,.34)] bg-white/[.03] text-[var(--zs-gold)] transition hover:bg-[rgba(201,162,75,.12)]"
            >
              <ArrowLeft className="h-3 w-3" />
            </button>
            <button
              type="button"
              aria-label="下一张"
              onClick={() => goTo(activeIndex + 1)}
              className="flex h-[22px] w-[22px] items-center justify-center rounded-full border border-[rgba(201,162,75,.34)] bg-white/[.03] text-[var(--zs-gold)] transition hover:bg-[rgba(201,162,75,.12)]"
            >
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        <div className="relative mt-5">{children}</div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-1.5">
        {slideLabels.map((label, index) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            onClick={() => goTo(index)}
            className={`h-[5px] rounded-full transition-all ${
              activeIndex === index ? "w-4 bg-[var(--zs-gold)]" : "w-[5px] bg-[#C8CEC6]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function RadarSlide() {
  const dataPoints = dimensions
    .map((dimension, index) => polarPoint(70 * dimension.radius, -90 + index * 72))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <div className="min-h-[246px]">
      <svg viewBox="0 0 240 230" className="mx-auto h-[220px] w-full max-w-[286px]">
        <defs>
          <radialGradient id="nbg-radar-glow" cx="50%" cy="47%" r="58%">
            <stop offset="0%" stopColor="rgba(201,162,75,.18)" />
            <stop offset="100%" stopColor="rgba(201,162,75,0)" />
          </radialGradient>
        </defs>
        <circle cx="120" cy="115" r="92" fill="url(#nbg-radar-glow)" />
        {[70, 52, 34].map((radius) => (
          <polygon
            key={radius}
            points={polygonPoints(radius)}
            fill="none"
            stroke="rgba(201,162,75,.18)"
            strokeWidth="1"
            transform="translate(0 -5)"
          />
        ))}
        {dimensions.map((_, index) => {
          const point = polarPoint(70, -90 + index * 72);
          return (
            <line
              key={index}
              x1="120"
              y1="115"
              x2={point.x}
              y2={point.y - 5}
              stroke="rgba(201,162,75,.14)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={dataPoints}
          fill="rgba(201,162,75,.24)"
          stroke="var(--zs-gold)"
          strokeWidth="3"
          strokeLinejoin="round"
          transform="translate(0 -5)"
        />
        {dimensions.map((dimension, index) => {
          const point = polarPoint(70 * dimension.radius, -90 + index * 72);
          return (
            <circle key={dimension.label} cx={point.x} cy={point.y - 5} r="3.6" fill="var(--zs-gold)" />
          );
        })}
        <g fill="#C9D2CB" fontSize="11.5" fontWeight="700" fontFamily="Noto Sans SC, Inter, sans-serif">
          <text x="120" y="25" textAnchor="middle">
            客户结构
          </text>
          <text x="199" y="82" textAnchor="middle">
            产品力
          </text>
          <text x="177" y="194" textAnchor="middle">
            渠道效率
          </text>
          <text x="63" y="194" textAnchor="middle" fill="#C9A24B">
            定价毛利
          </text>
          <text x="41" y="82" textAnchor="middle">
            组织执行
          </text>
        </g>
      </svg>
      <p className="mt-1 text-center text-[11.5px] leading-[1.7] text-[#9DAA9F]">
        五个维度系统体检，一眼看清强项与短板
      </p>
    </div>
  );
}

function IssueSlide() {
  return (
    <div className="min-h-[246px] space-y-3 pt-2">
      {[
        ["定价毛利承压", "价格体系与价值交付不匹配，利润被持续稀释。"],
        ["渠道效率偏低", "动作很多，但缺少统一转化指标和复盘机制。"],
        ["客户结构失衡", "复购不足，新客获取成本持续抬升。"],
      ].map(([title, desc]) => (
        <div key={title} className="rounded-[12px] border border-[rgba(201,162,75,.22)] bg-white/[.04] p-3.5">
          <div className="text-[13.5px] font-bold text-[#F4F0E4]">{title}</div>
          <div className="mt-1.5 text-[11.5px] leading-[1.6] text-[#AEBBB2]">{desc}</div>
        </div>
      ))}
    </div>
  );
}

function PathSlide() {
  return (
    <div className="min-h-[246px] pt-4">
      {[
        ["重构定价分层", "优先止住利润流失，明确付费锚点。"],
        ["聚焦核心单品", "压缩低效 SKU，集中可复制增长模型。"],
        ["建立周度复盘", "持续跟踪渠道效率、毛利与执行质量。"],
      ].map(([title, desc], index) => (
        <div key={title} className="flex items-start gap-3">
          <div className="flex shrink-0 flex-col items-center">
            <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--zs-gold)] bg-[rgba(201,162,75,.16)] text-[11px] font-bold text-[var(--zs-gold)]">
              {index + 1}
            </div>
            {index < 2 && <div className="min-h-[31px] w-px flex-1 bg-[rgba(201,162,75,.28)]" />}
          </div>
          <div className="pb-5">
            <div className="text-[13.5px] font-bold text-[#F4F0E4]">{title}</div>
            <div className="mt-1 text-[11.5px] leading-[1.55] text-[#AEBBB2]">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConclusionSlide() {
  return (
    <div className="flex min-h-[246px] flex-col justify-center gap-3">
      {[
        "定价毛利是当前最优先处理的增长短板。",
        "渠道效率问题需要用统一指标和复盘机制拆解。",
        "先聚焦核心产品模型，再扩张渠道和组织动作。",
      ].map((item) => (
        <div key={item} className="flex items-start gap-2.5 rounded-[12px] bg-white/[.04] px-3.5 py-3">
          <span className="mt-px text-[11px] text-[var(--zs-gold)]">◆</span>
          <span className="text-[12.5px] leading-[1.65] text-[#E7EDE8]">{item}</span>
        </div>
      ))}
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
      {activeIndex === 0 ? <RadarSlide /> : null}
      {activeIndex === 1 ? <IssueSlide /> : null}
      {activeIndex === 2 ? <PathSlide /> : null}
      {activeIndex === 3 ? <ConclusionSlide /> : null}
    </ReportCardChrome>
  );
}
