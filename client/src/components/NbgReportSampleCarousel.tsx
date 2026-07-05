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

function RadarSlide() {
  const dataPoints = dimensions
    .map((dimension, index) => polarPoint(88 * dimension.radius, -90 + index * 72))
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <div className="grid min-h-[310px] gap-6 md:grid-cols-[250px_1fr] md:items-center">
      <div className="relative mx-auto h-[250px] w-[250px]">
        <svg viewBox="0 0 240 240" className="h-full w-full">
          <defs>
            <radialGradient id="nbg-radar-glow" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(201,162,75,.2)" />
              <stop offset="100%" stopColor="rgba(201,162,75,0)" />
            </radialGradient>
          </defs>
          <circle cx="120" cy="120" r="104" fill="url(#nbg-radar-glow)" />
          {[88, 66, 44, 22].map((radius) => (
            <polygon
              key={radius}
              points={polygonPoints(radius)}
              fill="none"
              stroke="rgba(201,162,75,.22)"
              strokeWidth="1"
            />
          ))}
          {dimensions.map((_, index) => {
            const point = polarPoint(88, -90 + index * 72);
            return (
              <line
                key={index}
                x1="120"
                y1="120"
                x2={point.x}
                y2={point.y}
                stroke="rgba(201,162,75,.18)"
                strokeWidth="1"
              />
            );
          })}
          <polygon
            points={dataPoints}
            fill="rgba(201,162,75,.22)"
            stroke="var(--zs-gold)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          {dimensions.map((dimension, index) => {
            const point = polarPoint(88 * dimension.radius, -90 + index * 72);
            return (
              <circle key={dimension.label} cx={point.x} cy={point.y} r="4" fill="var(--zs-gold)" />
            );
          })}
          <g fill="#C9D2CB" fontSize="11.5" fontWeight="700" fontFamily="Noto Sans SC, Inter, sans-serif">
            <text x="120" y="15" textAnchor="middle">
              客户结构
            </text>
            <text x="202" y="79" textAnchor="middle">
              产品力
            </text>
            <text x="178" y="213" textAnchor="middle">
              渠道效率
            </text>
            <text x="62" y="213" textAnchor="middle" fill="#C9A24B">
              定价毛利
            </text>
            <text x="38" y="79" textAnchor="middle">
              组织执行
            </text>
          </g>
        </svg>
      </div>

      <div className="space-y-3">
        {dimensions.map((dimension) => (
          <div key={dimension.label} className="flex items-center gap-3">
            <span
              className={`w-[66px] shrink-0 text-[12px] font-bold ${
                dimension.label === "定价毛利" ? "text-[var(--zs-gold)]" : "text-[#DDE5DF]"
              }`}
            >
              {dimension.label}
            </span>
            <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${
                  dimension.label === "定价毛利" ? "bg-[var(--zs-gold)]" : "bg-[#4B8063]"
                }`}
                style={{ width: `${dimension.score}%` }}
              />
            </div>
            <span
              className={`w-7 text-right text-[11px] font-semibold ${
                dimension.label === "定价毛利" ? "text-[var(--zs-gold)]" : "text-[#9FB0A6]"
              }`}
            >
              {dimension.score}
            </span>
          </div>
        ))}
        <div className="mt-4 rounded-[12px] border border-[rgba(201,162,75,.28)] bg-[rgba(201,162,75,.1)] px-4 py-3 text-[12px] leading-[1.7] text-[#E7EDE8]">
          五个维度系统体检，一眼看清强项与短板
        </div>
      </div>
    </div>
  );
}

function IssueSlide() {
  return (
    <div className="min-h-[310px] space-y-[13px] pt-2">
      {[
        ["定价毛利承压", "核心产品利润被持续稀释，价格体系与价值交付不匹配。"],
        ["渠道效率偏低", "动作很多，但缺少统一转化指标和复盘机制。"],
        ["客户结构失衡", "老客户复购不足，新客获取成本持续抬升。"],
      ].map(([title, desc]) => (
        <div key={title} className="rounded-[12px] border border-[rgba(201,162,75,.24)] bg-white/[.04] p-4">
          <div className="text-[14px] font-bold text-[#F4F0E4]">{title}</div>
          <div className="mt-2 text-[12px] leading-[1.65] text-[#AEBBB2]">{desc}</div>
        </div>
      ))}
    </div>
  );
}

function PathSlide() {
  return (
    <div className="min-h-[310px] pt-6">
      {[
        ["重构定价分层", "优先止住利润流失，明确高价值客户的付费锚点。"],
        ["聚焦核心单品", "压缩低效 SKU，把资源集中到可复制增长模型。"],
        ["建立周度复盘", "持续跟踪渠道效率、毛利变化与组织执行质量。"],
      ].map(([title, desc], index) => (
        <div key={title} className="flex items-start gap-[13px]">
          <div className="flex shrink-0 flex-col items-center">
            <div className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-[var(--zs-gold)] bg-[rgba(201,162,75,.16)] text-xs font-bold text-[var(--zs-gold)]">
              {index + 1}
            </div>
            {index < 2 && <div className="min-h-[34px] w-px flex-1 bg-[rgba(201,162,75,.3)]" />}
          </div>
          <div className="pb-[22px]">
            <div className="text-[14px] font-bold text-[#F4F0E4]">{title}</div>
            <div className="mt-1 text-[12px] leading-[1.6] text-[#AEBBB2]">{desc}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ConclusionSlide() {
  return (
    <div className="flex min-h-[310px] flex-col justify-center gap-[13px]">
      {[
        "定价毛利是当前最优先处理的增长短板。",
        "渠道效率问题需要用统一指标和复盘机制拆解。",
        "先聚焦核心产品模型，再扩张渠道和组织动作。",
      ].map((item) => (
        <div key={item} className="flex items-start gap-[10px] rounded-[12px] bg-white/[.04] px-4 py-3">
          <span className="mt-px text-[12px] text-[var(--zs-gold)]">◆</span>
          <span className="text-[13px] leading-[1.7] text-[#E7EDE8]">{item}</span>
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
  const goTo = (index: number) => {
    onChange((index + NBG_REPORT_SAMPLE_SLIDE_COUNT) % NBG_REPORT_SAMPLE_SLIDE_COUNT);
  };

  return (
    <div className="relative overflow-hidden rounded-[18px] border border-[rgba(201,162,75,.42)] bg-[radial-gradient(circle_at_28%_18%,rgba(201,162,75,.18),transparent_30%),linear-gradient(165deg,#17261F_0%,#0D1512_100%)] p-[22px] text-[#EEF2ED] shadow-[0_36px_72px_-28px_rgba(15,25,20,.78)]">
      <div className="pointer-events-none absolute inset-0 border border-white/[.03]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <div className="text-[15px] font-extrabold tracking-[.02em] text-[var(--zs-gold)]">
            NBG 增长诊断报告
          </div>
          <div className="mt-1 text-[10px] tracking-[.06em] text-[#8FA096]">
            {slideLabels[activeIndex]} · 示例
          </div>
        </div>
        <div className="rounded-md border border-[rgba(201,162,75,.35)] px-2 py-1 text-[10px] font-semibold text-[var(--zs-gold)]">
          SAMPLE
        </div>
      </div>

      <div className="relative mt-5">
        {activeIndex === 0 ? <RadarSlide /> : null}
        {activeIndex === 1 ? <IssueSlide /> : null}
        {activeIndex === 2 ? <PathSlide /> : null}
        {activeIndex === 3 ? <ConclusionSlide /> : null}
      </div>

      <div className="relative mt-5 flex items-center justify-between">
        <div className="flex gap-2">
          {slideLabels.map((label, index) => (
            <button
              key={label}
              type="button"
              aria-label={label}
              onClick={() => goTo(index)}
              className={`h-1.5 rounded-full transition-all ${
                activeIndex === index ? "w-[20px] bg-[var(--zs-gold)]" : "w-1.5 bg-[#58665E]"
              }`}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="上一张"
            onClick={() => goTo(activeIndex - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(201,162,75,.28)] bg-white/[.04] text-[var(--zs-gold)] transition hover:bg-[rgba(201,162,75,.12)]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="下一张"
            onClick={() => goTo(activeIndex + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(201,162,75,.28)] bg-white/[.04] text-[var(--zs-gold)] transition hover:bg-[rgba(201,162,75,.12)]"
          >
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
