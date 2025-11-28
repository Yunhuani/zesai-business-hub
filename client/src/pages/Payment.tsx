import { useEffect, useState, useRef } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function Payment() {
  const [location, setLocation] = useLocation();
  const [, params] = useRoute("/payment/:plan");
  const plan = params?.plan as "basic" | "professional" | "enterprise" | undefined;

  // Parse orderId from query string
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const orderId = urlParams.get('orderId');

  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [paymentForm, setPaymentForm] = useState<string>("");
  const formContainerRef = useRef<HTMLDivElement>(null);

  const createPayment = trpc.payment.createPayment.useMutation();

  useEffect(() => {
    // If orderId is provided, use the paymentForm from the previous page
    if (orderId) {
      // The payment form should be submitted from the Credits page
      // This page just shows loading state
      return;
    }

    // Legacy flow: subscription plan payment
    if (!plan || !["basic", "professional", "enterprise"].includes(plan)) {
      setLocation("/pricing");
      return;
    }

    // Create payment order
    createPayment.mutate(
      { plan },
      {
        onSuccess: (data) => {
          setPaymentForm(data.paymentForm);
        },
        onError: (error) => {
          console.error("Failed to create payment:", error);
          setPaymentStatus("failed");
        },
      }
    );
  }, [plan, orderId]);

  // Auto-submit payment form when it's ready
  useEffect(() => {
    if (paymentForm && formContainerRef.current) {
      formContainerRef.current.innerHTML = paymentForm;
      const form = formContainerRef.current.querySelector('form');
      if (form) {
        form.submit();
      }
    }
  }, [paymentForm]);

  const displayTitle = orderId ? "正在跳转到支付页面" : 
                       plan ? `${PLAN_NAMES[plan]} - ${PLAN_PRICES[plan]}/月` : 
                       "支付";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
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
              {paymentStatus === "pending" && "正在跳转到支付页面"}
              {paymentStatus === "failed" && "支付失败"}
            </CardTitle>
            {!orderId && plan && (
              <CardDescription className="text-lg">
                {displayTitle}
              </CardDescription>
            )}
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-6 py-8">
            {(createPayment.isPending || paymentStatus === "pending") && (
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">正在创建订单...</p>
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
                  <Button onClick={() => setLocation(orderId ? "/credits" : "/pricing")}>
                    {orderId ? "返回积分购买" : "返回套餐选择"}
                  </Button>
                </div>
              </div>
            )}

            {/* Payment form container - will be auto-submitted */}
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
