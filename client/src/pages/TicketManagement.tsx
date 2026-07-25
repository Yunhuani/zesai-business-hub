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
import { Label } from "@/components/ui/label";
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
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  Clock3,
  Inbox,
  Loader2,
  RefreshCw,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

const PAGE_SIZE = 20;

type TicketStatus = "pending" | "resolved";
type TicketFilter = "all" | TicketStatus;

const ISSUE_TYPE_LABELS: Record<string, string> = {
  technical: "技术问题",
  account: "账户问题",
  payment: "支付问题",
  feature: "功能建议",
  other: "其他问题",
};

export default function TicketManagement() {
  const { user, loading: authLoading } = useAuth();
  const [statusFilter, setStatusFilter] = useState<TicketFilter>("all");
  const [page, setPage] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [status, setStatus] = useState<TicketStatus>("pending");
  const [internalNotes, setInternalNotes] = useState("");
  const isAdmin = !!user && user.role === "admin";

  const {
    data: statistics,
    isLoading: statisticsLoading,
    refetch: refetchStatistics,
  } = trpc.support.getStatistics.useQuery(undefined, {
    enabled: isAdmin,
  });
  const {
    data: tickets,
    isLoading: ticketsLoading,
    refetch: refetchTickets,
  } = trpc.support.listTickets.useQuery(
    {
      status: statusFilter === "all" ? undefined : statusFilter,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    {
      enabled: isAdmin,
    }
  );

  const updateTicket = trpc.support.updateTicketStatus.useMutation({
    onSuccess: async () => {
      await Promise.all([refetchTickets(), refetchStatistics()]);
      setSelectedTicket(null);
      toast.success("工单已更新");
    },
    onError: error => {
      toast.error("保存失败", { description: error.message });
    },
  });

  useEffect(() => {
    document.title = `工单管理 - ${APP_TITLE}`;
  }, []);

  const openTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    setStatus(ticket.status);
    setInternalNotes(ticket.internalNotes ?? "");
  };

  const handleFilterChange = (value: TicketFilter) => {
    setStatusFilter(value);
    setPage(0);
  };

  const handleRefresh = () => {
    void Promise.all([refetchTickets(), refetchStatistics()]);
  };

  const handleSave = () => {
    if (!selectedTicket) return;

    updateTicket.mutate({
      ticketId: selectedTicket.id,
      status,
      internalNotes,
    });
  };

  const formatDate = (date: string | Date | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (authLoading || statisticsLoading || ticketsLoading) {
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
            仅管理员可访问工单管理页面
          </p>
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const total = (statistics?.pending ?? 0) + (statistics?.resolved ?? 0);
  const statisticCards = [
    { label: "总数", value: total, icon: Inbox, color: "text-blue-600" },
    {
      label: "待处理",
      value: statistics?.pending ?? 0,
      icon: Clock3,
      color: "text-amber-600",
    },
    {
      label: "已解决",
      value: statistics?.resolved ?? 0,
      icon: CheckCircle2,
      color: "text-green-600",
    },
    {
      label: "今日",
      value: statistics?.today ?? 0,
      icon: Sun,
      color: "text-orange-600",
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
            <h1 className="text-2xl font-bold">工单管理</h1>
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
            <Select
              value={statusFilter}
              onValueChange={value =>
                handleFilterChange(value as TicketFilter)
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-2">
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
                disabled={!tickets || tickets.length < PAGE_SIZE}
                onClick={() => setPage(current => current + 1)}
              >
                下一页
              </Button>
            </div>
          </div>

          {!tickets || tickets.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>暂无工单记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>提交人</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>微信</TableHead>
                    <TableHead>问题类型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间（北京时间）</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tickets.map(ticket => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-mono">{ticket.id}</TableCell>
                      <TableCell>{ticket.userName}</TableCell>
                      <TableCell>{ticket.userEmail}</TableCell>
                      <TableCell>{ticket.wechat}</TableCell>
                      <TableCell>
                        {ISSUE_TYPE_LABELS[ticket.issueType] ?? ticket.issueType}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            ticket.status === "resolved"
                              ? "default"
                              : "secondary"
                          }
                        >
                          {ticket.status === "resolved" ? "已解决" : "待处理"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(ticket.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openTicket(ticket)}
                        >
                          详情
                        </Button>
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
        open={!!selectedTicket}
        onOpenChange={open => {
          if (!open) setSelectedTicket(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>工单详情 #{selectedTicket?.id}</DialogTitle>
          </DialogHeader>

          {selectedTicket ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <DetailField label="用户 ID" value={selectedTicket.userId} />
                <DetailField label="提交人" value={selectedTicket.userName} />
                <DetailField label="邮箱" value={selectedTicket.userEmail} />
                <DetailField label="微信" value={selectedTicket.wechat} />
                <DetailField
                  label="问题类型"
                  value={
                    ISSUE_TYPE_LABELS[selectedTicket.issueType] ??
                    selectedTicket.issueType
                  }
                />
                <DetailField
                  label="附件"
                  value={
                    selectedTicket.attachmentUrl ? (
                      <a
                        href={selectedTicket.attachmentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                      >
                        查看附件
                      </a>
                    ) : (
                      "—"
                    )
                  }
                />
                <DetailField
                  label="创建时间"
                  value={formatDate(selectedTicket.createdAt)}
                />
                <DetailField
                  label="更新时间"
                  value={formatDate(selectedTicket.updatedAt)}
                />
                <DetailField
                  label="解决时间"
                  value={formatDate(selectedTicket.resolvedAt)}
                />
              </div>

              <div className="space-y-2">
                <Label>问题描述</Label>
                <div className="whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                  {selectedTicket.description}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-status">状态</Label>
                <Select
                  value={status}
                  onValueChange={value => setStatus(value as TicketStatus)}
                >
                  <SelectTrigger id="ticket-status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">待处理</SelectItem>
                    <SelectItem value="resolved">已解决</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ticket-internal-notes">内部备注</Label>
                <Textarea
                  id="ticket-internal-notes"
                  value={internalNotes}
                  onChange={event => setInternalNotes(event.target.value)}
                  rows={5}
                  placeholder="填写仅管理员可见的处理备注"
                />
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedTicket(null)}
              disabled={updateTicket.isPending}
            >
              取消
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateTicket.isPending || !selectedTicket}
            >
              {updateTicket.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
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
      <div className="text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-medium">{value ?? "—"}</div>
    </div>
  );
}
