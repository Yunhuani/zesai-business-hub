import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminAnalytics() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  
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
      // 预期会有错误，这是正常的
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
      setTimeout(() => window.location.href = getLoginUrl(), 0);
    } else if (!authLoading && isAuthenticated && user?.role !== "admin") {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading || failedOrdersLoading || accessStatsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  // Calculate stats
  const totalFailedOrders = failedOrders?.length || 0;
  const totalFailedAmount = failedOrders?.reduce((sum, order) => sum + order.amount, 0) || 0;
  
  // Categorize users by access frequency
  const highFrequencyUsers = accessStats?.filter(s => (s.totalAccess as number) >= 10) || [];
  const lowFrequencyUsers = accessStats?.filter(s => (s.totalAccess as number) > 0 && (s.totalAccess as number) < 3) || [];
  const dormantUsers = accessStats?.filter(s => (s.totalAccess as number) === 0) || [];

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

      <div className="container py-8 space-y-8">
        {/* Payment Failure Stats */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Icons.AlertTriangle className="w-5 h-5 text-amber-500" />
            支付失败监控
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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

        {/* User Access Frequency */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Icons.Activity className="w-5 h-5 text-blue-500" />
            用户访问频次分析
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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

          {/* High Frequency Users Table */}
          {highFrequencyUsers.length > 0 && (
            <Card className="mb-6">
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

          {/* Low Frequency Users Table */}
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
      </div>
    </div>
  );
}
