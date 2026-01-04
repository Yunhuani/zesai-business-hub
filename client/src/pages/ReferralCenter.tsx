import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Share2, TrendingUp, Wallet, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReferralCodeCard from "@/components/referral/ReferralCodeCard";
import ReferralStatsCard from "@/components/referral/ReferralStatsCard";
import ReferralList from "@/components/referral/ReferralList";
import CommissionList from "@/components/referral/CommissionList";
import WithdrawForm from "@/components/referral/WithdrawForm";
import WithdrawalHistory from "@/components/referral/WithdrawalHistory";

export default function ReferralCenter() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");

  // 获取邀请码
  const { data: codeData, isLoading: codeLoading } = trpc.referral.getMyCode.useQuery();

  // 获取推广统计
  const { data: statsData, isLoading: statsLoading } = trpc.referral.getMyStats.useQuery();

  // 获取推荐用户列表
  const { data: referralsData, isLoading: referralsLoading } =
    trpc.referral.getMyReferrals.useQuery();

  // 获取佣金明细
  const { data: commissionsData, isLoading: commissionsLoading } =
    trpc.referral.getCommissions.useQuery();

  // 获取提现记录
  const { data: withdrawalsData, isLoading: withdrawalsLoading } =
    trpc.referral.getWithdrawals.useQuery();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>请先登录</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              需要登录才能访问推广中心
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 py-8">
      <div className="container max-w-6xl mx-auto px-4">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">推广中心</h1>
          <p className="text-muted-foreground">
            邀请朋友使用泽思AI，赚取佣金奖励
          </p>
        </div>

        {/* 快速统计卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" />
                推荐用户
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {statsLoading ? "-" : statsData?.completedReferrals || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                已完成首次对话
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                总佣金
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ¥{statsLoading ? "-" : (statsData?.totalCommission || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                已获得的总佣金
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                可提现
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                ¥{statsLoading ? "-" : (statsData?.confirmedCommission || 0).toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                已确认可提现
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 主要内容区域 */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="referrals">推荐用户</TabsTrigger>
            <TabsTrigger value="commissions">佣金明细</TabsTrigger>
            <TabsTrigger value="withdraw">提现</TabsTrigger>
          </TabsList>

          {/* 概览标签 */}
          <TabsContent value="overview" className="space-y-6">
            <ReferralCodeCard code={codeData?.code} url={codeData?.url} loading={codeLoading} />
            <ReferralStatsCard stats={statsData} loading={statsLoading} />

            {/* 推广说明 */}
            <Card>
              <CardHeader>
                <CardTitle>推广规则</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">📝 注册奖励</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• 您邀请的新用户注册：您获得200积分</li>
                    <li>• 新用户完成首次对话后发放</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">💰 购买佣金</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• 被推荐用户购买套餐或积分包：您获得购买金额的10%</li>
                    <li>• 佣金冻结7天，无退款后自动确认</li>
                    <li>• 确认后满3个月可申请提现</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">🏦 提现规则</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                    <li>• 最低提现金额：¥50</li>
                    <li>• 提现方式：银行卡转账</li>
                    <li>• 提交申请后5个工作日内到账</li>
                    <li>• 单季度佣金≥¥800需代扣20%个税</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 推荐用户标签 */}
          <TabsContent value="referrals">
            <ReferralList referrals={referralsData || []} loading={referralsLoading} />
          </TabsContent>

          {/* 佣金明细标签 */}
          <TabsContent value="commissions">
            <CommissionList commissions={commissionsData || []} loading={commissionsLoading} />
          </TabsContent>

          {/* 提现标签 */}
          <TabsContent value="withdraw" className="space-y-6">
            <WithdrawForm stats={statsData} />
            <WithdrawalHistory withdrawals={withdrawalsData || []} loading={withdrawalsLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
