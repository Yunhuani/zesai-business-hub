import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CreditsEvents, trackCredits } from "@/lib/analytics";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { Link } from "wouter";

export function CreditsDisplay() {
  const { data: credits, isLoading } = trpc.credits.get.useQuery(undefined, {
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex h-9 min-w-20 items-center justify-center rounded-full border border-[var(--zs-line)] bg-white/70 px-3">
        <Loader2 className="h-4 w-4 animate-spin text-[var(--zs-primary)]" />
      </div>
    );
  }

  if (!credits) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 gap-1.5 rounded-full border border-[var(--zs-line)] bg-white/80 px-3 font-mono text-[13px] font-semibold text-[var(--zs-primary)] shadow-sm hover:bg-[var(--zs-primary-soft)] sm:gap-2 sm:text-sm"
          aria-label={`查看积分详情，当前 ${credits.total.toLocaleString()} 积分`}
          onClick={() =>
            trackCredits(CreditsEvents.CREDITS_VIEW, credits.total)
          }
        >
          <Sparkles className="h-4 w-4 text-[var(--zs-gold)]" />
          <span>{credits.total.toLocaleString()}</span>
          <span className="hidden font-sans text-xs font-medium text-[var(--zs-sub)] sm:inline">
            积分
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[min(20rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border-[var(--zs-line)] bg-[var(--zs-card)] p-0 shadow-[var(--zs-shadow-large)]"
        align="end"
      >
        <div className="border-b border-[var(--zs-line)] bg-[var(--zs-primary)] px-5 py-4 text-white">
          <p className="text-xs font-medium text-white/70">可用积分</p>
          <p className="mt-1 font-mono text-3xl font-bold tracking-tight">
            {credits.total.toLocaleString()}
          </p>
        </div>

        <div className="space-y-3 px-5 py-4 text-sm">
          {credits.free > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-[var(--zs-sub)]">免费积分</span>
              <span className="font-mono font-semibold">
                {credits.free.toLocaleString()}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-[var(--zs-sub)]">订阅积分</span>
            <span className="font-mono font-semibold">
              {credits.subscription.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[var(--zs-sub)]">购买积分</span>
            <span className="font-mono font-semibold">
              {credits.purchased.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid gap-2 border-t border-[var(--zs-line)] bg-[var(--zs-bg)] p-3">
          <Button asChild className="w-full justify-between rounded-xl">
            <Link href="/pricing">
              升级套餐
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
