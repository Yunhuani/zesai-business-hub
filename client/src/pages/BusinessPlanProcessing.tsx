import { AlertCircle, Check, Circle, LoaderCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";

const MODULES = [
  "项目概况",
  "客户需求",
  "产品与商业模式",
  "市场规模",
  "竞争分析",
  "目前状况",
  "未来规划与融资",
  "团队",
];
const FRONTEND_TIMEOUT_MS = 5 * 60 * 1000;
const SIMULATED_TOTAL_MS = 34 * 1000;

export default function BusinessPlanProcessing() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const businessPlanId = Number(id);
  const validId = Number.isInteger(businessPlanId) && businessPlanId > 0;
  const startedAt = useRef(Date.now());
  const [elapsedMs, setElapsedMs] = useState(0);
  const [timedOut, setTimedOut] = useState(false);
  const query = trpc.businessPlan.get.useQuery(
    { id: businessPlanId },
    {
      enabled: validId && !timedOut,
      refetchInterval: state => state.state.data?.status === "done" || state.state.data?.status === "error" ? false : 3_000,
      refetchOnWindowFocus: false,
      retry: 2,
    }
  );
  const status = query.data?.status ?? "pending";
  const failed = !validId || query.isError || status === "error" || timedOut;

  useEffect(() => {
    if (status !== "done") return;
    const timer = window.setTimeout(() => setLocation(`/business-plan/${businessPlanId}/report`), 900);
    return () => window.clearTimeout(timer);
  }, [businessPlanId, setLocation, status]);

  useEffect(() => {
    if (status === "done" || status === "error" || timedOut) return;
    const timer = window.setInterval(() => {
      const nextElapsed = Date.now() - startedAt.current;
      setElapsedMs(nextElapsed);
      if (nextElapsed >= FRONTEND_TIMEOUT_MS) setTimedOut(true);
    }, 1_000);
    return () => window.clearInterval(timer);
  }, [status, timedOut]);

  // 模拟进度：引擎当前不暴露模块级进度，待引擎支持后替换这里的时间估算。
  const completedCount = status === "done"
    ? MODULES.length
    : Math.min(MODULES.length - 1, Math.floor((elapsedMs / SIMULATED_TOTAL_MS) * MODULES.length));
  const progress = status === "done" ? 100 : Math.min(90, Math.round((completedCount / MODULES.length) * 90));

  const failureCopy = timedOut
    ? "生成等待已超过 5 分钟，请重新生成。"
    : "生成失败，已自动退还扣除的积分";

  if (failed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--zs-bg)] px-6 text-[var(--zs-ink)]">
        <div className="max-w-md text-center">
          <AlertCircle className="mx-auto h-9 w-9 text-[var(--zs-gold)]" />
          <h1 className="mt-6 text-3xl font-semibold">商业计划书生成未完成</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--zs-sub)]">{failureCopy}</p>
          <button type="button" onClick={() => setLocation("/business-plan/conversation")} className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[var(--zs-primary)] px-5 py-3 text-sm font-semibold text-white">
            <RotateCcw className="h-4 w-4" />重新生成
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--zs-bg)] px-6 py-16 text-[var(--zs-ink)]">
      <div className="mx-auto max-w-2xl">
        <div className="border-l-2 border-[var(--zs-gold)] pl-5">
          <p className="text-xs font-semibold tracking-[0.16em] text-[var(--zs-weak)]">BUSINESS PLAN IN PROGRESS</p>
          <h1 className="mt-3 text-3xl font-semibold">正在为您撰写商业计划书</h1>
          <p className="mt-4 text-sm leading-7 text-[var(--zs-sub)]">我们正在整理项目资料、市场数据和融资规划，请稍候。</p>
        </div>
        <div className="mt-12">
          <div className="flex items-end justify-between">
            <p className="text-lg font-semibold">八模块商业计划书</p>
            <span className="text-sm text-[var(--zs-sub)]">{progress}%</span>
          </div>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--zs-line)]">
            <div className="h-full rounded-full bg-[var(--zs-gold)] transition-[width] duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <section className="mt-8 overflow-hidden rounded-2xl border border-[var(--zs-line)] bg-[var(--zs-card)]">
          {MODULES.map((module, index) => {
            const complete = index < completedCount;
            const active = index === completedCount;
            return (
              <div key={module} className={`flex items-center gap-4 px-5 py-4 ${index ? "border-t border-[var(--zs-line)]" : ""}`}>
                {complete ? <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--zs-primary)] text-white"><Check className="h-4 w-4" /></span> : active ? <span className="grid h-8 w-8 place-items-center rounded-full border border-[var(--zs-gold)] text-[var(--zs-gold)]"><LoaderCircle className="h-4 w-4 animate-spin" /></span> : <Circle className="h-5 w-5 text-[var(--zs-weak)]" />}
                <div>
                  <p className={`font-medium ${complete || active ? "text-[var(--zs-ink)]" : "text-[var(--zs-weak)]"}`}>{module}</p>
                  <p className="mt-1 text-xs text-[var(--zs-weak)]">{complete ? "已完成" : active ? "正在撰写" : "等待处理"}</p>
                </div>
              </div>
            );
          })}
        </section>
        <p className="mt-8 text-center text-sm text-[var(--zs-sub)]">通常需要 30 秒左右，请不要关闭页面</p>
      </div>
    </main>
  );
}
