import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const plans = [
  {
    id: "free",
    name: "免费版",
    price: 0,
    limit: 3,
    features: [
      "每月3次AI咨询",
      "访问所有6个专业顾问",
      "历史记录仅7天",
      "无法导出报告",
    ],
    icon: Icons.Gift,
    color: "from-gray-400 to-gray-500",
    isFree: true,
  },
  {
    id: "basic",
    name: "基础版",
    price: 99,
    limit: 20,
    features: [
      "每月20次AI咨询",
      "访问所有6个专业顾问",
      "对话历史永久保存",
      "可导出 PDF/Word 报告",
    ],
    icon: Icons.Zap,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "professional",
    name: "专业版",
    price: 299,
    limit: 100,
    features: [
      "每月100次AI咨询",
      "访问所有6个专业顾问",
      "对话历史永久保存",
      "优先响应速度",
      "可导出 PDF/Word 报告",
    ],
    icon: Icons.Rocket,
    color: "from-purple-500 to-pink-500",
    popular: true,
  },
  {
    id: "enterprise",
    name: "企业版",
    price: 999,
    limit: 0,
    features: [
      "无限次AI咨询",
      "访问所有6个专业顾问",
      "对话历史永久保存",
      "最高优先级响应",
      "可导出 PDF/Word 报告",
      "专属客户支持",
    ],
    icon: Icons.Crown,
    color: "from-orange-500 to-red-500",
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: subscriptionData } = trpc.subscription.get.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const upgradeMutation = trpc.subscription.upgrade.useMutation({
    onSuccess: () => {
      toast.success("订阅成功!您的套餐已激活。");
      setLocation("/");
    },
    onError: (error) => {
      toast.error("订阅失败: " + error.message);
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentPlan = subscriptionData?.subscription?.plan || "free";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              选择套餐
            </h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">欢迎, {user.name}</span>
            </div>
          )}
        </div>
      </header>

      <div className="container py-16">
        {/* Current Status */}
        {subscriptionData && (
          <Card className="mb-8 max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>当前订阅状态</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold">
                    {currentPlan === "free" ? "免费版" : plans.find(p => p.id === currentPlan)?.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {subscriptionData.usage.limit === 0
                      ? "无限次咨询"
                      : `本月剩余: ${subscriptionData.usage.remaining}/${subscriptionData.usage.limit} 次`}
                  </p>
                </div>
                {currentPlan !== "free" && subscriptionData.subscription && (
                  <p className="text-sm text-muted-foreground">
                    到期时间: {new Date(subscriptionData.subscription.endDate).toLocaleDateString()}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {plans.map((plan) => {
            const IconComponent = plan.icon;
            const isCurrentPlan = currentPlan === plan.id;
            return (
              <Card
                key={plan.id}
                className={`relative ${
                  plan.popular ? "border-2 border-primary shadow-xl scale-105" : ""
                } ${isCurrentPlan ? "border-2 border-green-500" : ""}`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    最受欢迎
                  </div>
                )}
                {isCurrentPlan && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-sm font-semibold">
                    当前套餐
                  </div>
                )}
                <CardHeader>
                  <div
                    className={`w-16 h-16 bg-gradient-to-br ${plan.color} rounded-xl flex items-center justify-center mb-4`}
                  >
                    <IconComponent className="w-8 h-8 text-white" />
                  </div>
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <CardDescription>
                    <span className="text-4xl font-bold text-foreground">¥{plan.price}</span>
                    <span className="text-muted-foreground">/月</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Icons.Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    disabled={isCurrentPlan || upgradeMutation.isPending}
                    onClick={() => upgradeMutation.mutate({ plan: plan.id as any })}
                  >
                    {upgradeMutation.isPending ? (
                      <>
                        <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        处理中...
                      </>
                    ) : isCurrentPlan ? (
                      "当前套餐"
                    ) : (
                      "立即订阅"
                    )}
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    注意:此为演示版本,暂未接入真实支付
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">常见问题</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">如何支付?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  目前支付功能正在对接中,支持支付宝和微信支付。完成对接后,您可以直接在线支付。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">可以随时取消订阅吗?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  可以。您可以随时取消订阅,已支付的费用将在当前周期结束前继续有效。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">企业版真的无限次吗?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  是的,企业版提供无限次咨询服务,适合高频使用的企业用户。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
