import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

const SUBSCRIPTION_COLORS: Record<string, string> = {
  free: "#94a3b8",
  basic: "#3b82f6",
  professional: "var(--zs-primary)",
  enterprise: "#f59e0b",
};
const SUBSCRIPTION_LABELS: Record<string, string> = {
  free: "免费版",
  basic: "基础版",
  professional: "专业版",
  enterprise: "企业版",
};

function formatYuan(cents: number) {
  return (cents / 100).toLocaleString("zh-CN", { style: "currency", currency: "CNY" });
}

function TrendArrow({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground">-</span>;
  const isUp = value > 0;
  return (
    <span className={`text-xs font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
      {isUp ? "+" : ""}{value}% 周环比
    </span>
  );
}

export default function Admin() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: stats, isLoading: statsLoading } = trpc.admin.stats.overview.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  const { data: dashboard, isLoading: dashboardLoading } = trpc.admin.stats.dashboard.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setTimeout(() => window.location.href = "/login", 0);
    } else if (!authLoading && isAuthenticated && user?.role !== "admin") {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading || statsLoading || dashboardLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  const d = dashboard || {
    users: { total: 0, today: 0, thisWeek: 0, thisMonth: 0, weekOverWeek: 0 },
    conversations: { total: 0, today: 0, thisWeek: 0, thisMonth: 0, weekOverWeek: 0 },
    revenue: { total: 0, today: 0, thisWeek: 0, thisMonth: 0, weekOverWeek: 0 },
    subscriptions: { free: 0, basic: 0, professional: 0, enterprise: 0 },
    dailyTrend: [],
    revenueTrend: [],
    conversionRate: 0,
  };

  // Pie chart data from subscriptions
  const pieData = Object.entries(d.subscriptions)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: SUBSCRIPTION_LABELS[key] || key, value, color: SUBSCRIPTION_COLORS[key] || "#94a3b8" }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-[var(--zs-primary)]">
              管理后台
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">管理员: {user.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-8 space-y-8">
        {/* Core Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总用户</CardTitle>
              <Icons.Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{d.users.total}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">今日 +{d.users.today}</span>
                <TrendArrow value={d.users.weekOverWeek} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总对话</CardTitle>
              <Icons.MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{d.conversations.total}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">今日 +{d.conversations.today}</span>
                <TrendArrow value={d.conversations.weekOverWeek} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">累计收入</CardTitle>
              <Icons.Banknote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatYuan(d.revenue.total)}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">本周 {formatYuan(d.revenue.thisWeek)}</span>
                <TrendArrow value={d.revenue.weekOverWeek} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">付费转化率</CardTitle>
              <Icons.TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{d.conversionRate}%</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-muted-foreground">活跃订阅 {stats?.activeSubscriptions || 0}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">近 7 天用户 & 对话趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={d.dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Area type="monotone" dataKey="newUsers" name="新增用户" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} />
                  <Area type="monotone" dataKey="conversations" name="对话数" stroke="var(--zs-primary)" fill="var(--zs-primary)" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">近 30 天收入趋势</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={d.revenueTrend.map(r => ({ ...r, amount: r.amount / 100 }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v: number) => `¥${v.toLocaleString()}`} />
                  <Area type="monotone" dataKey="amount" name="收入(元)" stroke="#10b981" fill="#10b981" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Subscription Distribution + Quick Navigation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">订阅分布</CardTitle>
            </CardHeader>
            <CardContent>
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">暂无订阅数据</div>
              )}
            </CardContent>
          </Card>

          {/* Management Navigation - compact */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">管理导航</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[
                  { label: "Agent 管理", icon: Icons.Bot, path: "/admin/agents", color: "from-blue-500 to-cyan-500" },
                  { label: "用户管理", icon: Icons.Users, path: "/admin/user-management", color: "from-[var(--zs-primary)] to-[var(--zs-primary-2)]" },
                  { label: "订单管理", icon: Icons.ShoppingCart, path: "/admin/orders", color: "from-green-500 to-emerald-500" },
                  { label: "数据分析", icon: Icons.BarChart3, path: "/admin/analytics", color: "from-amber-500 to-orange-500" },
                  { label: "知识库管理", icon: Icons.Database, path: "/admin/knowledge", color: "from-[var(--zs-primary)] to-[var(--zs-primary-2)]" },
                ].map(item => (
                  <div
                    key={item.path}
                    className="flex items-center gap-3 p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => setLocation(item.path)}
                  >
                    <div className={`w-9 h-9 bg-gradient-to-br ${item.color} rounded-lg flex items-center justify-center shrink-0`}>
                      <item.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-sm font-medium">{item.label}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
