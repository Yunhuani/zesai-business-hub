import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { trackCredits, CreditsEvents } from "@/lib/analytics";

const CREDIT_PACKS = [
  {
    id: "pack_500",
    name: "入门包",
    credits: 500,
    price: 49,
    description: "适合偶尔使用",
    popular: false,
  },
  {
    id: "pack_1200",
    name: "超值包",
    credits: 1200,
    price: 99,
    description: "最受欢迎，性价比最高",
    popular: true,
    discount: "立省¥19",
  },
  {
    id: "pack_3000",
    name: "专业包",
    credits: 3000,
    price: 199,
    description: "适合重度使用",
    popular: false,
    discount: "立省¥95",
  },
  {
    id: "pack_8000",
    name: "企业包",
    credits: 8000,
    price: 399,
    description: "团队协作首选",
    popular: false,
    discount: "立省¥393",
  },
];

export default function Credits() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const { data: creditsData, isLoading: creditsLoading } = trpc.credits.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const { data: subscriptionData, isLoading: subscriptionLoading } = trpc.subscription.get.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );
  const [paymentFormHtml, setPaymentFormHtml] = useState<string>("");
  
  // 获取支付配置 - 必须在所有条件判断之前调用
  const { data: paymentConfig } = trpc.payment.getPaymentConfig.useQuery();
  
  // 检查用户是否为免费版
  const userPlan = subscriptionData?.subscription?.plan || "free";
  const isFreeUser = userPlan === "free";

  const createOrder = trpc.payment.createOrder.useMutation({
    onSuccess: (data: { orderId: string; paymentForm?: string; paymentUrl?: string; paymentMethod: string }) => {
      if (data.paymentMethod === "wechat" && data.paymentUrl) {
        // 微信支付：直接跳转到H5支付页面
        setTimeout(() => {
          window.location.href = data.paymentUrl!;
        }, 0);
      } else if (data.paymentForm) {
        // 支付宝支付：自动提交表单
        setPaymentFormHtml(data.paymentForm);
      }
    },
    onError: (error: { message: string }) => {
      toast.error("创建订单失败: " + error.message);
    },
  });

  // Auto-submit payment form when ready
  useEffect(() => {
    if (paymentFormHtml) {
      const container = document.createElement('div');
      container.innerHTML = paymentFormHtml;
      document.body.appendChild(container);
      const form = container.querySelector('form');
      if (form) {
        form.submit();
      }
    }
  }, [paymentFormHtml]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setTimeout(() => window.location.href = "/login", 0);
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading || creditsLoading || subscriptionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Payment method: Alipay only
  const handlePurchase = (packId: string, price: number, credits: number) => {
    // 免费版用户不能购买积分包
    if (isFreeUser) {
      toast.error("免费版用户请先升级套餐后再购买积分包");
      return;
    }
    
    // 强制使用支付宝
    const paymentMethod = "alipay";
    
    // 追踪积分充值事件
    trackCredits(CreditsEvents.CREDITS_RECHARGE, credits, {
      pack_id: packId,
      price: price,
      payment_method: paymentMethod,
    });

    createOrder.mutate({
      type: "credits" as const,
      planId: packId,
      amount: price,
      credits: credits,
      paymentMethod,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src={APP_LOGO} alt={APP_TITLE} className="h-8" />
          </Link>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-2">
                <Icons.User className="w-4 h-4" />
                <span className="text-sm">{user.name || user.email}</span>
              </div>
            )}
            <Link href="/">
              <Button variant="ghost">返回首页</Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="container py-16 max-w-6xl">
        {/* Current Credits Display */}
        {creditsData && (
          <Card className="mb-12 p-8 bg-gradient-to-br from-blue-600 to-purple-600 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold mb-2">我的积分</h2>
                <p className="text-blue-100">可用于所有AI顾问咨询服务</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-bold">{creditsData.total}</div>
                <div className="text-sm text-blue-100 mt-2">
                  购买积分: {creditsData.purchased} | 订阅积分: {creditsData.subscription}
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            购买积分包
          </h1>
          <p className="text-lg text-muted-foreground">
            购买的积分永久有效，不会过期
          </p>
        </div>

        {/* 免费版用户提示 */}
        {isFreeUser && (
          <Card className="mb-8 p-6 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Icons.AlertCircle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800 mb-2">免费版用户暂不支持购买积分包</h3>
                <p className="text-sm text-amber-700 mb-4">
                  积分包仅对付费订阅用户开放。请先升级到基础版、专业版或企业版套餐，即可购买积分包补充积分。
                </p>
                <Link href="/pricing">
                  <Button className="bg-amber-600 hover:bg-amber-700">
                    <Icons.ArrowRight className="w-4 h-4 mr-2" />
                    立即升级套餐
                  </Button>
                </Link>
              </div>
            </div>
          </Card>
        )}

        {/* Credit Packs Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {CREDIT_PACKS.map((pack) => (
            <Card
              key={pack.id}
              className={`p-6 relative ${
                pack.popular
                  ? "border-2 border-blue-600 shadow-lg"
                  : "border"
              }`}
            >
              {pack.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  最受欢迎
                </div>
              )}
              <div className="text-center mb-6">
                <h3 className="text-xl font-bold mb-2">{pack.name}</h3>
                <div className="text-4xl font-bold text-blue-600 mb-2">
                  {pack.credits}
                  <span className="text-lg text-muted-foreground ml-1">积分</span>
                </div>
                <div className="text-2xl font-bold mb-2">
                  ¥{pack.price}
                </div>
                {pack.discount && (
                  <div className="text-sm text-green-600 font-medium">
                    {pack.discount}
                  </div>
                )}
                <p className="text-sm text-muted-foreground mt-2">
                  {pack.description}
                </p>
              </div>
              <Button
                onClick={() => handlePurchase(pack.id, pack.price, pack.credits)}
                disabled={createOrder.isPending || isFreeUser}
                className={`w-full ${
                  isFreeUser
                    ? "bg-gray-300 cursor-not-allowed"
                    : pack.popular
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    : ""
                }`}
              >
                {createOrder.isPending ? (
                  <Icons.Loader2 className="w-4 h-4 animate-spin" />
                ) : isFreeUser ? (
                  "请先升级套餐"
                ) : (
                  "立即购买"
                )}
              </Button>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icons.Infinity className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold mb-2">永久有效</h3>
                <p className="text-sm text-muted-foreground">
                  购买的积分永久有效，不会过期，随时可用
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icons.Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="font-bold mb-2">即时到账</h3>
                <p className="text-sm text-muted-foreground">
                  支付成功后积分立即到账，无需等待
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Icons.Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold mb-2">安全支付</h3>
                <p className="text-sm text-muted-foreground">
                  使用支付宝官方支付，安全可靠
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-bold mb-8 text-center">常见问题</h2>
          <div className="space-y-4 max-w-3xl mx-auto">
            <Card className="p-6">
              <h3 className="font-bold mb-2">购买的积分会过期吗？</h3>
              <p className="text-sm text-muted-foreground">
                不会。购买的积分永久有效，不会过期。您可以随时使用。
              </p>
            </Card>
            <Card className="p-6">
              <h3 className="font-bold mb-2">积分和订阅有什么区别？</h3>
              <p className="text-sm text-muted-foreground">
                订阅积分每月重置，购买的积分永久有效。使用时会优先消耗购买的积分，然后才使用订阅积分。
              </p>
            </Card>

            <Card className="p-6">
              <h3 className="font-bold mb-2">购买后可以退款吗？</h3>
              <p className="text-sm text-muted-foreground">
                由于积分是虚拟商品，一旦购买成功并到账，暂不支持退款。请根据实际需求选择合适的积分包。
              </p>
            </Card>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <Card className="p-8 glass-effect">
            <h2 className="text-2xl font-bold mb-4">还在犹豫？</h2>
            <p className="text-muted-foreground mb-6">
              升级订阅套餐，享受更多积分和专属功能
            </p>
            <Link href="/pricing">
              <Button size="lg" variant="outline">
                查看订阅套餐
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
