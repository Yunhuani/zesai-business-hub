import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface ReferralStats {
  totalReferrals: number;
  completedReferrals: number;
  totalCommission: number;
  pendingCommission: number;
  confirmedCommission: number;
  paidCommission: number;
}

interface ReferralStatsCardProps {
  stats?: ReferralStats;
  loading?: boolean;
}

export default function ReferralStatsCard({ stats, loading }: ReferralStatsCardProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>推广数据</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (!stats) {
    return null;
  }

  const chartData = [
    {
      name: "待确认",
      value: stats.pendingCommission,
    },
    {
      name: "已确认",
      value: stats.confirmedCommission,
    },
    {
      name: "已支付",
      value: stats.paidCommission,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>推广数据统计</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 统计指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.totalReferrals}</div>
            <div className="text-xs text-muted-foreground">总推荐人数</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.completedReferrals}</div>
            <div className="text-xs text-muted-foreground">已完成对话</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">¥{stats.totalCommission.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">总佣金</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">¥{stats.confirmedCommission.toFixed(2)}</div>
            <div className="text-xs text-muted-foreground">可提现</div>
          </div>
        </div>

        {/* 佣金状态图表 */}
        {chartData.some((d) => d.value > 0) && (
          <div className="mt-6">
            <h4 className="text-sm font-medium mb-4">佣金状态分布</h4>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  formatter={(value) => `¥${(value as number).toFixed(2)}`}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 佣金状态说明 */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">待确认（冻结中）:</span>
            <span className="font-medium">¥{stats.pendingCommission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">已确认（可提现）:</span>
            <span className="font-medium">¥{stats.confirmedCommission.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">已支付:</span>
            <span className="font-medium">¥{stats.paidCommission.toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
