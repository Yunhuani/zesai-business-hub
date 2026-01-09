import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

import { APP_LOGO, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatDateTime, formatDate } from "@/lib/dateUtils";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";

/**
 * Credit Usage Page - Manus style
 * Shows detailed credit usage history and subscription info
 */
export default function CreditUsage() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: credits, isLoading: creditsLoading } = trpc.credits.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: subscription } = trpc.credits.subscription.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const [timeUntilReset, setTimeUntilReset] = useState<string>("");

  // Update countdown timer
  useEffect(() => {
    if (!credits?.nextResetIn) return;

    const updateTimer = () => {
      const seconds = credits.nextResetIn;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeUntilReset(`明天 00:00 刷新为 300`);
      } else if (hours > 0) {
        setTimeUntilReset(`今天 ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} 刷新为 300`);
      } else {
        setTimeUntilReset(`${minutes}分钟后刷新为 300`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [credits?.nextResetIn]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setTimeout(() => window.location.href = "/email-login", 0);
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || creditsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // 使用统一的时间格式化工具（北京时间）

  const getPlanName = (plan: string) => {
    const planNames: Record<string, string> = {
      free: "免费版",
      basic: "基础版",
      professional: "专业版",
      enterprise: "企业版",
    };
    return planNames[plan] || plan;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={APP_LOGO} alt="泽思AI" className="h-8 rounded-lg" />
          </Link>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <Icons.User className="w-4 h-4" />
                <span className="text-sm">{user.name || user.email}</span>
              </div>
            )}
            <Link href="/">
              <Button variant="ghost">返回首页</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-8 max-w-5xl">
        {/* Page Title */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">使用情况</h1>
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <Icons.X className="w-5 h-5" />
            </Link>
          </Button>
        </div>

        {/* Subscription Info Card */}
        {subscription && (
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold">{getPlanName(subscription.plan)}</h2>
                <p className="text-sm text-muted-foreground">
                  续费日期: {formatDate(subscription.endDate).split(' ')[0]}
                </p>
              </div>
              <div className="flex gap-2">
                <Link href="/pricing">
                  <Button variant="outline" size="sm">
                    管理
                  </Button>
                </Link>
                <Link href="/credits">
                  <Button size="sm">
                    获得积分
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Credits Overview */}
        {credits && (
          <Card className="p-6 mb-6">
            <div className="space-y-4">
              {/* Total Credits */}
              <div className="flex items-center justify-between pb-4 border-b">
                <div className="flex items-center gap-2">
                  <Icons.Sparkles className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">积分</span>
                  <Icons.HelpCircle className="w-4 h-4 text-muted-foreground" />
                </div>
                <span className="text-2xl font-bold">{credits.total.toLocaleString()}</span>
              </div>

              {/* Free Credits */}
              {credits.free > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">免费积分</span>
                  <span className="font-medium">{credits.free.toLocaleString()}</span>
                </div>
              )}

              {/* Monthly Credits */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">每月积分</span>
                <span className="font-medium">{credits.subscription.toLocaleString()}</span>
              </div>

              {/* Purchased Credits */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">购买积分</span>
                <span className="font-medium">{credits.purchased.toLocaleString()}</span>
              </div>

              {/* Daily Reset */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icons.RotateCw className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium">每日刷新积分</span>
                  </div>
                  <span className="text-lg font-bold">0</span>
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  {timeUntilReset || "计算中..."}
                </div>
              </div>
            </div>
          </Card>
        )}


      </div>
    </div>
  );
}
