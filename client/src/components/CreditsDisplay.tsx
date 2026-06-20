import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trackCredits, CreditsEvents } from "@/lib/analytics";

/**
 * Credits Display Component - Manus style
 * Shows credits in header with popover details
 */
export function CreditsDisplay() {
  const { data: credits, isLoading } = trpc.credits.get.useQuery(undefined, {
    refetchInterval: 30000, // Refresh every 30 seconds
  });
  const [timeUntilReset, setTimeUntilReset] = useState<string>("");

  // Update countdown timer
  useEffect(() => {
    if (!credits?.nextResetIn) return;

    const updateTimer = () => {
      const seconds = credits.nextResetIn;
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;

      if (hours > 24) {
        const days = Math.floor(hours / 24);
        setTimeUntilReset(`${days}天后刷新`);
      } else if (hours > 0) {
        setTimeUntilReset(`${hours}小时后刷新`);
      } else if (minutes > 0) {
        setTimeUntilReset(`${minutes}分钟后刷新`);
      } else {
        setTimeUntilReset(`${secs}秒后刷新`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [credits?.nextResetIn]);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md">
        <Icons.Loader2 className="w-4 h-4 animate-spin" />
      </div>
    );
  }

  if (!credits) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button 
          variant="ghost" 
          className="gap-2 font-mono"
          onClick={() => trackCredits(CreditsEvents.CREDITS_VIEW, credits?.total || 0)}
        >
          <Icons.Sparkles className="w-4 h-4" />
          {credits.total.toLocaleString()}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <Card className="border-0 shadow-lg">
          {/* Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icons.Sparkles className="w-5 h-5 text-blue-600" />
              <span className="font-semibold">积分</span>
            </div>
            <Link href="/credits">
              <Button size="sm" variant="default">
                获得积分
              </Button>
            </Link>
          </div>

          {/* Credits Breakdown */}
          <div className="p-4 space-y-3">
            {/* Total Credits */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icons.Sparkles className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">积分</span>
                <Icons.HelpCircle className="w-3 h-3 text-muted-foreground" />
              </div>
              <span className="text-lg font-bold">{credits.total.toLocaleString()}</span>
            </div>

            {/* Free Credits */}
            {credits.free > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">免费积分</span>
                <span>{credits.free.toLocaleString()}</span>
              </div>
            )}

            {/* Monthly Credits */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">每月积分</span>
              <span>{credits.subscription.toLocaleString()}</span>
            </div>

            {/* Purchased Credits */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">购买积分</span>
              <span>{credits.purchased.toLocaleString()}</span>
            </div>

            {/* Daily Reset */}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icons.RotateCw className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">每日刷新积分</span>
                </div>
                <span className="text-sm font-medium">0</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {timeUntilReset || "计算中..."}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-3 border-t bg-muted/50">
            <Link href="/credit-usage">
              <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                <Icons.FileText className="w-4 h-4" />
                查看使用情况
              </Button>
            </Link>
          </div>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
