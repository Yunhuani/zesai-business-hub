import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { Loader2, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";

export default function OrderManagement() {
  const { user, loading: authLoading } = useAuth();
  const { data: orders, isLoading, refetch } = trpc.order.list.useQuery(undefined, {
    enabled: !!user && user.role === "admin",
  });

  useEffect(() => {
    document.title = `订单管理 - ${APP_TITLE}`;
  }, []);

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
          <p className="text-muted-foreground mb-4">仅管理员可访问订单管理页面</p>
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      paid: "default",
      pending: "secondary",
      cancelled: "destructive",
      refunded: "outline",
    };
    const labels: Record<string, string> = {
      paid: "已支付",
      pending: "待支付",
      cancelled: "已取消",
      refunded: "已退款",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getPlanName = (plan: string) => {
    const names: Record<string, string> = {
      free: "免费版",
      basic: "基础版",
      professional: "专业版",
      enterprise: "企业版",
      pack_300: "300积分包",
      pack_1200: "1200积分包",
      pack_3000: "3000积分包",
    };
    return names[plan] || plan;
  };

  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatAmount = (amount: number) => {
    return `¥${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost">← 返回管理后台</Button>
            </Link>
            <h1 className="text-2xl font-bold">订单管理</h1>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </header>

      <div className="container py-8">
        <Card className="p-6">
          {!orders || orders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>暂无订单记录</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>订单号</TableHead>
                    <TableHead>用户信息</TableHead>
                    <TableHead>套餐</TableHead>
                    <TableHead>金额</TableHead>
                    <TableHead>支付方式</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>创建时间（北京时间）</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.map((order: any) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">
                        {order.outTradeNo}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{order.userName || "未知用户"}</span>
                          <span className="text-xs text-muted-foreground">{order.userEmail || `ID: ${order.userId}`}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getPlanName(order.plan)}</TableCell>
                      <TableCell className="font-semibold">
                        {formatAmount(order.amount)}
                      </TableCell>
                      <TableCell>
                        {order.paymentMethod === "alipay" ? "支付宝" : order.paymentMethod}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(order.createdAt)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        <div className="mt-6 text-sm text-muted-foreground">
          <p>共 {orders?.length || 0} 条订单记录</p>
        </div>
      </div>
    </div>
  );
}
