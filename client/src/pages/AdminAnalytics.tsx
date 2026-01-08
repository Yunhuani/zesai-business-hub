import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

// 热度标签组件
function HeatTag({ tag }: { tag: string }) {
  const tagConfig: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    hot: { label: "热门", className: "bg-red-100 text-red-700", icon: <Icons.Flame className="w-3 h-3" /> },
    rising: { label: "上升", className: "bg-green-100 text-green-700", icon: <Icons.TrendingUp className="w-3 h-3" /> },
    falling: { label: "下降", className: "bg-orange-100 text-orange-700", icon: <Icons.TrendingDown className="w-3 h-3" /> },
    cold: { label: "冷门", className: "bg-gray-100 text-gray-600", icon: <Icons.Snowflake className="w-3 h-3" /> },
    normal: { label: "正常", className: "bg-blue-100 text-blue-700", icon: null },
  };
  const config = tagConfig[tag] || tagConfig.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  );
}

// 顾问热度排行Tab内容
function AgentHeatRanking() {
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "all">("week");
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);

  const { data: rankingData, isLoading: rankingLoading } = trpc.admin.agentAnalytics.getAgentRanking.useQuery(
    { timeRange },
    { refetchOnWindowFocus: false }
  );

  const { data: trendData, isLoading: trendLoading } = trpc.admin.agentAnalytics.getAgentTrend.useQuery(
    undefined,
    { refetchOnWindowFocus: false }
  );

  const { data: agentDetail, isLoading: detailLoading } = trpc.admin.agentAnalytics.getAgentDetail.useQuery(
    { agentId: expandedAgentId! },
    { enabled: !!expandedAgentId, refetchOnWindowFocus: false }
  );

  const timeRangeLabels: Record<string, string> = {
    today: "今日",
    week: "本周",
    month: "本月",
    all: "全部时间",
  };

  if (rankingLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 时间筛选器 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icons.Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">时间范围：</span>
          <Select value={timeRange} onValueChange={(v) => setTimeRange(v as typeof timeRange)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="week">本周</SelectItem>
              <SelectItem value="month">本月</SelectItem>
              <SelectItem value="all">全部时间</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-muted-foreground">
          总对话数：<span className="font-semibold text-foreground">{rankingData?.totalConversations || 0}</span>
        </div>
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">热门顾问</CardTitle>
            <Icons.Flame className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {rankingData?.agents.filter(a => a.heatTag === "hot").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">TOP3顾问</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">活跃顾问</CardTitle>
            <Icons.Activity className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {rankingData?.agents.filter(a => a.conversationCount > 0).length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">有对话记录</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">冷门顾问</CardTitle>
            <Icons.Snowflake className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {rankingData?.agents.filter(a => a.heatTag === "cold").length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">对话&lt;10次</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均轮次</CardTitle>
            <Icons.MessageCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {rankingData?.agents.length
                ? (rankingData.agents.reduce((sum, a) => sum + a.avgRounds, 0) / rankingData.agents.length).toFixed(1)
                : 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">每次对话消息数</p>
          </CardContent>
        </Card>
      </div>

      {/* 排行榜表格 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Icons.Trophy className="w-5 h-5 text-amber-500" />
            顾问热度排行榜
          </CardTitle>
          <CardDescription>{timeRangeLabels[timeRange]}数据统计</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">排名</TableHead>
                <TableHead>顾问名称</TableHead>
                <TableHead className="text-right">对话数</TableHead>
                <TableHead className="text-right">消息数</TableHead>
                <TableHead className="text-right">使用人数</TableHead>
                <TableHead className="text-right">平均轮次</TableHead>
                <TableHead className="text-right">使用占比</TableHead>
                <TableHead className="text-center">热度</TableHead>
                <TableHead className="w-20">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankingData?.agents.map((agent) => (
                <>
                  <TableRow
                    key={agent.id}
                    className={`cursor-pointer hover:bg-muted/50 ${agent.rank <= 3 ? "bg-amber-50/50" : ""}`}
                    onClick={() => setExpandedAgentId(expandedAgentId === agent.id ? null : agent.id)}
                  >
                    <TableCell>
                      <span className={`font-bold ${agent.rank === 1 ? "text-amber-500 text-lg" : agent.rank === 2 ? "text-gray-400" : agent.rank === 3 ? "text-amber-700" : ""}`}>
                        #{agent.rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{agent.icon}</span>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-semibold">{agent.conversationCount}</TableCell>
                    <TableCell className="text-right">{agent.messageCount}</TableCell>
                    <TableCell className="text-right">{agent.uniqueUsers}</TableCell>
                    <TableCell className="text-right">{agent.avgRounds}轮</TableCell>
                    <TableCell className="text-right">{agent.usagePercent}%</TableCell>
                    <TableCell className="text-center">
                      <HeatTag tag={agent.heatTag} />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        {expandedAgentId === agent.id ? (
                          <Icons.ChevronUp className="w-4 h-4" />
                        ) : (
                          <Icons.ChevronDown className="w-4 h-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {/* 展开详情 */}
                  {expandedAgentId === agent.id && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/30 p-4">
                        {detailLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : agentDetail ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-muted-foreground">累计数据</h4>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div>总对话数：<span className="font-semibold">{agentDetail.stats.total.conversations}</span></div>
                                <div>总消息数：<span className="font-semibold">{agentDetail.stats.total.messages}</span></div>
                                <div>使用人数：<span className="font-semibold">{agentDetail.stats.total.uniqueUsers}</span></div>
                                <div>平均轮次：<span className="font-semibold">{agentDetail.stats.total.avgRounds}轮</span></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-muted-foreground">时间对比</h4>
                              <div className="grid grid-cols-1 gap-1 text-sm">
                                <div>今日对话：<span className="font-semibold">{agentDetail.stats.today.conversations}</span></div>
                                <div>本周对话：<span className="font-semibold">{agentDetail.stats.week.conversations}</span></div>
                                <div>本月对话：<span className="font-semibold">{agentDetail.stats.month.conversations}</span></div>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-semibold text-sm text-muted-foreground">用户分析</h4>
                              <div className="text-sm">
                                <div>新用户首选率：<span className="font-semibold">{agentDetail.stats.newUserRate}%</span></div>
                                <p className="text-xs text-muted-foreground mt-1">首次使用该顾问的用户占比</p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 7天趋势图（简化版，用表格展示TOP5） */}
      {!trendLoading && trendData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Icons.TrendingUp className="w-5 h-5 text-green-500" />
              最近7天趋势 TOP5
            </CardTitle>
            <CardDescription>对话数最多的5个顾问</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>顾问</TableHead>
                  {trendData.dates.map((date) => (
                    <TableHead key={date} className="text-center text-xs">
                      {new Date(date).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" })}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">7天总计</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trendData.top5Agents.map((agent) => (
                  <TableRow key={agent.id}>
                    <TableCell className="font-medium">{agent.name}</TableCell>
                    {trendData.dates.map((date, idx) => {
                      const dayData = trendData.trendData[idx];
                      const count = dayData?.[`agent_${agent.id}`] || 0;
                      return (
                        <TableCell key={date} className="text-center">
                          <span className={count > 0 ? "font-semibold text-blue-600" : "text-gray-400"}>
                            {count}
                          </span>
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right font-bold text-green-600">{agent.last7Days}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 支付失败监控Tab内容
function PaymentFailureMonitor({ failedOrders }: { failedOrders: any[] }) {
  const totalFailedOrders = failedOrders?.length || 0;
  const totalFailedAmount = failedOrders?.reduce((sum, order) => sum + order.amount, 0) || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">失败订单数</CardTitle>
            <Icons.XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{totalFailedOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">超过30分钟未支付</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">潜在损失金额</CardTitle>
            <Icons.DollarSign className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">¥{(totalFailedAmount / 100).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">未完成支付总额</p>
          </CardContent>
        </Card>
      </div>

      {totalFailedOrders > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>失败订单列表</CardTitle>
            <CardDescription>超过30分钟未支付的订单</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>订单号</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>套餐</TableHead>
                  <TableHead>金额</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {failedOrders?.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.outTradeNo}</TableCell>
                    <TableCell>
                      {order.user?.name || order.user?.email || `用户${order.userId}`}
                    </TableCell>
                    <TableCell>{order.plan}</TableCell>
                    <TableCell>¥{(order.amount / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-xs">
                      {new Date(order.createdAt).toLocaleString('zh-CN')}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                        待支付
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 用户访问频次Tab内容
function UserAccessFrequency({ accessStats }: { accessStats: any[] }) {
  const highFrequencyUsers = accessStats?.filter(s => (s.totalAccess as number) >= 10) || [];
  const lowFrequencyUsers = accessStats?.filter(s => (s.totalAccess as number) > 0 && (s.totalAccess as number) < 3) || [];
  const dormantUsers = accessStats?.filter(s => (s.totalAccess as number) === 0) || [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">高频用户</CardTitle>
            <Icons.TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{highFrequencyUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">访问≥10次</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">低频用户</CardTitle>
            <Icons.TrendingDown className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{lowFrequencyUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">访问1-2次</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">沉睡用户</CardTitle>
            <Icons.Moon className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">{dormantUsers.length}</div>
            <p className="text-xs text-muted-foreground mt-1">注册后未使用</p>
          </CardContent>
        </Card>
      </div>

      {highFrequencyUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>高频用户 TOP 20</CardTitle>
            <CardDescription>访问次数最多的活跃用户</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>排名</TableHead>
                  <TableHead>用户</TableHead>
                  <TableHead>总访问次数</TableHead>
                  <TableHead>首次访问</TableHead>
                  <TableHead>最后访问</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highFrequencyUsers.slice(0, 20).map((stat, index) => (
                  <TableRow key={stat.userId}>
                    <TableCell className="font-semibold">#{index + 1}</TableCell>
                    <TableCell>
                      {stat.userName || stat.userEmail || `用户${stat.userId}`}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 font-semibold">
                        {stat.totalAccess as number} 次
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {stat.firstAccess ? new Date(stat.firstAccess as string).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {stat.lastAccess ? new Date(stat.lastAccess as string).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {lowFrequencyUsers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>低频用户预警</CardTitle>
            <CardDescription>注册后访问次数少于3次的用户，需要召回</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>用户</TableHead>
                  <TableHead>访问次数</TableHead>
                  <TableHead>首次访问</TableHead>
                  <TableHead>最后访问</TableHead>
                  <TableHead>状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowFrequencyUsers.slice(0, 50).map((stat) => (
                  <TableRow key={stat.userId}>
                    <TableCell>
                      {stat.userName || stat.userEmail || `用户${stat.userId}`}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-amber-100 text-amber-800">
                        {stat.totalAccess as number} 次
                      </span>
                    </TableCell>
                    <TableCell className="text-xs">
                      {stat.firstAccess ? new Date(stat.firstAccess as string).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell className="text-xs">
                      {stat.lastAccess ? new Date(stat.lastAccess as string).toLocaleDateString('zh-CN') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-amber-600">需要召回</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState("agent-heat");
  
  const { data: failedOrders, isLoading: failedOrdersLoading } = trpc.admin.getFailedOrders.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });
  
  const { data: accessStats, isLoading: accessStatsLoading } = trpc.admin.getUserAccessStats.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const [testingSentry, setTestingSentry] = useState(false);
  const testSentryMutation = trpc.sentry.testError.useMutation({
    onSuccess: () => {
      toast.success("Sentry测试错误已触发", {
        description: "请前往Sentry后台查看错误报告",
      });
      setTestingSentry(false);
    },
    onError: (error) => {
      toast.success("Sentry测试完成", {
        description: `测试错误已发送：${error.message}。请前往Sentry后台查看。`,
      });
      setTestingSentry(false);
    },
  });

  const handleTestSentry = () => {
    setTestingSentry(true);
    testSentryMutation.mutate();
  };

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setTimeout(() => window.location.href = "/email-login", 0);
    } else if (!authLoading && isAuthenticated && user?.role !== "admin") {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              数据分析
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestSentry}
              disabled={testingSentry}
            >
              {testingSentry ? (
                <>
                  <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  测试中...
                </>
              ) : (
                <>
                  <Icons.Bug className="w-4 h-4 mr-2" />
                  测试Sentry
                </>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">管理员: {user.name}</span>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid">
            <TabsTrigger value="agent-heat" className="flex items-center gap-2">
              <Icons.Flame className="w-4 h-4" />
              <span className="hidden sm:inline">顾问热度排行</span>
              <span className="sm:hidden">热度</span>
            </TabsTrigger>
            <TabsTrigger value="payment-failure" className="flex items-center gap-2">
              <Icons.AlertTriangle className="w-4 h-4" />
              <span className="hidden sm:inline">支付失败监控</span>
              <span className="sm:hidden">支付</span>
            </TabsTrigger>
            <TabsTrigger value="user-access" className="flex items-center gap-2">
              <Icons.Activity className="w-4 h-4" />
              <span className="hidden sm:inline">用户访问频次</span>
              <span className="sm:hidden">访问</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agent-heat">
            <AgentHeatRanking />
          </TabsContent>

          <TabsContent value="payment-failure">
            {failedOrdersLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <PaymentFailureMonitor failedOrders={failedOrders || []} />
            )}
          </TabsContent>

          <TabsContent value="user-access">
            {accessStatsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <UserAccessFrequency accessStats={accessStats || []} />
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
