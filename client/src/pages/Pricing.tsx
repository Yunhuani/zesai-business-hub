import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { ExpertConsultationDialog } from "@/components/ExpertConsultationDialog";
import { trackConversion, ConversionEvents } from "@/lib/analytics";

const plans = [
  {
    id: "free",
    name: "免费版",
    price: 0,
    features: [
      "专业AI模型咨询",
      "访问核心知识模型",
      "少量对话时长",
    ],
    icon: Icons.Gift,
    color: "from-gray-400 to-gray-500",
    isFree: true,
  },
  {
    id: "basic",
    name: "基础版",
    price: 99,
    features: [
      "专业AI模型咨询",
      "访问核心知识模型",
      "对话历史保留3个月",
      "标准对话时长",
      "多轮深度对话",
      "优先响应速度",
    ],
    icon: Icons.Zap,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "professional",
    name: "专业版",
    price: 299,
    features: [
      "专业AI模型咨询",
      "访问核心知识模型",
      "对话历史保留1年",
      "更长对话时长",
      "更优生成效果",
      "优先响应速度",
    ],
    icon: Icons.Rocket,
    color: "from-purple-500 to-pink-500",
    popular: true,
  },
  {
    id: "enterprise",
    name: "企业版",
    price: 999,
    features: [
      "专业AI模型咨询",
      "访问核心知识模型",
      "对话历史永久保存",
      "更长对话时长",
      "更优生成效果",
      "最高优先级响应",
      "专属客户支持",
    ],
    icon: Icons.Crown,
    color: "from-orange-500 to-red-500",
  },
];

export default function Pricing() {
  const [, setLocation] = useLocation();
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);
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
      setTimeout(() => window.location.href = "/email-login", 0);
    }
  }, [authLoading, isAuthenticated]);

  // 追踪查看套餐页面
  useEffect(() => {
    if (isAuthenticated) {
      trackConversion(ConversionEvents.VIEW_PRICING);
    }
  }, [isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const currentPlan = subscriptionData?.subscription?.plan || "free";

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
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
                    <div>
                      <span className="text-4xl font-bold text-foreground">¥{plan.price}</span>
                      <span className="text-muted-foreground">/月</span>
                    </div>
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
                    disabled={isCurrentPlan || plan.isFree}
                    onClick={() => {
                      if (!plan.isFree && !isCurrentPlan) {
                        trackConversion(ConversionEvents.PAYMENT_START, {
                          plan_id: plan.id,
                          plan_name: plan.name,
                          plan_price: plan.price,
                        });
                        setLocation(`/payment/${plan.id}`);
                      }
                    }}
                  >
                    {isCurrentPlan ? (
                      "当前套餐"
                    ) : plan.isFree ? (
                      "免费使用"
                    ) : (
                      "立即购买"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Expert Consultation */}
        <div className="mt-16 max-w-3xl mx-auto">
          <Card className="border-2 border-purple-500/30 glass-effect">
            <CardHeader className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
                <Icons.Users className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-2xl">需要人工专家指导？</CardTitle>
              <CardDescription className="text-base mt-2">
                我们的专家顾问团队随时为您提供一对一的专业咨询服务
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Button 
                size="lg" 
                className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                onClick={() => setExpertDialogOpen(true)}
              >
                <Icons.MessageCircle className="w-5 h-5 mr-2" />
                联系专家顾问
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8 glass-effect mt-16">
        <div className="container text-center text-sm text-muted-foreground space-y-3">
          <div className="flex justify-center gap-6">
            <a 
              href="/about" 
              className="hover:text-foreground transition-colors"
            >
              关于我们
            </a>
            <a 
              href="/support" 
              className="hover:text-foreground transition-colors"
            >
              联系客服
            </a>
            <a 
              href="/pricing" 
              className="hover:text-foreground transition-colors"
            >
              价格套餐
            </a>
          </div>
          <div>© 2025 泽思 Zenith AI - 专业AI商业咨询平台</div>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              沪ICP备2024048847号
            </a>
            <a 
              href="https://beian.mps.gov.cn/#/query/webSearch?code=31011502404980" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <img src="/police-badge.png" alt="公安备案" className="w-4 h-4" />
              沪公网安备31011502404980号
            </a>
          </div>
        </div>
      </footer>

      <ExpertConsultationDialog 
        open={expertDialogOpen} 
        onOpenChange={setExpertDialogOpen} 
      />
    </div>
  );
}
