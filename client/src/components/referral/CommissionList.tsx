import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMonthDay } from "@/lib/dateUtils";

interface Commission {
  id: number;
  orderId: string;
  orderAmount: number;
  commissionAmount: number;
  status: "pending" | "confirmed" | "paid" | "cancelled";
  confirmedAt?: Date | null;
  availableAt?: Date | null;
  createdAt: Date;
  refereeName: string;
}

interface CommissionListProps {
  commissions: Commission[];
  loading?: boolean;
}

const statusLabels = {
  pending: { label: "冻结中", variant: "secondary" as const },
  confirmed: { label: "已确认", variant: "default" as const },
  paid: { label: "已支付", variant: "default" as const },
  cancelled: { label: "已取消", variant: "destructive" as const },
};

export default function CommissionList({ commissions, loading }: CommissionListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>佣金明细</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (commissions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>佣金明细</CardTitle>
          <CardDescription>还没有佣金记录</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              当推荐的用户购买套餐或积分包时，您将获得佣金
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>佣金明细</CardTitle>
        <CardDescription>
          共 {commissions.length} 条记录，总佣金 ¥
          {commissions.reduce((sum, c) => sum + c.commissionAmount, 0).toFixed(2)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {commissions.map((commission) => (
            <div
              key={commission.id}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-medium">{commission.refereeName}</div>
                  <div className="text-sm text-muted-foreground">
                    订单号: {commission.orderId}
                  </div>
                </div>
                <Badge variant={statusLabels[commission.status].variant}>
                  {statusLabels[commission.status].label}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">订单金额</div>
                  <div className="font-medium">¥{commission.orderAmount.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">佣金金额</div>
                  <div className="font-medium text-green-600">
                    ¥{commission.commissionAmount.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">创建时间</div>
                  <div className="font-medium">
                    {formatMonthDay(commission.createdAt)}
                  </div>
                </div>
              </div>

              {/* 状态说明 */}
              <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                {commission.status === "pending" && (
                  <div>
                    冻结中，冻结期结束后自动确认
                    {commission.confirmedAt && (
                      <span>
                        ，预计{formatMonthDay(commission.confirmedAt!)}
                        确认
                      </span>
                    )}
                  </div>
                )}
                {commission.status === "confirmed" && (
                  <div>
                    已确认，可提现
                    {commission.availableAt && (
                      <span>
                        （{formatMonthDay(commission.availableAt!)}
                        后可提现）
                      </span>
                    )}
                  </div>
                )}
                {commission.status === "paid" && <div>已支付</div>}
                {commission.status === "cancelled" && <div>已取消</div>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
