import { useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { AppFooter, AppHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Loader2, WalletCards, XCircle } from "lucide-react";

const PLAN_NAMES = {
  basic: "基础版",
  professional: "专业版",
  enterprise: "公司版",
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

  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const orderId = urlParams.get("orderId");

  const [paymentMethod, setPaymentMethod] = useState<"alipay" | "wechat">("alipay");
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "creating" | "redirecting" | "failed"
  >("idle");
  const [paymentForm, setPaymentForm] = useState<string>("");
  const formContainerRef = useRef<HTMLDivElement>(null);

  const { data: paymentConfig } = trpc.payment.getPaymentConfig.useQuery();
  const wechatPayEnabled = paymentConfig?.wechatPayEnabled ?? false;

  const createOrder = trpc.payment.createOrder.useMutation();

  useEffect(() => {
    if (paymentForm && formContainerRef.current && paymentMethod === "alipay") {
      formContainerRef.current.innerHTML = paymentForm;
      const form = formContainerRef.current.querySelector("form");
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
            setPaymentStatus("redirecting");
            setTimeout(() => {
              window.location.href = data.paymentUrl || "";
            }, 0);
          } else {
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

  useEffect(() => {
    if (orderId) {
      return;
    }

    if (!plan || !["basic", "professional", "enterprise"].includes(plan)) {
      setLocation("/pricing");
      return;
    }
  }, [plan, orderId, setLocation]);

  const displayTitle = orderId
    ? "正在跳转到支付页面"
    : plan
      ? `${PLAN_NAMES[plan]} - ${PLAN_PRICES[plan]}/月`
      : "支付";

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />
      <main className="mx-auto max-w-[960px] px-6 py-12 md:px-10">
        <Button
          variant="ghost"
          onClick={() => setLocation(orderId ? "/credits" : "/pricing")}
          className="mb-6 text-[var(--zs-sub)] hover:text-[var(--zs-ink)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {orderId ? "返回积分购买" : "返回套餐选择"}
        </Button>

        <Card className="overflow-hidden border-[var(--zs-line)] bg-[var(--zs-card)] shadow-[var(--zs-shadow-card)]">
          <CardHeader className="border-b border-[var(--zs-line)] px-6 py-8 text-center md:px-10">
            <CardTitle className="text-[28px] font-bold leading-tight text-[var(--zs-ink)]">
              {paymentStatus === "idle" && "选择支付方式"}
              {paymentStatus === "creating" && "正在创建订单"}
              {paymentStatus === "redirecting" && "正在跳转到支付页面"}
              {paymentStatus === "failed" && "支付失败"}
            </CardTitle>
            {!orderId && plan && (
              <CardDescription className="mt-2 text-base text-[var(--zs-sub)]">
                {displayTitle}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-6 px-6 py-8 md:px-10">
            {paymentStatus === "idle" && (
              <div className="w-full max-w-[520px] space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold text-[var(--zs-ink)]">
                    选择支付方式
                  </Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={(value: string) =>
                      setPaymentMethod(value as "alipay" | "wechat")
                    }
                  >
                    <button
                      type="button"
                      className="flex w-full items-center gap-4 rounded-[var(--zs-radius-card)] border border-[var(--zs-primary)] bg-white p-4 text-left shadow-[var(--zs-shadow-soft)] transition-colors hover:bg-[var(--zs-primary-soft)]"
                      onClick={() => setPaymentMethod("alipay")}
                    >
                      <RadioGroupItem value="alipay" id="alipay" />
                      <Label htmlFor="alipay" className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--zs-primary-soft)] text-[var(--zs-primary)]">
                            <WalletCards className="h-6 w-6" />
                          </span>
                          <span>
                            <span className="block font-semibold text-[var(--zs-ink)]">
                              支付宝
                            </span>
                            <span className="block text-sm text-[var(--zs-sub)]">
                              推荐使用
                            </span>
                          </span>
                        </div>
                      </Label>
                    </button>
                  </RadioGroup>
                </div>

                <Button className="w-full" size="lg" onClick={handlePayment}>
                  确认支付 {plan && PLAN_PRICES[plan]}
                </Button>
              </div>
            )}

            {(paymentStatus === "creating" || paymentStatus === "redirecting") && (
              <div className="flex flex-col items-center gap-4 py-8">
                <Loader2 className="h-12 w-12 animate-spin text-[var(--zs-primary)]" />
                <p className="text-[var(--zs-sub)]">
                  {paymentStatus === "creating" && "正在创建订单..."}
                  {paymentStatus === "redirecting" && "正在跳转到支付页面..."}
                </p>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="flex flex-col items-center gap-4 py-8">
                <div className="rounded-full bg-[var(--zs-gold-soft)] p-4">
                  <XCircle className="h-16 w-16 text-[var(--zs-gold)]" />
                </div>
                <div className="text-center">
                  <h3 className="mb-2 text-xl font-semibold text-[var(--zs-ink)]">
                    支付失败
                  </h3>
                  <p className="mb-4 text-[var(--zs-sub)]">
                    创建支付订单失败，请稍后重试
                  </p>
                  <Button
                    onClick={() => {
                      setPaymentStatus("idle");
                      setPaymentForm("");
                    }}
                  >
                    重新选择支付方式
                  </Button>
                </div>
              </div>
            )}

            <div ref={formContainerRef} style={{ display: "none" }} />
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-[var(--zs-sub)]">
          如有任何问题，请联系客服
        </div>
        {wechatPayEnabled && <span className="sr-only">微信支付已启用</span>}
      </main>
      <AppFooter />
    </div>
  );
}
