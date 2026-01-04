import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Withdrawal {
  id: number;
  amount: number;
  bankName: string;
  bankAccount: string;
  status: "pending" | "processing" | "completed" | "rejected";
  createdAt: Date;
  completedAt?: Date | null;
}

interface WithdrawalHistoryProps {
  withdrawals: Withdrawal[];
  loading?: boolean;
}

const statusLabels = {
  pending: { label: "待处理", variant: "secondary" as const },
  processing: { label: "处理中", variant: "secondary" as const },
  completed: { label: "已完成", variant: "default" as const },
  rejected: { label: "已拒绝", variant: "destructive" as const },
};

export default function WithdrawalHistory({ withdrawals, loading }: WithdrawalHistoryProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>提现记录</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (withdrawals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>提现记录</CardTitle>
          <CardDescription>还没有提现记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              当您的可提现余额达到¥50时，就可以申请提现了
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>提现记录</CardTitle>
        <CardDescription>
          共 {withdrawals.length} 条记录，总提现 ¥
          {withdrawals
            .filter((w) => w.status === "completed")
            .reduce((sum, w) => sum + w.amount, 0)
            .toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {withdrawals.map((withdrawal) => (
            <div
              key={withdrawal.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium">¥{withdrawal.amount.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground">
                  {withdrawal.bankName} {withdrawal.bankAccount.slice(-4)}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant={statusLabels[withdrawal.status].variant}>
                    {statusLabels[withdrawal.status].label}
                  </Badge>
                  <div className="text-xs text-muted-foreground mt-1">
                    {withdrawal.status === "completed" && withdrawal.completedAt
                      ? format(new Date(withdrawal.completedAt), "M月d日", { locale: zhCN })
                      : format(new Date(withdrawal.createdAt), "M月d日", { locale: zhCN })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
