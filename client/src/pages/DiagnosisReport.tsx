import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Download,
  LoaderCircle,
  LockKeyhole,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import { APP_LOGO_FULL } from "@/const";
import {
  buildDiagnosisReport,
  type DiagnosisReportDimension,
} from "./diagnosisReportData";

function formatReportDate(value: string | null): string {
  const date = value ? new Date(value) : new Date();
  const safeDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return safeDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ScoreBar({ dimension }: { dimension: DiagnosisReportDimension }) {
  const width = dimension.score === null
    ? 0
    : Math.max(0, Math.min(100, dimension.score * 10));

  return (
    <div className="grid grid-cols-[minmax(92px,1fr)_minmax(120px,2.2fr)_42px] items-center gap-4 border-t border-white/[0.08] py-4 first:border-t-0">
      <span className="text-sm text-[#D6D8DE]">{dimension.name}</span>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8F6825] to-[#E8B84B]"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="text-right font-mono text-sm text-[#FFD166]">
        {dimension.score === null ? "—" : dimension.score.toFixed(1)}
      </span>
    </div>
  );
}

export default function DiagnosisReport() {
  const { id } = useParams<{ id: string }>();
  const diagnosisId = Number(id);
  const validId = Number.isInteger(diagnosisId) && diagnosisId > 0;
  const previewMode =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("preview") === "1";
  const pdfMode = new URLSearchParams(window.location.search).get("pdf") === "1";
  const [downloading, setDownloading] = useState(false);
  const utils = trpc.useUtils();
  const diagnosisQuery = trpc.diagnosis.get.useQuery(
    { id: diagnosisId },
    {
      enabled: validId && !previewMode,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );
  const previewQuery = trpc.diagnosis.preview.useQuery(
    { id: diagnosisId },
    {
      enabled: validId && previewMode,
      retry: 1,
      refetchOnWindowFocus: false,
    }
  );
  const query = previewMode ? previewQuery : diagnosisQuery;
  const unlockDiagnosis = trpc.diagnosis.submitFull.useMutation({
    onSuccess: data => {
      utils.diagnosis.get.setData({ id: diagnosisId }, data);
      toast.success("完整诊断已解锁");
    },
    onError: error => {
      if (error.message.includes("INSUFFICIENT_CREDITS")) {
        toast.error("积分不足，请先充值积分或升级套餐");
        return;
      }
      toast.error("解锁失败，请稍后重试");
    },
  });

  const report = query.data
    ? buildDiagnosisReport(query.data)
    : null;

  useEffect(() => {
    if (report) {
      document.title = `${report.companyName} · NBG 诊断报告`;
    }
  }, [report]);

  async function downloadPdf() {
    setDownloading(true);
    try {
      const token = localStorage.getItem("auth_token");
      const preview = previewMode ? "?preview=1" : "";
      const response = await fetch(
        `/api/diagnosis/${diagnosisId}/report.pdf${preview}`,
        {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      if (!response.ok) {
        if (response.status === 402) {
          toast.error("积分不足，首次下载需要 500 积分");
          return;
        }
        throw new Error("PDF generation failed");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${report?.companyName ?? "NBG诊断"}-诊断报告-${diagnosisId}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      await diagnosisQuery.refetch();
    } catch {
      toast.error("PDF 下载失败，请稍后重试");
    } finally {
      setDownloading(false);
    }
  }

  if (!validId || query.isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121317] px-6 text-[#EAEDF3]">
        <div className="max-w-md text-center">
          <CircleAlert className="mx-auto h-8 w-8 text-[#E8B84B]" />
          <h1 className="mt-6 text-2xl font-semibold">暂时无法打开这份报告</h1>
          <p className="mt-3 text-sm leading-7 text-[#9DA4B3]">
            请确认诊断编号有效，并使用提交诊断时的账号登录后重试。
          </p>
          <Link
            href="/diagnosis"
            className="mt-8 inline-flex items-center gap-2 text-sm text-[#FFD166]"
          >
            <ArrowLeft className="h-4 w-4" />
            返回诊断问卷
          </Link>
        </div>
      </div>
    );
  }

  if (query.isLoading || !report) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121317] text-[#EAEDF3]">
        <div className="text-center">
          <LoaderCircle className="mx-auto h-7 w-7 animate-spin text-[#E8B84B]" />
          <p className="mt-4 text-sm text-[#9DA4B3]">正在读取诊断报告</p>
        </div>
      </div>
    );
  }

  if (query.data?.status !== "done") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#121317] px-6 text-[#EAEDF3]">
        <div className="max-w-md text-center">
          <LoaderCircle className="mx-auto h-8 w-8 animate-spin text-[#E8B84B]" />
          <h1 className="mt-6 text-2xl font-semibold">诊断仍在分析中</h1>
          <Link
            href={`/diagnosis/${diagnosisId}/processing`}
            className="mt-8 inline-flex items-center gap-2 text-sm text-[#FFD166]"
          >
            查看分析进度
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  const degradedDimensions = report.dimensions.filter(
    dimension => dimension.degraded
  );
  const fullAccess = query.data?.fullAccess === true;
  const pdfPurchased = query.data?.pdfPurchased === true;
  const reportDate = formatReportDate(report.createdAt);

  return (
    <div
      className="diagnosis-report min-h-screen overflow-hidden bg-[#121317] text-[#EAEDF3] [font-family:'Noto_Sans_SC',sans-serif]"
      data-report-company={report.companyName}
    >
      <style>{`
        @media print {
          @page { size: A4; margin: 0; }
          html, body { background: #121317 !important; }
          .diagnosis-report { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .diagnosis-report, .diagnosis-report * {
            font-family: 'Noto Sans SC', sans-serif !important;
          }
          .report-cover, .report-dimension, .report-findings, .report-closing, .report-about {
            break-before: page;
          }
          .report-cover {
            break-before: auto;
            break-after: page;
            min-height: calc(297mm - 29mm);
          }
          .report-about { min-height: calc(297mm - 29mm); }
          .report-heading, .report-card, .report-reason, .report-degradation {
            break-inside: avoid;
          }
          .report-heading { break-after: avoid; }
          .report-screen-only { display: none !important; }
        }
      `}</style>
      <div className="report-screen-only pointer-events-none fixed inset-0 opacity-[0.035] [background-image:radial-gradient(#fff_0.7px,transparent_0.7px)] [background-size:8px_8px]" />

      <header className="report-screen-only relative z-10 border-b border-white/[0.08]">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="text-sm font-semibold tracking-[-0.02em]">
            泽思 <span className="mx-2 text-[#6E7180]">·</span> NBG 公司诊断
          </Link>
          <div className="flex items-center gap-5">
            {!pdfMode && fullAccess ? (
              <button
                type="button"
                onClick={downloadPdf}
                disabled={downloading}
                className="inline-flex h-10 items-center gap-2 border border-[#E8B84B]/45 px-4 text-xs font-medium text-[#FFD166] transition hover:border-[#FFD166] disabled:opacity-60"
              >
                {downloading ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading
                  ? "正在生成"
                  : pdfPurchased
                    ? "下载 PDF"
                    : "下载 PDF · 500 积分"}
              </button>
            ) : null}
            <div className="text-right font-mono text-[10px] uppercase tracking-[0.16em] text-[#6E7180]">
              <p>Confidential</p>
              <p className="mt-1 text-[#9DA4B3]">NO. {report.id}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {!fullAccess ? (
          <div className="border-b border-[#E8B84B]/20 bg-[#17160F]">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-6 sm:px-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#FFD166]">
                <LockKeyhole className="h-4 w-4" />
                这是免费预览
              </div>
              <p className="max-w-3xl text-sm leading-7 text-[#B5BAC5]">
                当前展示总体评分、五维分值和一个关键发现。完整报告包含各维度判断、推理依据、证据链、风险提示及三个关键发现。
              </p>
            </div>
          </div>
        ) : null}
        <section className="report-cover relative mx-auto flex max-w-6xl flex-col justify-between px-5 pb-12 pt-12 sm:px-8 sm:pt-16">
          <div className="absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#E8B84B]/55 to-transparent sm:inset-x-8" />
          <div className="flex items-start justify-between gap-8">
            <img
              src={APP_LOGO_FULL}
              alt="泽思AI"
              className="h-12 w-auto object-contain brightness-110 sm:h-16"
            />
            <div className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[#6E7180]">
              <p>Confidential Report</p>
              <p className="mt-1 text-[#E8B84B]">NO. {report.id}</p>
            </div>
          </div>

          <div className="grid gap-12 py-16 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:py-20">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-[#E8B84B]">
                NBG Growth Diagnosis
              </p>
              <h1 className="mt-8 max-w-4xl text-[46px] font-semibold leading-[1.08] tracking-[-0.06em] sm:text-[72px] lg:text-[88px]">
                NBG 增长诊断报告
              </h1>
              <div className="mt-10 h-px max-w-xl bg-gradient-to-r from-[#E8B84B] to-transparent" />
              <p className="mt-8 text-xl font-medium text-[#F5F0E5] sm:text-2xl">
                {report.companyName}
              </p>
              <p className="mt-4 text-sm text-[#9DA4B3]">
                报告生成日期：{reportDate}
              </p>
            </div>
            <div className="border border-[#E8B84B]/35 bg-[#17160F] p-7 shadow-[0_24px_80px_rgba(0,0,0,0.28)]">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6E7180]">
                Growth health score
              </p>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-[72px] font-light leading-none tracking-[-0.08em] text-[#FFD166] sm:text-[88px]">
                  {report.overallScore === null
                    ? "—"
                    : report.overallScore.toFixed(1)}
                </span>
                <span className="mb-2 text-sm text-[#6E7180]">/ 10</span>
              </div>
              {report.scoreLabel ? (
                <span className="mt-5 inline-flex border border-[#E0A05A]/60 bg-[#E0A05A]/10 px-3 py-1.5 text-xs tracking-[0.12em] text-[#E8B84B]">
                  {report.scoreLabel}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-7 text-sm text-[#9DA4B3] sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-xl leading-7">
              泽思AI 咨询交付中心
              <br />
              基于 NBG 增长解码体系
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6E7180]">
              ZESAI.COM
            </p>
          </div>
        </section>

        <section className="report-body-intro border-b border-white/[0.08] bg-[#121317]">
          <div className="mx-auto grid max-w-6xl gap-8 px-5 py-14 sm:px-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E8B84B]">
                Client report
              </p>
              <h1 className="mt-5 text-3xl font-semibold leading-tight tracking-[-0.045em] sm:text-5xl">
                {report.companyName}增长诊断报告
              </h1>
              {report.headline ? (
                <p className="mt-6 max-w-3xl text-[18px] leading-8 text-[#D6D8DE]">
                  {report.headline}
                </p>
              ) : null}
            </div>
            {report.overallJudgment ? (
              <p className="border-l border-[#E8B84B]/70 pl-6 text-sm leading-7 text-[#9DA4B3]">
                {report.overallJudgment}
              </p>
            ) : null}
          </div>
        </section>

        <section className="report-executive mx-auto grid max-w-6xl gap-14 px-5 pb-24 pt-16 sm:px-8 sm:pt-24 lg:grid-cols-[1.45fr_0.55fr] lg:gap-20 lg:pb-32">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[#E8B84B]">
              NBG Growth Diagnosis
            </p>
            <p className="mt-7 text-sm text-[#9DA4B3]">{report.companyName}</p>
            {report.headline ? (
              <h1 className="mt-5 max-w-3xl text-[42px] font-semibold leading-[1.13] tracking-[-0.055em] sm:text-[58px] lg:text-[66px]">
                {report.headline}
              </h1>
            ) : null}
            {report.overallJudgment ? (
              <p className="mt-9 max-w-3xl border-l border-[#E8B84B] pl-6 text-[16px] leading-8 text-[#B5BAC5] sm:text-[18px]">
                {report.overallJudgment}
              </p>
            ) : null}
          </div>

          <div className="self-end border-t border-[#E8B84B] pt-7 lg:border-l lg:border-t-0 lg:pl-9 lg:pt-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6E7180]">
              Growth health score
            </p>
            <div className="mt-5 flex items-end gap-3">
              <span className="text-[76px] font-light leading-none tracking-[-0.08em] text-[#FFD166] sm:text-[92px]">
                {report.overallScore === null
                  ? "—"
                  : report.overallScore.toFixed(1)}
              </span>
              <span className="mb-2 text-sm text-[#6E7180]">/ 10</span>
            </div>
            {report.scoreLabel ? (
              <span className="mt-5 inline-flex border border-[#E0A05A]/60 bg-[#E0A05A]/10 px-3 py-1.5 text-xs tracking-[0.12em] text-[#E8B84B]">
                {report.scoreLabel}
              </span>
            ) : null}
            <p className="mt-7 font-mono text-[10px] leading-5 text-[#6E7180]">
              DIAGNOSIS ID {report.id}
              {report.createdAt ? <><br />{report.createdAt}</> : null}
            </p>
          </div>
        </section>

        {report.dimensions.length > 0 ? (
          <section className="report-health border-b border-white/[0.08] bg-[#0E0F13]">
            {degradedDimensions.length > 0 ? (
              <div className="report-degradation border-b border-[#E8B84B]/20 bg-[#17160F]">
                <div className="mx-auto flex max-w-6xl flex-col gap-5 px-5 py-8 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-[#E8B84B]">
                      关于本次诊断的信息完整度
                    </p>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-[#9DA4B3]">
                      {degradedDimensions.map(item => item.name).join("、")}
                      基于现有信息提供方向性判断。补充外部市场情报、竞争力数据或财务明细后，可进一步精确量化。
                    </p>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.16em] text-[#8F6825]">
                    Directional assessment
                  </span>
                </div>
              </div>
            ) : null}
            <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[0.75fr_1.25fr] lg:gap-24">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E8B84B]">
                  Health examination
                </p>
                <h2 className="mt-5 text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
                  五维增长健康度体检
                </h2>
                <p className="mt-5 max-w-md text-sm leading-7 text-[#8A8F9C]">
                  五个维度等权观察。分数用于定位结构性短板，具体判断以各维度的证据链为准。
                </p>
              </div>
              <div>
                {report.dimensions.map(dimension => (
                  <ScoreBar key={dimension.key} dimension={dimension} />
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!fullAccess ? (
          <section className="border-b border-white/[0.08] bg-[#0E0F13]">
            <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
              <LockKeyhole className="mx-auto h-8 w-8 text-[#E8B84B]" />
              <h2 className="mt-6 text-3xl font-semibold tracking-[-0.04em]">
                解锁完整 NBG 增长诊断
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[#9DA4B3]">
                查看完整五维分析、证据链、风险判断和行动建议。解锁基于本次已生成结果，不会重新等待分析。
              </p>
              <button
                type="button"
                onClick={() => unlockDiagnosis.mutate({ diagnosisId })}
                disabled={unlockDiagnosis.isPending}
                className="mt-8 inline-flex h-12 items-center gap-2 bg-[#E8B84B] px-6 text-sm font-semibold text-[#121317] transition hover:bg-[#FFD166] disabled:opacity-60"
              >
                {unlockDiagnosis.isPending ? (
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                ) : (
                  <LockKeyhole className="h-4 w-4" />
                )}
                {unlockDiagnosis.isPending
                  ? "正在解锁"
                  : "解锁完整报告 · 1500 积分"}
              </button>
              {unlockDiagnosis.error?.message.includes("INSUFFICIENT_CREDITS") ? (
                <div className="mt-5 flex justify-center gap-5 text-sm">
                  <Link href="/credits" className="text-[#FFD166]">购买积分</Link>
                  <Link href="/pricing" className="text-[#FFD166]">查看套餐</Link>
                </div>
              ) : null}
            </div>
          </section>
        ) : null}

        {fullAccess ? report.dimensions.map((dimension, index) => (
          <section
            key={dimension.key}
            className="report-dimension mx-auto max-w-6xl border-b border-white/[0.08] px-5 py-20 sm:px-8 sm:py-28"
          >
            <div className="grid gap-12 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-20">
              <div className="break-keep [word-break:keep-all]">
                <span className="font-mono text-xs text-[#E8B84B]">
                  0{index + 1}
                </span>
                <h2 className="report-heading mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  {dimension.name}
                </h2>
                <div className="mt-8 flex items-end gap-2">
                  <span className="text-5xl font-light text-[#FFD166]">
                    {dimension.score === null ? "—" : dimension.score.toFixed(1)}
                  </span>
                  <span className="mb-1 text-xs text-[#6E7180]">/ 10</span>
                </div>
                {dimension.frameworks.length > 0 ? (
                  <p className="mt-8 text-xs leading-6 text-[#6E7180]">
                    分析框架
                    <br />
                    {dimension.frameworks.map(framework => (
                      <span
                        key={framework}
                        className="mt-1 block break-keep text-[#9DA4B3] [word-break:keep-all]"
                      >
                        {framework}
                      </span>
                    ))}
                  </p>
                ) : null}
              </div>

              <div>
                {dimension.judgment ? (
                  <h3 className="max-w-3xl text-[27px] font-semibold leading-[1.45] tracking-[-0.035em] sm:text-[34px]">
                    {dimension.judgment}
                  </h3>
                ) : null}

                {dimension.degraded ? (
                  <span className="mt-7 inline-flex border border-[#3A3C44] bg-[#1A1B20] px-3 py-1.5 text-[11px] tracking-[0.08em] text-[#9DA4B3]">
                    基于现有信息的方向性判断
                  </span>
                ) : null}

                {dimension.reasoning.length > 0 ? (
                  <div className="mt-12">
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#6E7180]">
                      Reasoning chain
                    </p>
                    <div className="mt-5 space-y-0">
                      {dimension.reasoning.map((reason, reasonIndex) => (
                        <div
                          key={`${dimension.key}-reason-${reasonIndex}`}
                          className="report-reason grid grid-cols-[34px_1fr] gap-4 border-t border-white/[0.08] py-5"
                        >
                          <span className="font-mono text-xs text-[#8F6825]">
                            {String(reasonIndex + 1).padStart(2, "0")}
                          </span>
                          <p className="text-[15px] leading-7 text-[#B5BAC5]">
                            {reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {dimension.evidence.length > 0 ? (
                  <div className="mt-10 grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] sm:grid-cols-2">
                    {dimension.evidence.map((evidence, evidenceIndex) => (
                      <div
                        key={`${dimension.key}-evidence-${evidenceIndex}`}
                        className={`report-card bg-[#121317] p-6 ${
                          dimension.evidence.length % 2 === 1 &&
                          evidenceIndex === dimension.evidence.length - 1
                            ? "sm:col-span-2"
                            : ""
                        }`}
                      >
                        <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-[#6E7180]">
                          Evidence {String(evidenceIndex + 1).padStart(2, "0")}
                        </p>
                        <p className="mt-4 text-sm leading-6 text-[#D6D8DE]">
                          {evidence.claim}
                        </p>
                        {evidence.value ? (
                          <p className="mt-5 text-lg font-medium text-[#FFD166]">
                            {evidence.value}
                          </p>
                        ) : null}
                        {evidence.benchmark ? (
                          <p className="mt-2 text-xs leading-5 text-[#6E7180]">
                            参照：{evidence.benchmark}
                          </p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : null}

                {dimension.scoreBasis ? (
                  <p className="mt-7 text-xs leading-6 text-[#6E7180]">
                    评分依据：{dimension.scoreBasis}
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        )) : null}

        {report.keyFindings.length > 0 ? (
          <section className="report-findings bg-[#0E0F13]">
            <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E8B84B]">
                Three key findings
              </p>
              <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
                决定公司下一步的三个关键发现
              </h2>
              <div className="mt-14 grid gap-px overflow-hidden border border-white/[0.08] bg-white/[0.08] lg:grid-cols-3">
                {report.keyFindings.map((finding, index) => (
                  <article
                    key={finding.id ?? finding.title}
                    className="report-card min-h-[310px] bg-[#121317] p-7 sm:p-9"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-[#E8B84B]">
                        0{index + 1}
                      </span>
                      {finding.id ? (
                        <span className="font-mono text-[9px] text-[#4A4D57]">
                          {finding.id}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-10 text-xl font-semibold leading-8 tracking-[-0.025em]">
                      {finding.title}
                    </h3>
                    {finding.detail ? (
                      <p className="mt-5 text-sm leading-7 text-[#8A8F9C]">
                        {finding.detail}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {fullAccess ? (
        <section className="report-closing mx-auto max-w-6xl px-5 py-24 sm:px-8 sm:py-32">
          <div className="relative overflow-hidden border border-[#E8B84B]/35 bg-[#17160F] px-7 py-12 sm:px-12 sm:py-16 lg:px-16">
            <div
              className="absolute right-0 top-0 h-56 w-56 translate-x-1/3 -translate-y-1/3 rounded-full border border-[#E8B84B]/15"
              aria-hidden="true"
            />
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E8B84B]">
              From diagnosis to action
            </p>
            <h2 className="mt-5 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:text-5xl">
              下一步，把发现转化为增长方案
            </h2>
            {report.transitionToSolution ? (
              <p className="mt-7 max-w-3xl text-[16px] leading-8 text-[#B5BAC5]">
                {report.transitionToSolution}
              </p>
            ) : null}
            <div className="report-screen-only mt-10">
              <Link
                href="/support"
                className="inline-flex h-12 items-center gap-3 bg-[#E8B84B] px-6 text-sm font-semibold text-[#121317] transition hover:bg-[#FFD166]"
              >
                联系顾问 / 获取增长方案
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <p className="mt-8 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-[#4A4D57]">
            泽思 AI 按 NBG 五维框架生成 · 诊断结果需结合顾问审核深化
          </p>
        </section>
        ) : null}

        <section className="report-about bg-[#0E0F13]">
          <div className="mx-auto flex max-w-6xl flex-col justify-between px-5 py-16 sm:px-8 sm:py-20">
            <div className="flex items-start justify-between gap-8 border-b border-white/[0.08] pb-8">
              <img
                src={APP_LOGO_FULL}
                alt="泽思AI"
                className="h-12 w-auto object-contain brightness-110"
              />
              <p className="text-right font-mono text-[10px] uppercase tracking-[0.18em] text-[#6E7180]">
                Methodology Note
              </p>
            </div>
            <div className="grid gap-12 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#E8B84B]">
                  About Zesai AI
                </p>
                <h2 className="mt-5 text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
                  关于泽思AI
                </h2>
              </div>
              <div className="space-y-7 text-[15px] leading-8 text-[#B5BAC5]">
                <p>
                  泽思AI 是面向企业经营者的 AI 商业咨询交付平台，聚焦增长诊断、经营分析与决策支持。我们将咨询公司的结构化方法论与大模型分析能力结合，帮助企业把复杂经营问题转化为可讨论、可决策、可推进的报告成果。
                </p>
                <p>
                  NBG 增长解码体系从市场机会、竞争格局、商业模式、内部能力与财务健康五个维度观察企业增长状态，用于识别限制增长的关键环节，而不是只罗列表面问题。
                </p>
                <p>
                  本报告由 AI 基于问卷信息、结构化模型和 NBG 方法论生成，适合作为经营复盘和顾问沟通的起点。报告不构成投资、法律、财税或人事决策的最终意见，建议结合企业真实经营数据、行业信息和管理层判断进一步校准。
                </p>
              </div>
            </div>
            <div className="grid gap-5 border-t border-[#E8B84B]/25 pt-8 text-sm text-[#9DA4B3] sm:grid-cols-3">
              <p>
                官网
                <br />
                <span className="font-mono text-[#F5F0E5]">zesai.com</span>
              </p>
              <p>
                报告类型
                <br />
                <span className="text-[#F5F0E5]">NBG 增长诊断</span>
              </p>
              <p>
                品牌署名
                <br />
                <span className="text-[#F5F0E5]">泽思AI 咨询交付中心</span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
