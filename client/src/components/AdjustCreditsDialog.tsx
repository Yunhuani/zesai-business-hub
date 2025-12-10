import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import * as Icons from "lucide-react";

interface AdjustCreditsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
  userName: string;
  currentCredits: {
    subscription: number;
    purchased: number;
    total: number;
  };
}

export function AdjustCreditsDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentCredits,
}: AdjustCreditsDialogProps) {
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  const utils = trpc.useUtils();
  const adjustMutation = trpc.admin.adjustUserCredits.useMutation({
    onSuccess: () => {
      toast.success("积分调整成功");
      utils.admin.listUsers.invalidate();
      onOpenChange(false);
      setAmount("");
      setReason("");
    },
    onError: (error) => {
      toast.error("积分调整失败: " + error.message);
    },
  });

  const handleSubmit = () => {
    const amountNum = parseInt(amount);
    
    if (isNaN(amountNum)) {
      toast.error("请输入有效的积分数量");
      return;
    }

    if (amountNum === 0) {
      toast.error("调整积分数量不能为0");
      return;
    }

    if (!reason.trim()) {
      toast.error("请填写操作备注");
      return;
    }

    adjustMutation.mutate({
      userId,
      amount: amountNum,
      reason: reason.trim(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icons.Coins className="w-5 h-5 text-purple-600" />
            调整用户积分
          </DialogTitle>
          <DialogDescription>
            为用户 <span className="font-semibold text-foreground">{userName}</span> 调整积分
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Credits Display */}
          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">当前总积分：</span>
              <span className="font-semibold text-lg">{currentCredits.total}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>订阅积分：</span>
              <span>{currentCredits.subscription}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>购买积分：</span>
              <span>{currentCredits.purchased}</span>
            </div>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              调整数量 <span className="text-red-500">*</span>
            </Label>
            <Input
              id="amount"
              type="number"
              placeholder="输入正数增加，负数减少（如：+500 或 -100）"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={-10000}
              max={10000}
            />
            <p className="text-xs text-muted-foreground">
              单次调整范围：-10000 ~ +10000
            </p>
          </div>

          {/* Reason Input */}
          <div className="space-y-2">
            <Label htmlFor="reason">
              操作备注 <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              placeholder="请填写调整原因，如：种子用户测试、积分补偿等"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>

          {/* Preview */}
          {amount && !isNaN(parseInt(amount)) && parseInt(amount) !== 0 && (
            <div className="rounded-lg border border-purple-200 bg-purple-50 p-3">
              <div className="flex items-center gap-2 text-sm">
                <Icons.Info className="w-4 h-4 text-purple-600" />
                <span className="text-purple-900">
                  调整后总积分：
                  <span className="font-semibold ml-1">
                    {currentCredits.total + parseInt(amount)}
                  </span>
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setAmount("");
              setReason("");
            }}
          >
            取消
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={adjustMutation.isPending}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
          >
            {adjustMutation.isPending ? (
              <>
                <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                处理中...
              </>
            ) : (
              <>
                <Icons.Check className="w-4 h-4 mr-2" />
                确认调整
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
