import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  Check,
  Circle,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import {
  DIAGNOSIS_DIMENSIONS,
  DIAGNOSIS_FRONTEND_TIMEOUT_MS,
  getEstimatedDimensionStates,
  type DiagnosisStatus,
} from "./diagnosisProgress";

const STATUS_COPY = {
  pending: {
    eyebrow: "Preparing diagnosis",
    title: "正在整理你的公司信息",
    description: "顾问正在校准分析框架，很快进入五维诊断。",
  },
  running: {
    eyebrow: "Diagnosis in progress",
    title: "AI 顾问正在分析你的公司",
    description: "我们正在交叉验证市场、竞争、商业模式、能力与财务信息。",
  },
} as const;

export default function DiagnosisProcessing() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const diagnosisId = Number(id);
  const validId = Number.isInteger(diagnosisId) && diagnosisId > 0;
  const previewMode =
    import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get("preview") === "1";
  const startedAt = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timedOut, setTimedOut] = useState(false);

  const diagnosisQuery = trpc.diagnosis.get.useQuery(
    { id: diagnosisId },
    {
      enabled: validId && !timedOut && !previewMode,
      refetchInterval: query => {
        const currentStatus = query.state.data?.status;
        return currentStatus === "done" || currentStatus === "error"
          ? false
          : 3_000;
      },
      refetchOnWindowFocus: false,
      retry: 2,
    }
  );

  const status = (
    previewMode ? "running" : diagnosisQuery.data?.status ?? "pending"
  ) as DiagnosisStatus;
  const terminalError = status === "error";

  useEffect(() => {
    if (status === "done") {
      const redirectTimer = window.setTimeout(() => {
        setLocation(`/diagnosis/${diagnosisId}/report`);
      }, 900);
      return () => window.clearTimeout(redirectTimer);
    }
  }, [diagnosisId, setLocation, status]);

  useEffect(() => {
    if (status === "done" || terminalError || timedOut) return;

    const timer = window.setInterval(() => {
      const nextElapsed = Date.now() - startedAt.current;
      setElapsedMs(nextElapsed);
      if (nextElapsed >= DIAGNOSIS_FRONTEND_TIMEOUT_MS) {
        setTimedOut(true);
      }
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [status, terminalError, timedOut]);

  const dimensionStates = useMemo(
    () => getEstimatedDimensionStates(status, elapsedMs),
    [elapsedMs, status]
  );
  const completedCount = dimensionStates.filter(
    dimensionStatus => dimensionStatus === "complete"
  ).length;
  const progress = status === "done"
    ? 100
    : Math.min(92, Math.round(((completedCount + 0.45) / 5) * 100));
  const copy = STATUS_COPY[status === "running" ? "running" : "pending"];
  const showFailure =
    !validId ||
    terminalError ||
    timedOut ||
    (!previewMode && diagnosisQuery.isError);

  return (
    <div className="min-h-screen bg-[#FBFAF7] px-5 text-[#24221E] [font-family:Inter,'Noto_Sans_SC','PingFang_SC',sans-serif]">
      <header className="mx-auto flex h-20 w-full max-w-5xl items-center justify-between">
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-[-0.025em] transition hover:text-[#6E685E]"
        >
          泽思 · 公司诊断
        </Link>
        <span className="text-xs tracking-wide text-[#8B867D]">
          诊断编号 {validId ? diagnosisId : "—"}
        </span>
      </header>

      <main className="mx-auto w-full max-w-[780px] pb-24 pt-10 sm:pt-16">
        {showFailure ? (
          <div className="mx-auto max-w-lg py-16 text-center sm:py-24">
            <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full border border-[#DFCFC7] bg-white">
              <AlertCircle className="h-6 w-6 text-[#A45B43]" />
            </div>
            <p className="mb-4 font-mono text-[11px] uppercase tracking-[0.16em] text-[#8C867C]">
              Analysis interrupted
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-4xl">
              {timedOut ? "分析时间比预期更长" : "分析遇到了一点问题"}
            </h1>
            <p className="mx-auto mt-5 max-w-md text-[15px] leading-7 text-[#736E65]">
              {timedOut
                ? "本次等待已超过十分钟。你可以稍后回来查看，或重新发起一次诊断。"
                : "当前诊断未能顺利完成，请重新提交。你的技术错误信息不会显示在这里。"}
            </p>
            <Link
              href="/diagnosis"
              className="mt-9 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#AE8A48] px-5 text-sm font-semibold text-white transition hover:bg-[#96753C]"
            >
              <RotateCcw className="h-4 w-4" />
              重新开始
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-12 border-l-2 border-[#AE8A48] pl-5 sm:mb-14 sm:pl-7">
              <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.16em] text-[#837E75]">
                {status === "done" ? "Diagnosis complete" : copy.eyebrow}
              </p>
              <h1 className="text-[30px] font-semibold leading-[1.2] tracking-[-0.045em] sm:text-[40px]">
                {status === "done" ? "五维诊断已完成" : copy.title}
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-7 text-[#736E65]">
                {status === "done"
                  ? "分析结果已生成，正在为你打开诊断报告。"
                  : copy.description}
              </p>
            </div>

            <div className="mb-12">
              <div className="mb-4 flex items-end justify-between">
                <div>
                  <p className="text-[17px] font-semibold tracking-[-0.02em] text-[#34312B]">
                    NBG 五维模型分析
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-[#918B81]">
                    Five-dimension analysis
                  </p>
                </div>
                <span className="font-mono text-[15px] font-medium text-[#6F695F]">
                  {progress}%
                </span>
              </div>
              <div className="h-[3px] overflow-hidden rounded-full bg-[#E7E3DB]">
                <div
                  className="h-full rounded-full bg-[#AE8A48] transition-[width] duration-1000 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            <section className="overflow-hidden rounded-2xl border border-[#DEDAD2] bg-white">
              {DIAGNOSIS_DIMENSIONS.map((dimension, index) => {
                const dimensionStatus = dimensionStates[index];
                const isComplete = dimensionStatus === "complete";
                const isActive = dimensionStatus === "active";

                return (
                  <div
                    key={dimension}
                    className={`relative flex min-h-[78px] items-center gap-4 px-5 py-4 sm:px-7 ${
                      index === 0 ? "" : "border-t border-[#ECE9E3]"
                    }`}
                  >
                    <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white">
                      {isComplete ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#AE8A48] text-white">
                          <Check className="h-4 w-4" strokeWidth={2.2} />
                        </span>
                      ) : isActive ? (
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#C8AE7C] bg-[#FCFAF5] text-[#AE8A48]">
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                        </span>
                      ) : (
                        <Circle className="h-5 w-5 text-[#C9C4BA]" strokeWidth={1.4} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-[16px] font-medium transition-colors ${
                          isActive || isComplete ? "text-[#2B2823]" : "text-[#969087]"
                        }`}
                      >
                        {dimension}
                      </p>
                      <p className="mt-1 text-[12px] text-[#9A958C]">
                        {isComplete ? "已完成" : isActive ? "进行中" : "等待分析"}
                      </p>
                    </div>

                    <span className="font-mono text-[11px] text-[#B0AAA0]">
                      0{index + 1}
                    </span>
                  </div>
                );
              })}
            </section>

            <p className="mx-auto mt-8 max-w-lg text-center text-[13px] leading-6 text-[#8A847A]">
              五维进度按预估节奏展示，最终完成状态以诊断引擎返回结果为准。
            </p>
          </>
        )}
      </main>
    </div>
  );
}
