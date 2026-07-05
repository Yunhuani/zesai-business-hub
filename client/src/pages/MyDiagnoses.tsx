import { useAuth } from "@/_core/hooks/useAuth";
import { AppFooter } from "@/components/layout/Footer";
import { AppHeader } from "@/components/layout/Navbar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/dateUtils";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { Link } from "wouter";

const STATUS_LABELS: Record<string, string> = {
  pending: "等待诊断",
  running: "诊断中",
  done: "已完成",
  error: "诊断失败",
};

export default function MyDiagnoses() {
  const { loading: authLoading, isAuthenticated } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const { data: diagnoses, isLoading } = trpc.diagnosis.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
        <AppHeader />
        <main className="zs-container flex min-h-[560px] items-center justify-center py-16">
          <Icons.Loader2 className="h-10 w-10 animate-spin text-[var(--zs-primary)]" />
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />
      <header className="border-b border-[var(--zs-line)] bg-[var(--zs-bg)]">
        <div className="zs-container flex items-center gap-4 py-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <Icons.ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">我的诊断</h1>
            <p className="text-sm text-muted-foreground">
              查看已提交的 NBG 增长诊断
            </p>
          </div>
        </div>
      </header>

      <main className="zs-container max-w-4xl py-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Icons.Loader2 className="h-10 w-10 animate-spin text-[var(--zs-primary)]" />
          </div>
        ) : diagnoses?.length ? (
          <div className="space-y-4">
            {diagnoses.map(diagnosis => {
              const destination =
                diagnosis.status === "done"
                  ? `/diagnosis/${diagnosis.id}/report`
                  : `/diagnosis/${diagnosis.id}/processing`;

              return (
                <Link key={diagnosis.id} href={destination}>
                  <Card className="cursor-pointer border-[var(--zs-line)] bg-[var(--zs-card)] transition-shadow hover:shadow-[var(--zs-shadow-card)]">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <CardTitle className="truncate text-lg">
                            {diagnosis.headline ||
                              `NBG 增长诊断 #${diagnosis.id}`}
                          </CardTitle>
                          <CardDescription className="mt-2">
                            {formatDateTime(diagnosis.createdAt)}
                          </CardDescription>
                        </div>
                        <Icons.ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                      <span>
                        总分：
                        <strong>
                          {diagnosis.overallScore === null
                            ? "待生成"
                            : diagnosis.overallScore.toFixed(1)}
                        </strong>
                      </span>
                      {diagnosis.scoreLabel && (
                        <span>评级：{diagnosis.scoreLabel}</span>
                      )}
                      <span>
                        状态：
                        {STATUS_LABELS[diagnosis.status] || diagnosis.status}
                      </span>
                      <span>
                        {diagnosis.fullAccess ? "完整报告已解锁" : "免费预览"}
                      </span>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-20 text-center">
              <Icons.ClipboardList className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h2 className="mb-2 text-xl font-semibold">暂无诊断记录</h2>
              <p className="mb-6 text-muted-foreground">
                完成问卷后，诊断记录会保存在这里
              </p>
              <Button asChild>
                <Link href="/diagnosis">开始 NBG 增长诊断</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
