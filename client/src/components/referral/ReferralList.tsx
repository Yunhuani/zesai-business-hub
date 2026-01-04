import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";

interface Referral {
  id: number;
  refereeId: number;
  refereeName: string;
  refereeEmail?: string | null;
  status: "pending" | "completed";
  createdAt: Date;
}

interface ReferralListProps {
  referrals: Referral[];
  loading?: boolean;
}

export default function ReferralList({ referrals, loading }: ReferralListProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>推荐用户</CardTitle>
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

  if (referrals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>推荐用户</CardTitle>
          <CardDescription>您还没有推荐过用户</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">分享您的邀请码给朋友，开始赚取佣金吧！</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>推荐用户</CardTitle>
        <CardDescription>
          共推荐 {referrals.length} 位用户，其中 {referrals.filter((r) => r.status === "completed").length} 位已完成首次对话
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {referrals.map((referral) => (
            <div
              key={referral.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium">{referral.refereeName || "未知用户"}</div>
                <div className="text-sm text-muted-foreground">{referral.refereeEmail}</div>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={referral.status === "completed" ? "default" : "secondary"}>
                  {referral.status === "completed" ? "已完成" : "待完成"}
                </Badge>
                <div className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(referral.createdAt), "M月d日", { locale: zhCN })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
