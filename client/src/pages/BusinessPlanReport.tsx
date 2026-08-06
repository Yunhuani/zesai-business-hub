import { trpc } from "@/lib/trpc";
import { ArrowLeft, CircleAlert, Download, LoaderCircle } from "lucide-react";
import { useEffect, useState, type ReactElement } from "react";
import { Link, useParams } from "wouter";
import {
  buildBusinessPlanReport,
  parseBusinessPlanCoverage,
  parseBusinessPlanNumber,
  type BusinessPlanReportModule,
} from "./businessPlanReportData";

type JsonObject = Record<string, unknown>;
type PageVariant =
  | "full"
  | "solution"
  | "business"
  | "space"
  | "growth"
  | "matrix"
  | "advantages"
  | "roadmap"
  | "financial";
type ModuleRenderer = (props: {
  module: BusinessPlanReportModule;
  variant: PageVariant;
}) => ReactElement;

const PALETTE = ["var(--pri)", "var(--acc)", "var(--acc-l)", "#A9B7A6"];

const BP_REPORT_CSS = `
.bp-report[data-theme="gold"] {
  --pri: #1F3D32;
  --pri-deep: #152A23;
  --pri-mid: #2C5544;
  --acc: #C9A24B;
  --acc-l: #DFC183;
  --acc-p: #F7F1E2;
  --acc-p2: #FBF8F0;
  --bg: #FAFAF8;
  --card: #FFFFFF;
  --ink: #1E2B25;
  --ink2: #586158;
  --ink3: #8E958C;
  --line: #E6E4DA;
  --ok: #4E8C6A;
  --warn: #C2703A;
  background: var(--bg);
  color: var(--ink);
  font-family: "Noto Sans SC", "PingFang SC", "Microsoft YaHei", sans-serif;
}
.bp-report * { box-sizing: border-box; }
.bp-shell { width: min(1120px, calc(100% - 40px)); margin: 0 auto; }
.bp-document { padding: 92px 0 72px; }
.bp-document-page { position: relative; width: min(1120px, calc(100% - 40px)); min-height: 680px; margin: 0 auto 48px; overflow: hidden; border: 1px solid var(--line); border-radius: 18px; background: var(--card); box-shadow: 0 18px 50px rgba(31,61,50,.10); }
.bp-page-content { padding: 58px 64px 72px; }
.bp-page-number { position: absolute; right: 28px; bottom: 22px; color: var(--ink3); font-size: 11px; letter-spacing: .14em; }
.bp-module-label { display: flex; align-items: center; gap: 9px; margin-bottom: 10px; color: var(--ink2); font-size: 12px; }
.bp-module-label::before { content: ""; width: 3px; height: 15px; border-radius: 2px; background: var(--acc); }
.bp-title { color: var(--pri); font-size: clamp(28px, 3vw, 38px); font-weight: 700; line-height: 1.25; letter-spacing: -.02em; }
.bp-divider { height: 1px; margin: 18px 0 28px; background: var(--line); }
.bp-card { border: 1px solid var(--line); border-radius: 10px; background: var(--card); box-shadow: 0 5px 20px rgba(31,61,50,.045); }
.bp-card-title { margin-bottom: 12px; color: var(--pri); font-size: 13px; font-weight: 700; }
.bp-pending { display: inline-flex; margin: 18px 8px 0 0; padding: 5px 10px; border: 1px solid rgba(194,112,58,.2); border-radius: 999px; background: #FFF9F3; color: var(--warn); font-size: 11px; font-style: italic; }
.bp-source { margin-left: 8px; color: var(--ink3); font-size: 10px; font-weight: 400; }
.bp-horizontal-scroll { overflow-x: auto; padding-bottom: 4px; }
.bp-cover, .bp-back-cover { position: relative; display: flex; min-height: 760px; align-items: center; overflow: hidden; border-color: transparent; background: linear-gradient(135deg,var(--pri-deep),var(--pri) 58%,var(--pri-mid)); color: white; }
.bp-cover-grid { position: absolute; inset: 0; opacity: .44; }
.bp-cover-content { position: relative; z-index: 1; padding: 100px 0 72px; }
.bp-cover-mark { display: flex; height: 38px; width: 38px; align-items: center; justify-content: center; border-radius: 8px; background: var(--acc); color: white; font-weight: 700; }
.bp-cover h1 { max-width: 850px; margin-top: 36px; font-size: clamp(42px,7vw,76px); font-weight: 700; line-height: 1.16; letter-spacing: -.035em; }
.bp-cover-slogan { margin-top: 24px; color: rgba(255,255,255,.72); font-size: clamp(16px,2vw,22px); letter-spacing: .12em; }
.bp-cover-date { margin-top: 64px; color: rgba(255,255,255,.48); font-size: 12px; letter-spacing: .1em; }
@media (max-width: 720px) {
  .bp-shell { width: min(100% - 28px, 1120px); }
  .bp-document { padding-top: 72px; }
  .bp-document-page { width: min(100% - 24px, 1120px); min-height: 560px; margin-bottom: 28px; border-radius: 12px; }
  .bp-page-content { padding: 42px 24px 64px; }
  .bp-cover, .bp-back-cover { min-height: 680px; }
}
@media print {
  .bp-report header { display: none; }
  .bp-pdf-hidden { display: none !important; }
  .bp-page-number { display: none !important; }
  .bp-document { padding: 0; }
  .bp-document-page { width: 100%; min-height: 0; margin: 0; border: 0; border-radius: 0; box-shadow: none; break-after: page; }
  .bp-card, .bp-team-card, .bp-pain-card { break-inside: avoid; }
  .bp-horizontal-scroll { overflow: visible; }
}
`;

function asObject(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asText(value: unknown, fallback = "—"): string {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  return fallback;
}

function formatDate(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SourceMark({
  module,
  path,
}: {
  module: BusinessPlanReportModule;
  path: string;
}) {
  const source = module.sources[path];
  if (!source) return null;
  const labels = {
    client_provided: "客户提供",
    engine_rewrite: "内容优化",
    search_validation: "公开资料",
    pending_customer: "待补充",
  } as const;
  return <span className="bp-source">{labels[source]}</span>;
}

function PendingNotes({ module }: { module: BusinessPlanReportModule }) {
  if (module.pendingItems.length === 0) return null;
  return (
    <div>
      {module.pendingItems.map(item => (
        <span key={`${item.moduleId}-${item.fieldName}`} className="bp-pending">
          资料待补充
        </span>
      ))}
    </div>
  );
}

const LOSS_STEPS = ["问题发生", "人工发现", "被动处理", "经营影响"];

function LossChain() {
  return (
    <div className="bp-loss-chain mt-auto border-t border-dashed border-[var(--line)] pt-4">
      <div className="mb-3 text-[11px] font-semibold text-[var(--warn)]">
        损失机制
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start gap-1">
        {LOSS_STEPS.map((step, index) => (
          <div key={step} className="contents">
            <div className="text-center">
              <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-[var(--acc-p)] text-[11px] font-bold text-[var(--pri)]">
                {index + 1}
              </div>
              <div className="mt-2 text-[10px] leading-4 text-[var(--ink2)]">
                {step}
              </div>
            </div>
            {index < LOSS_STEPS.length - 1 ? (
              <svg
                width="14"
                height="32"
                viewBox="0 0 14 32"
                aria-hidden="true"
              >
                <path
                  d="M1 16h10m-3-3 3 3-3 3"
                  fill="none"
                  stroke="var(--ink3)"
                />
              </svg>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DemandModule({ module }: { module: BusinessPlanReportModule }) {
  const pains = asArray(module.fields.pain_points);
  return (
    <>
      <div className="bp-card border-l-4 border-l-[var(--acc)] p-6">
        <h3 className="bp-card-title">
          目标客户
          <SourceMark module={module} path="target_customer" />
        </h3>
        <p className="text-[15px] leading-8 text-[var(--ink2)]">
          {asText(module.fields.target_customer)}
        </p>
      </div>
      <div className="mt-5 grid items-stretch gap-4 md:grid-cols-3">
        {pains.map((rawPain, index) => {
          const pain = asObject(rawPain);
          const painPoint = asText(pain.pain_point);
          const rigidDemand = asText(
            pain.rigid_demand ?? pain.why_rigid_demand
          );
          return (
            <article
              key={index}
              className="bp-pain-card bp-card flex min-h-[310px] flex-col p-5"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--pri)] text-xs font-bold text-white">
                  {index + 1}
                </span>
                <h3 className="text-base font-bold text-[var(--pri)]">
                  {painPoint}
                </h3>
              </div>
              <p className="my-5 text-sm leading-7 text-[var(--ink2)]">
                {rigidDemand}
              </p>
              <LossChain />
            </article>
          );
        })}
      </div>
      <PendingNotes module={module} />
    </>
  );
}

const ARCHITECTURE = [
  { title: "工业设备", items: ["数控机床", "机器人 / 产线", "PLC / 传感器"] },
  { title: "边缘网关", items: ["多协议采集", "边缘计算", "安全传输"] },
  { title: "云端平台", items: ["设备管理", "数据分析", "智能预警"] },
  { title: "业务模块", items: ["实时监控", "故障管理", "产能优化"] },
];

function ProductArchitecture() {
  return (
    <div className="bp-product-architecture bp-horizontal-scroll">
      <div className="grid min-w-[820px] grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-stretch gap-3">
        {ARCHITECTURE.map((column, index) => (
          <div key={column.title} className="contents">
            <div className="flex flex-col">
              <div className="rounded-t-md bg-[var(--pri)] px-3 py-2 text-center text-xs font-bold text-white">
                {column.title}
              </div>
              <div className="bp-card flex flex-1 flex-col gap-2 rounded-t-none p-3">
                {column.items.map(item => (
                  <div
                    key={item}
                    className="rounded-md border border-[var(--line)] bg-[var(--acc-p2)] px-3 py-2 text-xs text-[var(--ink2)]"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
            {index < ARCHITECTURE.length - 1 ? (
              <svg width="24" viewBox="0 0 24 120" aria-hidden="true">
                <path
                  d="M3 60h16m-5-5 5 5-5 5"
                  fill="none"
                  stroke="var(--acc)"
                  strokeWidth="2"
                />
              </svg>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductModule({
  module,
  variant,
}: {
  module: BusinessPlanReportModule;
  variant: PageVariant;
}) {
  const solutions = asArray(module.fields.solution).map(asObject);
  const values = asArray(module.fields.core_value);
  const model = asObject(module.fields.business_model);
  const revenue = asArray(model.revenue_sources).map(asObject);
  if (variant === "solution") {
    return (
      <>
        <ProductArchitecture />
        <div className="mt-5">
          <h3 className="bp-card-title">痛点到解法的转化</h3>
          <div className="bp-conversion-pair grid gap-3 md:grid-cols-3">
            {solutions.map((item, index) => (
              <div key={index} className="bp-card p-4">
                <div className="text-xs text-[var(--ink3)]">
                  {asText(item.pain_point)}
                </div>
                <div className="my-2 font-bold text-[var(--acc)]">▶</div>
                <div className="text-sm font-semibold leading-6 text-[var(--pri)]">
                  {asText(item.solution)}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {values.map((value, index) => (
              <div
                key={index}
                className="rounded-lg bg-[var(--acc-p)] p-4 text-sm leading-6 text-[var(--pri)]"
              >
                {asText(value)}
              </div>
            ))}
          </div>
        </div>
      </>
    );
  }
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="rounded-xl bg-[var(--pri)] p-6 text-white">
          <h3 className="text-sm text-white/65">收入构成</h3>
          <div className="mt-5 space-y-4">
            {revenue.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between text-sm">
                  <span>{asText(item.source)}</span>
                  <span>{asText(item.share)}</span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[var(--acc)]"
                    style={{ width: asText(item.share, "0%") }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
            <div>
              <span className="text-xs text-white/55">毛利率</span>
              <strong className="mt-1 block text-2xl">
                {asText(model.gross_margin)}
              </strong>
            </div>
            <div>
              <span className="text-xs text-white/55">净利率</span>
              <strong className="mt-1 block text-2xl">
                {asText(model.net_margin)}
              </strong>
            </div>
          </div>
        </div>
        <div className="bp-card p-6">
          <h3 className="bp-card-title">销售模式</h3>
          <p className="text-sm leading-8 text-[var(--ink2)]">
            {asText(module.fields.sales_model)}
          </p>
        </div>
      </div>
      <PendingNotes module={module} />
    </>
  );
}

function MarketModule({
  module,
  variant,
}: {
  module: BusinessPlanReportModule;
  variant: PageVariant;
}) {
  const size = asObject(module.fields.market_size);
  const trend = asArray(module.fields.growth_forecast).map(asObject);
  const max = Math.max(
    1,
    ...trend.map(item => parseBusinessPlanNumber(item.market_size))
  );
  return (
    <>
      <div>
        {variant === "space" ? (
          <div className="bp-market-funnel bp-card p-5">
            <h3 className="bp-card-title">市场空间层级</h3>
            <div className="space-y-3">
              {[
                ["TAM", "总体市场", size.tam, "0px", "var(--pri)"],
                ["SAM", "可服务市场", size.sam, "28px", "var(--pri-mid)"],
                ["SOM", "可获得市场", size.som, "56px", "var(--acc)"],
              ].map(([label, name, value, margin, color]) => (
                <div
                  key={String(label)}
                  className="flex"
                  style={{ marginLeft: String(margin) }}
                >
                  <div
                    className="flex w-24 shrink-0 flex-col justify-center rounded-l-md px-4 py-4 text-white"
                    style={{ background: String(color) }}
                  >
                    <b>{String(label)}</b>
                    <span className="mt-1 text-[10px] opacity-75">
                      {String(name)}
                    </span>
                  </div>
                  <div className="flex min-w-0 flex-1 items-center justify-between rounded-r-md border border-l-0 border-[var(--line)] bg-[var(--acc-p2)] px-5">
                    <span className="text-xs text-[var(--ink2)]">市场规模</span>
                    <strong className="text-xl text-[var(--pri)]">
                      {asText(value)}
                    </strong>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bp-growth-chart bp-card p-5">
            <h3 className="bp-card-title">五年增长趋势</h3>
            <svg
              viewBox="0 0 520 300"
              className="w-full"
              role="img"
              aria-label="市场增长柱状图"
            >
              <line x1="35" y1="255" x2="505" y2="255" stroke="var(--line)" />
              {trend.map((item, index) => {
                const height =
                  (175 * parseBusinessPlanNumber(item.market_size)) / max;
                const x = 55 + index * (420 / Math.max(1, trend.length));
                return (
                  <g key={index}>
                    <rect
                      x={x}
                      y={255 - height}
                      width="48"
                      height={height}
                      rx="5"
                      fill={
                        index === trend.length - 1
                          ? "var(--acc)"
                          : "var(--pri-mid)"
                      }
                    />
                    <text
                      x={x + 24}
                      y="278"
                      textAnchor="middle"
                      fill="var(--ink2)"
                      fontSize="11"
                    >
                      {asText(item.year)}
                    </text>
                    <g transform={`translate(${x + 4} ${225 - height})`}>
                      <rect
                        width="40"
                        height="20"
                        rx="10"
                        fill="var(--acc-p)"
                      />
                      <text
                        x="20"
                        y="14"
                        textAnchor="middle"
                        fill="var(--pri)"
                        fontSize="9"
                        fontWeight="700"
                      >
                        {asText(item.growth_rate, "")}
                      </text>
                    </g>
                  </g>
                );
              })}
            </svg>
          </div>
        )}
      </div>
      {variant === "growth" ? (
        <p className="mt-5 rounded-lg bg-[var(--acc-p)] p-5 text-sm leading-7 text-[var(--ink2)]">
          {asText(module.fields.market_narrative)}
        </p>
      ) : null}
      <PendingNotes module={module} />
    </>
  );
}

function scoreFromText(value: unknown): number {
  const text = asText(value, "");
  if (!text) return 0;
  const positive = (text.match(/高|强|快|短|低成本|成熟|标准|灵活|领先/g) ?? [])
    .length;
  const negative = (text.match(/弱|慢|长|高成本|复杂|不足|依赖/g) ?? []).length;
  return Math.max(1, Math.min(5, 3 + positive - negative));
}

function ScoreDots({
  value,
  highlighted,
}: {
  value: unknown;
  highlighted: boolean;
}) {
  const score = scoreFromText(value);
  return (
    <div
      className="bp-score-dots flex justify-center gap-1"
      title={asText(value)}
    >
      {[1, 2, 3, 4, 5].map(dot => (
        <span
          key={dot}
          className="h-2 w-2 rounded-full"
          style={{
            background:
              dot <= score
                ? highlighted
                  ? "var(--pri)"
                  : "var(--acc)"
                : "var(--line)",
          }}
        />
      ))}
    </div>
  );
}

function CompetitionModule({
  module,
  variant,
}: {
  module: BusinessPlanReportModule;
  variant: PageVariant;
}) {
  const competitors = asArray(module.fields.competitors).map(asObject);
  const dimensions = Array.from(
    new Set(competitors.flatMap(item => Object.keys(asObject(item.dimensions))))
  );
  return (
    <>
      {variant === "matrix" ? (
        <div className="bp-horizontal-scroll bp-card">
          <table className="w-full min-w-[780px] border-collapse text-center text-xs">
            <thead className="bg-[var(--pri)] text-white">
              <tr>
                <th className="p-4 text-left">竞争对象</th>
                {dimensions.map(item => (
                  <th key={item} className="p-4">
                    {item}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitors.map((competitor, index) => {
                const cells = asObject(competitor.dimensions);
                return (
                  <tr key={index} className="border-t border-[var(--line)]">
                    <th className="p-4 text-left font-bold text-[var(--pri)]">
                      {asText(competitor.name)}
                    </th>
                    {dimensions.map(dimension => (
                      <td key={dimension} className="p-4">
                        <ScoreDots
                          value={cells[dimension]}
                          highlighted={false}
                        />
                        <div className="mt-2 text-[10px] leading-4 text-[var(--ink3)]">
                          {asText(cells[dimension])}
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })}
              <tr className="border-t border-[var(--line)] bg-[var(--acc-p)]">
                <th className="p-4 text-left font-bold text-[var(--pri)]">
                  本项目
                </th>
                {dimensions.map(dimension => (
                  <td key={dimension} className="p-4">
                    <div className="bp-score-dots flex justify-center gap-1">
                      {[1, 2, 3, 4, 5].map(dot => (
                        <span
                          key={dot}
                          className="h-2 w-2 rounded-full bg-[var(--pri)]"
                        />
                      ))}
                    </div>
                    <div className="mt-2 text-[10px] font-bold text-[var(--acc)]">
                      重点适配
                    </div>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-3">
          {asArray(module.fields.differentiation).map((item, index) => (
            <div
              key={index}
              className="rounded-lg border-l-4 border-l-[var(--acc)] bg-white p-4 text-sm leading-6 text-[var(--pri)] shadow-sm"
            >
              {asText(item)}
            </div>
          ))}
        </div>
      )}
      {variant === "advantages" ? <PendingNotes module={module} /> : null}
    </>
  );
}

function CurrentStateModule({ module }: { module: BusinessPlanReportModule }) {
  const nestedTraction = asObject(module.fields.traction);
  const traction = hasObjectValues(nestedTraction)
    ? nestedTraction
    : module.fields;
  const financials = asObject(traction.financials);
  const metrics = [
    ["客户数量", traction.customer_count],
    ["联网设备", traction.device_count],
    ["团队规模", traction.team_size],
    ...Object.entries(financials),
  ];
  const coverage = parseBusinessPlanCoverage(traction.coverage);
  const regions = coverage.regions;
  const arr = Object.entries(financials).find(
    ([key]) => key.toUpperCase() === "ARR"
  )?.[1];
  const growth = Object.entries(financials).find(([key]) =>
    key.includes("增长")
  )?.[1];
  return (
    <>
      <p className="rounded-lg border-l-4 border-l-[var(--acc)] bg-[var(--acc-p2)] p-5 text-sm leading-7 text-[var(--ink2)]">
        {asText(traction.product_status)}
      </p>
      <div className="mt-5 grid grid-cols-2 gap-4 md:grid-cols-4">
        {metrics.map(([label, value]) => (
          <div key={String(label)} className="bp-card p-5">
            <span className="text-xs text-[var(--ink3)]">{String(label)}</span>
            <strong className="mt-2 block text-2xl text-[var(--pri)]">
              {asText(value)}
            </strong>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
        <div className="bp-arr-area bp-card p-5">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="bp-card-title">ARR 增长</h3>
              <strong className="text-3xl text-[var(--pri)]">
                {asText(arr)}
              </strong>
            </div>
            <span className="rounded-full bg-[var(--acc-p)] px-3 py-1 text-xs font-bold text-[var(--pri)]">
              {asText(growth)}
            </span>
          </div>
          <svg
            viewBox="0 0 560 190"
            className="mt-4 w-full"
            role="img"
            aria-label="ARR增长曲线"
          >
            <defs>
              <linearGradient id="arrGoldArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="var(--acc)" stopOpacity=".38" />
                <stop offset="1" stopColor="var(--acc)" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M20 160 C100 150 110 135 180 128 S280 100 340 88 S440 52 540 28 L540 175 L20 175 Z"
              fill="url(#arrGoldArea)"
            />
            <path
              d="M20 160 C100 150 110 135 180 128 S280 100 340 88 S440 52 540 28"
              fill="none"
              stroke="var(--acc)"
              strokeWidth="4"
            />
            <circle cx="540" cy="28" r="6" fill="var(--pri)" />
          </svg>
        </div>
        <div className="bp-region-bar bp-card p-5">
          <h3 className="bp-card-title">区域覆盖</h3>
          {regions.length > 0 ? (
            <>
              <div className="mt-6 flex h-5 overflow-hidden rounded-full bg-[var(--line)]">
                {regions.map((region, index) => (
                  <div
                    key={region.name}
                    style={{
                      width: `${region.value}%`,
                      background: PALETTE[index % PALETTE.length],
                    }}
                    title={`${region.name} ${region.value}%`}
                  />
                ))}
              </div>
              <div className="mt-5 space-y-3">
                {regions.map((region, index) => (
                  <div
                    key={region.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="flex items-center gap-2 text-[var(--ink2)]">
                      <i
                        className="h-3 w-3 rounded-sm"
                        style={{ background: PALETTE[index % PALETTE.length] }}
                      />
                      {region.name}
                    </span>
                    <b className="text-[var(--pri)]">{region.value}%</b>
                  </div>
                ))}
              </div>
            </>
          ) : coverage.fallbackText ? (
            <p className="mt-6 rounded-lg bg-[var(--acc-p2)] p-4 text-sm leading-7 text-[var(--ink2)]">
              {coverage.fallbackText}
            </p>
          ) : null}
        </div>
      </div>
      <p className="mt-5 rounded-lg bg-white p-5 text-sm leading-7 text-[var(--ink2)] shadow-sm">
        市场认可：{asText(traction.endorsements)}
      </p>
      <PendingNotes module={module} />
    </>
  );
}

function PlanModule({
  module,
  variant,
}: {
  module: BusinessPlanReportModule;
  variant: PageVariant;
}) {
  const roadmap = asArray(module.fields.roadmap).map(asObject);
  const financials = asArray(module.fields.financial_projection).map(asObject);
  const values = financials.flatMap(item => [
    parseBusinessPlanNumber(item.revenue),
    parseBusinessPlanNumber(item.net_profit),
  ]);
  const max = Math.max(1, ...values.map(Math.abs));
  return (
    <>
      {variant === "roadmap" ? (
        <div className="bp-roadmap bp-horizontal-scroll">
          <div className="grid min-w-[780px] grid-cols-[1fr_auto_1fr_auto_1fr] gap-3">
            {roadmap.slice(0, 3).map((item, index) => (
              <div key={index} className="contents">
                <article className="bp-card overflow-hidden">
                  <div
                    className="px-4 py-3 text-sm font-bold text-white"
                    style={{
                      background: [
                        "var(--pri)",
                        "var(--pri-mid)",
                        "var(--acc)",
                      ][index],
                    }}
                  >
                    {asText(item.period)}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold leading-6 text-[var(--pri)]">
                      {asText(item.objective)}
                    </h3>
                    <p className="mt-3 text-sm leading-7 text-[var(--ink2)]">
                      {asText(item.deliverables)}
                    </p>
                  </div>
                </article>
                {index < 2 ? (
                  <svg width="24" viewBox="0 0 24 140" aria-hidden="true">
                    <path
                      d="M3 70h16m-5-5 5 5-5 5"
                      fill="none"
                      stroke="var(--acc)"
                      strokeWidth="2"
                    />
                  </svg>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bp-financial-chart bp-card p-5">
          <h3 className="bp-card-title">收入与净利润预测</h3>
          <div className="bp-horizontal-scroll">
            <svg
              viewBox="0 0 900 310"
              className="min-w-[760px] w-full"
              role="img"
              aria-label="财务双序列柱状图"
            >
              <line x1="55" y1="238" x2="860" y2="238" stroke="var(--line)" />
              {financials.map((item, index) => {
                const x = 85 + index * 155;
                const revenue =
                  (150 * parseBusinessPlanNumber(item.revenue)) / max;
                const profit =
                  (150 * Math.abs(parseBusinessPlanNumber(item.net_profit))) /
                  max;
                const loss = parseBusinessPlanNumber(item.net_profit) < 0;
                const breakEven =
                  !loss &&
                  index > 0 &&
                  parseBusinessPlanNumber(financials[index - 1]?.net_profit) <
                    0;
                return (
                  <g key={index}>
                    <rect
                      x={x}
                      y={238 - revenue}
                      width="44"
                      height={revenue}
                      rx="4"
                      fill="var(--acc)"
                    />
                    <rect
                      x={x + 50}
                      y={loss ? 238 : 238 - profit}
                      width="44"
                      height={profit}
                      rx="4"
                      fill={loss ? "var(--warn)" : "var(--pri)"}
                    />
                    <text
                      x={x + 47}
                      y="280"
                      textAnchor="middle"
                      fill="var(--ink2)"
                      fontSize="12"
                    >
                      {asText(item.year)}
                    </text>
                    {breakEven ? (
                      <g>
                        <line
                          x1={x + 72}
                          y1="35"
                          x2={x + 72}
                          y2="245"
                          stroke="var(--acc)"
                          strokeDasharray="5 5"
                        />
                        <rect
                          x={x + 28}
                          y="16"
                          width="88"
                          height="22"
                          rx="11"
                          fill="var(--acc-p)"
                        />
                        <text
                          x={x + 72}
                          y="31"
                          textAnchor="middle"
                          fill="var(--pri)"
                          fontSize="10"
                          fontWeight="700"
                        >
                          盈亏平衡点
                        </text>
                      </g>
                    ) : null}
                  </g>
                );
              })}
              <g transform="translate(680 20)">
                <rect width="12" height="12" fill="var(--acc)" />
                <text x="18" y="11" fontSize="11" fill="var(--ink2)">
                  收入
                </text>
                <rect x="70" width="12" height="12" fill="var(--pri)" />
                <text x="88" y="11" fontSize="11" fill="var(--ink2)">
                  净利润
                </text>
              </g>
            </svg>
          </div>
        </div>
      )}
      {variant === "financial" ? <PendingNotes module={module} /> : null}
    </>
  );
}

function FundingModule({ module }: { module: BusinessPlanReportModule }) {
  const ask = asObject(module.fields.funding_ask);
  const uses = asArray(module.fields.use_of_funds).map(asObject);
  let offset = 0;
  return (
    <>
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <div className="rounded-xl bg-[var(--pri)] p-8 text-white">
          <span className="text-sm text-white/55">计划融资</span>
          <strong className="mt-4 block text-5xl text-[var(--acc-l)]">
            {asText(ask.funding_amount)}
          </strong>
          <div className="mt-8 border-t border-white/10 pt-5 text-sm text-white/65">
            拟出让比例　
            <b className="text-white">{asText(ask.dilution_range)}</b>
          </div>
        </div>
        <div className="bp-card grid items-center gap-4 p-5 md:grid-cols-[220px_1fr]">
          <svg
            viewBox="0 0 220 220"
            className="bp-funding-donut mx-auto h-52 w-52 -rotate-90"
            role="img"
            aria-label="资金用途环形图"
          >
            <circle
              cx="110"
              cy="110"
              r="72"
              fill="none"
              stroke="var(--line)"
              strokeWidth="30"
            />
            {uses.map((item, index) => {
              const part = Math.max(
                0,
                parseBusinessPlanNumber(item.percentage)
              );
              const dash = part * 4.52;
              const current = offset;
              offset += dash;
              return (
                <circle
                  key={index}
                  cx="110"
                  cy="110"
                  r="72"
                  fill="none"
                  stroke={PALETTE[index % PALETTE.length]}
                  strokeWidth="30"
                  strokeDasharray={`${dash} ${452 - dash}`}
                  strokeDashoffset={-current}
                />
              );
            })}
          </svg>
          <div className="space-y-4">
            {uses.map((item, index) => (
              <div key={index} className="flex gap-3">
                <span
                  className="mt-1 h-3 w-3 shrink-0 rounded-sm"
                  style={{ background: PALETTE[index % PALETTE.length] }}
                />
                <div>
                  <div className="flex gap-2 text-sm font-bold text-[var(--pri)]">
                    <span>{asText(item.purpose)}</span>
                    <span>{asText(item.percentage)}</span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[var(--ink2)]">
                    {asText(item.description)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <PendingNotes module={module} />
    </>
  );
}

function TeamModule({ module }: { module: BusinessPlanReportModule }) {
  const members = asArray(module.fields.team).map(asObject);
  return (
    <>
      <div className="grid items-stretch gap-4 md:grid-cols-3">
        {members.map((member, index) => (
          <article
            key={index}
            className="bp-team-card bp-card flex flex-col items-center p-6 text-center"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--acc)] bg-gradient-to-br from-[var(--acc-p)] to-white text-2xl font-bold text-[var(--pri)]">
              {asText(member.name, "?").slice(0, 1)}
            </div>
            <h3 className="mt-4 text-lg font-bold text-[var(--pri)]">
              {asText(member.name)}
            </h3>
            <p className="mt-1 text-sm font-semibold text-[var(--acc)]">
              {asText(member.role)}
            </p>
            <div className="my-4 h-px w-10 bg-[var(--line)]" />
            <p className="text-left text-sm leading-7 text-[var(--ink2)]">
              {asText(member.background)}
            </p>
          </article>
        ))}
      </div>
      <PendingNotes module={module} />
    </>
  );
}

const MODULE_RENDERERS: Record<
  BusinessPlanReportModule["key"],
  ModuleRenderer
> = {
  demand: DemandModule,
  product_model: ProductModule,
  market: MarketModule,
  competition: CompetitionModule,
  current_state: CurrentStateModule,
  plan: PlanModule,
  funding: FundingModule,
  team: TeamModule,
};

type ReportPage = {
  key: string;
  module: BusinessPlanReportModule;
  variant: PageVariant;
  subTitle?: string;
  primary: boolean;
};

function hasObjectValues(value: unknown): boolean {
  const record = asObject(value);
  return Object.values(record).some(item => {
    if (Array.isArray(item)) return item.length > 0;
    if (item && typeof item === "object") return hasObjectValues(item);
    return (
      typeof item === "number" ||
      (typeof item === "string" && item.trim() !== "")
    );
  });
}

function buildReportPages(modules: BusinessPlanReportModule[]): ReportPage[] {
  return modules.flatMap(module => {
    const variants: Array<{ variant: PageVariant; subTitle?: string }> = [];
    switch (module.key) {
      case "product_model": {
        const hasSolution =
          asArray(module.fields.solution).length > 0 ||
          asArray(module.fields.core_value).length > 0;
        const hasBusiness =
          hasObjectValues(module.fields.business_model) ||
          Boolean(asText(module.fields.sales_model, ""));
        if (hasSolution) variants.push({ variant: "solution" });
        if (hasBusiness)
          variants.push({ variant: "business", subTitle: "商业模式" });
        if (variants.length === 0) variants.push({ variant: "solution" });
        break;
      }
      case "market":
        if (hasObjectValues(module.fields.market_size))
          variants.push({ variant: "space" });
        if (asArray(module.fields.growth_forecast).length > 0)
          variants.push({ variant: "growth", subTitle: "市场增长" });
        if (variants.length === 0) variants.push({ variant: "space" });
        break;
      case "competition":
        if (asArray(module.fields.competitors).length > 0)
          variants.push({ variant: "matrix" });
        if (asArray(module.fields.differentiation).length > 0)
          variants.push({ variant: "advantages", subTitle: "核心优势" });
        if (variants.length === 0) variants.push({ variant: "matrix" });
        break;
      case "plan":
        if (asArray(module.fields.roadmap).length > 0)
          variants.push({ variant: "roadmap" });
        if (asArray(module.fields.financial_projection).length > 0)
          variants.push({ variant: "financial", subTitle: "财务预测" });
        if (variants.length === 0) variants.push({ variant: "roadmap" });
        break;
      default:
        variants.push({ variant: "full" });
    }
    return variants.map((page, index) => ({
      ...page,
      key: `${module.id}-${page.variant}`,
      module,
      primary: index === 0,
    }));
  });
}

function formatPageNumber(page: number, total: number): string {
  return `${String(page).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
}

function ModuleSection({
  page,
  pageNumber,
  totalPages,
}: {
  page: ReportPage;
  pageNumber: number;
  totalPages: number;
}) {
  const { module, variant, primary, subTitle } = page;
  const Renderer = MODULE_RENDERERS[module.key];
  const title = primary
    ? module.headline || module.title
    : subTitle || module.title;
  return (
    <section className="bp-document-page">
      <div className="bp-page-content">
        <div className="bp-module-label">
          模块 {module.id} · {module.title}
        </div>
        <h2 className="bp-title">{title}</h2>
        <div className="bp-divider" />
        {module.status === "error" ? (
          <div className="bp-card flex min-h-64 items-center justify-center border-dashed text-[var(--ink3)]">
            生成失败
          </div>
        ) : (
          <Renderer module={module} variant={variant} />
        )}
      </div>
      <div className="bp-page-number">
        {formatPageNumber(pageNumber, totalPages)}
      </div>
    </section>
  );
}

function BackCover({
  companyName,
  slogan,
  pageNumber,
  totalPages,
}: {
  companyName: string;
  slogan: string;
  pageNumber: number;
  totalPages: number;
}) {
  return (
    <section className="bp-document-page bp-back-cover">
      <svg className="bp-cover-grid" viewBox="0 0 1200 700" aria-hidden="true">
        <g fill="none" stroke="var(--acc-l)" strokeOpacity=".28">
          <circle cx="920" cy="350" r="190" />
          <circle cx="920" cy="350" r="116" />
          <path d="M180 520C390 320 560 620 920 350" />
        </g>
        <g fill="var(--acc)">
          <circle cx="180" cy="520" r="7" />
          <circle cx="920" cy="350" r="9" />
        </g>
      </svg>
      <div className="bp-shell bp-cover-content">
        <h2 className="max-w-3xl text-5xl font-bold leading-tight">
          {companyName}
        </h2>
        {slogan ? <p className="bp-cover-slogan">{slogan}</p> : null}
      </div>
      <div className="bp-page-number text-white/45">
        {formatPageNumber(pageNumber, totalPages)}
      </div>
    </section>
  );
}

function StatePage({ kind }: { kind: "error" | "loading" | "running" }) {
  const content = {
    error: [
      "暂时无法打开这份商业计划书",
      "请确认编号有效，并使用提交该商业计划书的账号登录后重试。",
    ],
    loading: ["正在读取商业计划书", "请稍候。"],
    running: ["商业计划书仍在生成中", "请稍后刷新本页。"],
  }[kind];
  return (
    <div
      className="bp-report flex min-h-screen items-center justify-center bg-[var(--bg)] px-6"
      data-theme="gold"
    >
      <style>{BP_REPORT_CSS}</style>
      <div className="max-w-md text-center">
        {kind === "error" ? (
          <CircleAlert className="mx-auto h-8 w-8 text-[var(--acc)]" />
        ) : (
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[var(--acc)]" />
        )}
        <h1 className="mt-5 text-2xl font-semibold text-[var(--pri)]">
          {content[0]}
        </h1>
        <p className="mt-3 text-sm leading-7 text-[var(--ink2)]">
          {content[1]}
        </p>
        {kind === "error" ? (
          <Link
            href="/"
            className="mt-7 inline-flex items-center gap-2 text-sm text-[var(--acc)]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export default function BusinessPlanReport() {
  const { id } = useParams<{ id: string }>();
  const businessPlanId = Number(id);
  const validId = Number.isInteger(businessPlanId) && businessPlanId > 0;
  const query = trpc.businessPlan.get.useQuery(
    { id: businessPlanId },
    { enabled: validId, retry: 1, refetchOnWindowFocus: false }
  );
  const [downloading, setDownloading] = useState(false);
  const report = query.data ? buildBusinessPlanReport(query.data) : null;
  useEffect(() => {
    if (report) document.title = `${report.cover.companyName} · 商业计划书`;
  }, [report]);
  if (!validId || query.isError) return <StatePage kind="error" />;
  if (query.isLoading || !report) return <StatePage kind="loading" />;
  if (query.data?.status !== "done") return <StatePage kind="running" />;

  async function downloadPdf() {
    if (!report) return;
    setDownloading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const response = await fetch(`/api/business-plan/${businessPlanId}/report.pdf`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error("PDF generation failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${report.cover.companyName || "商业计划书"}-商业计划书-${businessPlanId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      window.alert("PDF 下载失败，请稍后重试");
    } finally {
      setDownloading(false);
    }
  }

  const pages = buildReportPages(report.modules);
  const totalPages = pages.length + 2;
  return (
    <main className="bp-report min-h-screen" data-theme="gold">
      <style>{BP_REPORT_CSS}</style>
      <header className="fixed inset-x-0 top-0 z-20 border-b border-white/10 bg-[color:var(--pri-deep)]/95 px-5 py-3 text-white backdrop-blur">
        <div className="bp-shell flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            返回首页
          </Link>
          <span className="text-xs tracking-[.22em] text-white/50">
            商业计划书
          </span>
          <button
            type="button"
            className="bp-pdf-hidden inline-flex items-center gap-2 rounded border border-[var(--acc)]/70 px-3 py-1.5 text-xs text-[var(--acc-l)] transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
            onClick={downloadPdf}
            disabled={downloading}
          >
            {downloading ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5" />
            )}
            {downloading ? "正在生成" : "下载商业计划书"}
          </button>
        </div>
      </header>
      <div className="bp-document">
        <section className="bp-document-page bp-cover">
          <svg
            className="bp-cover-grid"
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMid slice"
            aria-hidden="true"
          >
            <g fill="none" stroke="var(--acc-l)" strokeOpacity=".26">
              <path d="M700 610V390M790 610V330M880 610V370M970 610V280" />
              <path d="M700 390Q850 150 1080 130M790 330Q920 180 1080 130M880 370Q970 220 1080 130M970 280Q1020 190 1080 130" />
            </g>
            <g fill="var(--acc)" fillOpacity=".5">
              <circle cx="700" cy="390" r="5" />
              <circle cx="790" cy="330" r="5" />
              <circle cx="880" cy="370" r="5" />
              <circle cx="970" cy="280" r="5" />
            </g>
            <ellipse
              cx="1080"
              cy="130"
              rx="72"
              ry="42"
              fill="var(--acc)"
              fillOpacity=".18"
              stroke="var(--acc-l)"
            />
          </svg>
          <div className="bp-shell bp-cover-content">
            <div className="bp-cover-mark">智</div>
            <h1>{report.cover.companyName}</h1>
            {report.cover.slogan ? (
              <p className="bp-cover-slogan">{report.cover.slogan}</p>
            ) : null}
            <p className="bp-cover-date">
              商业计划书　|　{formatDate(report.cover.date)}
            </p>
          </div>
          <div className="bp-page-number text-white/45">
            {formatPageNumber(1, totalPages)}
          </div>
        </section>
        {pages.map((page, index) => (
          <ModuleSection
            key={page.key}
            page={page}
            pageNumber={index + 2}
            totalPages={pages.length + 2}
          />
        ))}
        <BackCover
          companyName={report.cover.companyName}
          slogan={report.cover.slogan}
          pageNumber={totalPages}
          totalPages={totalPages}
        />
      </div>
    </main>
  );
}
