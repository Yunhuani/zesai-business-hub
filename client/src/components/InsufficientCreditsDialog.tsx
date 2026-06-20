import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { trackCredits, CreditsEvents } from "@/lib/analytics";
import { useEffect } from "react";

interface InsufficientCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isFreeUser?: boolean; // 是否为免费版用户
}

export function InsufficientCreditsDialog({ open, onOpenChange, isFreeUser = false }: InsufficientCreditsDialogProps) {
  const [, setLocation] = useLocation();

  // 追踪积分不足事件
  useEffect(() => {
    if (open) {
      trackCredits(CreditsEvents.CREDITS_INSUFFICIENT, 0, {
        is_free_user: isFreeUser ? 1 : 0,
      });
    }
  }, [open, isFreeUser]);

  const handleUpgrade = () => {
    onOpenChange(false);
    setLocation("/pricing");
  };

  const handlePurchase = () => {
    onOpenChange(false);
    setLocation("/credits");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <DialogTitle>积分已用完</DialogTitle>
          </div>
          <DialogDescription className="pt-4">
            您的积分余额不足，无法继续对话。
            <br />
            <br />
            {isFreeUser ? (
              <>请升级到付费套餐以继续使用：</>
            ) : (
              <>请选择以下方式继续使用：</>
            )}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={handleUpgrade} className="w-full sm:w-auto">
            升级套餐
          </Button>
          {/* 免费版用户不显示购买积分按钮 */}
          {!isFreeUser && (
            <Button onClick={handlePurchase} variant="outline" className="w-full sm:w-auto">
              购买积分包
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
