import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  CircleAlert,
  Clock3,
  Inbox,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const PAGE_SIZE = 20;

type DiagnosisStatus = "pending" | "running" | "done" | "error";
type DiagnosisFilter = "all" | DiagnosisStatus;

const STATUS_LABELS: Record<DiagnosisStatus, string> = {
  pending: "等待中",
  running: "生成中",
  done: "已完成",
  error: "失败",
};

function formatDate(value: string | Date | null) {
  if (!value) return "—";
  return new Date(value).toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StatusBadge({ status }: { status: DiagnosisStatus }) {
  const variant =
    status === "done"
      ? "default"
      : status === "error"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{STATUS_LABELS[status]}</Badge>;
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 break-words text-sm">{value ?? "—"}</div>
    </div>
  );
}

export default function DiagnosisManagement() {
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] =
    useState<DiagnosisFilter>("all");
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [page, setPage] = useState(0);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState<any>(null);
  const isAdmin = !!user && user.role === "admin";

  const listInput = {
    status: statusFilter === "all" ? undefined : statusFilter,
    keyword: appliedKeyword || undefined,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const {
    data,
    isLoading,
    refetch: refetchList,
  } = trpc.admin.listDiagnoses.useQuery(listInput, {
    enabled: isAdmin,
  });
  const { data: allStats, refetch: refetchAllStats } =
    trpc.admin.listDiagnoses.useQuery(
      { limit: 1, offset: 0 },
      { enabled: isAdmin }
    );
  const { data: pendingStats, refetch: refetchPendingStats } =
    trpc.admin.listDiagnoses.useQuery(
      { status: "pending", limit: 1, offset: 0 },
      { enabled: isAdmin }
    );
  const { data: runningStats, refetch: refetchRunningStats } =
    trpc.admin.listDiagnoses.useQuery(
      { status: "running", limit: 1, offset: 0 },
      { enabled: isAdmin }
    );
  const { data: doneStats, refetch: refetchDoneStats } =
    trpc.admin.listDiagnoses.useQuery(
      { status: "done", limit: 1, offset: 0 },
      { enabled: isAdmin }
    );
  const { data: errorStats, refetch: refetchErrorStats } =
    trpc.admin.listDiagnoses.useQuery(
      { status: "error", limit: 1, offset: 0 },
      { enabled: isAdmin }
    );

  const retryDiagnosis = trpc.admin.retryDiagnosis.useMutation({
    onSuccess: async () => {
      setSelectedDiagnosis(null);
      await handleRefresh();
      toast.success("诊断已重新运行");
    },
    onError: error => {
      toast.error("重新运行失败", { description: error.message });
    },
  });

  useEffect(() => {
    document.title = `诊断管理 - ${APP_TITLE}`;
  }, []);

  const handleSearch = () => {
    setAppliedKeyword(keyword.trim());
    setPage(0);
  };

  const handleRefresh = async () => {
    await Promise.all([
      refetchList(),
      refetchAllStats(),
      refetchPendingStats(),
      refetchRunningStats(),
      refetchDoneStats(),
      refetchErrorStats(),
    ]);
  };

  const handleRetry = (diagnosisId: number) => {
    if (!window.confirm(`确认重新运行诊断 #${diagnosisId}？`)) return;
    retryDiagnosis.mutate({ diagnosisId });
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">权限不足</h1>
          <p className="text-muted-foreground mb-4">
            仅管理员可访问诊断管理页面
          </p>
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const processingTotal =
    (pendingStats?.total ?? 0) + (runningStats?.total ?? 0);
  const statisticCards = [
    {
      label: "总数",
      value: allStats?.total ?? 0,
      icon: Inbox,
      color: "text-blue-600",
    },
    {
      label: "处理中",
      value: processingTotal,
      icon: Clock3,
      color: "text-amber-600",
    },
    {
      label: "已完成",
      value: doneStats?.total ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      label: "失败",
      value: errorStats?.total ?? 0,
      icon: CircleAlert,
      color: "text-red-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost">← 返回管理后台</Button>
            </Link>
            <h1 className="text-2xl font-bold">诊断管理</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </header>

      <div className="container py-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statisticCards.map(card => {
            const Icon = card.icon;
            return (
              <Card key={card.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {card.label}
                  </CardTitle>
                  <Icon className={`h-4 w-4 ${card.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className="p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select
                value={statusFilter}
                onValueChange={value => {
                  setStatusFilter(value as DiagnosisFilter);
                  setPage(0);
                }}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部状态</SelectItem>
                  <SelectItem value="pending">等待中</SelectItem>
                  <SelectItem value="running">生成中</SelectItem>
                  <SelectItem value="done">已完成</SelectItem>
                  <SelectItem value="error">失败</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Input
                  value={keyword}
                  onChange={event => setKeyword(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === "Enter") handleSearch();
                  }}
                  placeholder="诊断 ID / 用户邮箱 / 姓名"
                  className="w-72"
                />
                <Button variant="outline" onClick={handleSearch}>
                  <Search className="w-4 h-4 mr-2" />
                  搜索
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                共 {data?.total ?? 0} 条
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage(current => Math.max(0, current - 1))}
              >
                上一页
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={(page + 1) * PAGE_SIZE >= (data?.total ?? 0)}
                onClick={() => setPage(current => current + 1)}
              >
                下一页
              </Button>
            </div>
          </div>

          {!data?.items.length ? (
            <div className="text-center py-12 text-muted-foreground">
              暂无诊断记录
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>用户</TableHead>
                    <TableHead>类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>评分</TableHead>
                    <TableHead>重试</TableHead>
                    <TableHead>完整报告扣费</TableHead>
                    <TableHead>PDF</TableHead>
                    <TableHead>创建时间</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map(diagnosis => (
                    <TableRow key={diagnosis.id}>
                      <TableCell className="font-mono">
                        {diagnosis.id}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{diagnosis.userName || "未知用户"}</span>
                          <span className="text-xs text-muted-foreground">
                            {diagnosis.userEmail || `ID: ${diagnosis.userId}`}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {diagnosis.productType === "full" ? "完整" : "预览"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={diagnosis.status} />
                      </TableCell>
                      <TableCell>
                        {diagnosis.overallScore ?? "—"}
                        {diagnosis.scoreLabel
                          ? ` / ${diagnosis.scoreLabel}`
                          : ""}
                      </TableCell>
                      <TableCell>{diagnosis.retryCount}/3</TableCell>
                      <TableCell>
                        {diagnosis.fullCreditsDeducted || "—"}
                      </TableCell>
                      <TableCell>
                        {diagnosis.pdfPurchased
                          ? `已购 (${diagnosis.pdfCreditsDeducted})`
                          : "未购"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(diagnosis.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedDiagnosis(diagnosis)}
                          >
                            详情
                          </Button>
                          {diagnosis.status === "done" ? (
                            <Button variant="outline" size="sm" asChild>
                              <Link
                                href={`/diagnosis/${diagnosis.id}/report?admin=1`}
                              >
                                查看报告
                              </Link>
                            </Button>
                          ) : null}
                          {diagnosis.status === "error" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={retryDiagnosis.isPending}
                              onClick={() => handleRetry(diagnosis.id)}
                            >
                              <RotateCcw className="w-4 h-4 mr-1" />
                              重新运行
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <Dialog
        open={!!selectedDiagnosis}
        onOpenChange={open => {
          if (!open) setSelectedDiagnosis(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              诊断详情 #{selectedDiagnosis?.id}
            </DialogTitle>
          </DialogHeader>
          {selectedDiagnosis ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <DetailField
                  label="用户"
                  value={`${selectedDiagnosis.userName || "未知用户"}（${selectedDiagnosis.userEmail || selectedDiagnosis.userId}）`}
                />
                <DetailField
                  label="状态"
                  value={<StatusBadge status={selectedDiagnosis.status} />}
                />
                <DetailField
                  label="产品类型"
                  value={
                    selectedDiagnosis.productType === "full"
                      ? "完整报告"
                      : "预览报告"
                  }
                />
                <DetailField
                  label="评分"
                  value={`${selectedDiagnosis.overallScore ?? "—"}${selectedDiagnosis.scoreLabel ? ` / ${selectedDiagnosis.scoreLabel}` : ""}`}
                />
                <DetailField
                  label="重试次数"
                  value={`${selectedDiagnosis.retryCount}/3`}
                />
                <DetailField
                  label="完整报告扣费"
                  value={selectedDiagnosis.fullCreditsDeducted}
                />
                <DetailField
                  label="PDF 权益"
                  value={
                    selectedDiagnosis.pdfPurchased
                      ? `已购买，扣费 ${selectedDiagnosis.pdfCreditsDeducted}`
                      : "未购买"
                  }
                />
                <DetailField
                  label="创建时间"
                  value={formatDate(selectedDiagnosis.createdAt)}
                />
                <DetailField
                  label="更新时间"
                  value={formatDate(selectedDiagnosis.updatedAt)}
                />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">报告标题</p>
                <p className="mt-1 text-sm">
                  {selectedDiagnosis.headline || "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">完整错误信息</p>
                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-xs">
                  {selectedDiagnosis.errorMessage || "—"}
                </pre>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedDiagnosis(null)}
            >
              关闭
            </Button>
            {selectedDiagnosis?.status === "done" ? (
              <Button asChild>
                <Link
                  href={`/diagnosis/${selectedDiagnosis.id}/report?admin=1`}
                >
                  查看报告
                </Link>
              </Button>
            ) : null}
            {selectedDiagnosis?.status === "error" ? (
              <Button
                disabled={retryDiagnosis.isPending}
                onClick={() => handleRetry(selectedDiagnosis.id)}
              >
                {retryDiagnosis.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="w-4 h-4 mr-2" />
                )}
                重新运行
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
