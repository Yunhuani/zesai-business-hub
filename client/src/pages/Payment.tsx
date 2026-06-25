import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, XCircle, ArrowLeft } from "lucide-react";

const PLAN_NAMES = {
  basic: "基础版",
  professional: "专业版",
  enterprise: "企业版",
};

const PLAN_PRICES = {
  basic: "¥99",
  professional: "¥299",
  enterprise: "¥999",
};

const PLAN_AMOUNTS = {
  basic: 99,
  professional: 299,
  enterprise: 999,
};

export default function Payment() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/payment/:plan");
  const plan = params?.plan as "basic" | "professional" | "enterprise" | undefined;

  // Parse orderId from query string
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const orderId = urlParams.get('orderId');

  const [paymentMethod, setPaymentMethod] = useState<"alipay" | "wechat">("alipay");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "creating" | "redirecting" | "failed">("idle");
  const [paymentForm, setPaymentForm] = useState<string>("");
  const formContainerRef = useRef<HTMLDivElement>(null);

  // 获取支付配置
  const { data: paymentConfig } = trpc.payment.getPaymentConfig.useQuery();
  const wechatPayEnabled = paymentConfig?.wechatPayEnabled ?? false;

  const createOrder = trpc.payment.createOrder.useMutation();

  // Auto-submit payment form when it's ready (for Alipay)
  useEffect(() => {
    if (paymentForm && formContainerRef.current && paymentMethod === "alipay") {
      formContainerRef.current.innerHTML = paymentForm;
      const form = formContainerRef.current.querySelector('form');
      if (form) {
        setPaymentStatus("redirecting");
        form.submit();
      }
    }
  }, [paymentForm, paymentMethod]);

  const handlePayment = () => {
    if (!plan || !["basic", "professional", "enterprise"].includes(plan)) {
      setLocation("/pricing");
      return;
    }

    setPaymentStatus("creating");

    // Create payment order
    createOrder.mutate(
      {
        type: "subscription",
        planId: plan,
        amount: PLAN_AMOUNTS[plan],
        paymentMethod,
      },
      {
        onSuccess: (data) => {
          if (data.paymentMethod === "wechat") {
            // For WeChat Pay, redirect to H5 URL
            setPaymentStatus("redirecting");
            setTimeout(() => {
              window.location.href = data.paymentUrl || "";
            }, 0);
          } else {
            // For Alipay, set payment form for auto-submit
            setPaymentForm(data.paymentForm || "");
          }
        },
        onError: (error) => {
          console.error("Failed to create payment:", error);
          setPaymentStatus("failed");
        },
      }
    );
  };

  // If orderId is provided, redirect to payment page (from Credits page)
  useEffect(() => {
    if (orderId) {
      // The payment form should be submitted from the Credits page
      // This page just shows loading state
      return;
    }

    // Check if plan is valid
    if (!plan || !["basic", "professional", "enterprise"].includes(plan)) {
      setLocation("/pricing");
      return;
    }
  }, [plan, orderId]);

  const displayTitle = orderId ? "正在跳转到支付页面" : 
                       plan ? `${PLAN_NAMES[plan]} - ${PLAN_PRICES[plan]}/月` : 
                       "支付";

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl py-12">
        <Button
          variant="ghost"
          onClick={() => setLocation(orderId ? "/credits" : "/pricing")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {orderId ? "返回积分购买" : "返回套餐选择"}
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">
              {paymentStatus === "idle" && "选择支付方式"}
              {paymentStatus === "creating" && "正在创建订单"}
              {paymentStatus === "redirecting" && "正在跳转到支付页面"}
              {paymentStatus === "failed" && "支付失败"}
            </CardTitle>
            {!orderId && plan && (
              <CardDescription className="text-lg">
                {displayTitle}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-6 py-8">
            {paymentStatus === "idle" && (
              <div className="w-full max-w-md space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">选择支付方式</Label>
                  <RadioGroup value={paymentMethod} onValueChange={(value: string) => setPaymentMethod(value as "alipay" | "wechat")}>
                    <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-accent" onClick={() => setPaymentMethod("alipay")}>
                      <RadioGroupItem value="alipay" id="alipay" />
                      <Label htmlFor="alipay" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-blue-900/20 rounded flex items-center justify-center">
                            <svg className="w-8 h-8" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
                              <path fill="#1677FF" d="M1024 701.9v203.8c0 65.1-52.8 117.9-117.9 117.9H117.9C52.8 1023.6 0 970.8 0 905.7V118.3C0 53.2 52.8.4 117.9.4h788.2c65.1 0 117.9 52.8 117.9 117.9v583.6z"/>
                              <path fill="#FFF" d="M785.4 443.8c-12.3-5.1-24.9-9.4-37.7-13.1 3.8-15.3 6.5-31.1 8.1-47.3h62.1v-31.9H679.1v-49.7h-43.5v49.7H496.8v31.9h62.1c1.6 16.2 4.3 32 8.1 47.3-12.8 3.7-25.4 8-37.7 13.1-59.7 24.7-104.1 69.7-104.1 115.5 0 69.7 89.5 126.2 200 126.2s200-56.5 200-126.2c0-45.8-44.4-90.8-104.1-115.5z"/>
                            </svg>
                          </div>
                          <div>
                            <div className="font-semibold">支付宝</div>
                            <div className="text-sm text-muted-foreground">推荐使用</div>
                          </div>
                        </div>
                      </Label>
                    </div>
                    {/* 微信支付选项已隐藏 - 微信不支持当前业务类型开通H5支付 */}
                  </RadioGroup>
                </div>

                <Button 
                  className="w-full" 
                  size="lg"
                  onClick={handlePayment}
                >
                  确认支付 {plan && PLAN_PRICES[plan]}
                </Button>
              </div>
            )}

            {(paymentStatus === "creating" || paymentStatus === "redirecting") && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">
                  {paymentStatus === "creating" && "正在创建订单..."}
                  {paymentStatus === "redirecting" && "正在跳转到支付页面..."}
                </p>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-full bg-red-100 p-4">
                  <XCircle className="h-16 w-16 text-red-600" />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-semibold mb-2">支付失败</h3>
                  <p className="text-muted-foreground mb-4">创建支付订单失败,请稍后重试</p>
                  <Button onClick={() => {
                    setPaymentStatus("idle");
                    setPaymentForm("");
                  }}>
                    重新选择支付方式
                  </Button>
                </div>
              </div>
            )}

            {/* Payment form container - will be auto-submitted for Alipay */}
            <div ref={formContainerRef} style={{ display: 'none' }} />
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          如有任何问题,请联系客服
        </div>
      </div>
    </div>
  );
}
