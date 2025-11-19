import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, ArrowLeft } from "lucide-react";
import QRCode from "qrcode";

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
  const [, params] = useRoute("/payment/:plan");
  const [, setLocation] = useLocation();
  const plan = params?.plan as "basic" | "professional" | "enterprise" | undefined;

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [paymentStatus, setPaymentStatus] = useState<"pending" | "paid" | "failed">("pending");
  const [outTradeNo, setOutTradeNo] = useState<string>("");

  const createPayment = trpc.payment.createPayment.useMutation();
  const queryPaymentStatus = trpc.payment.queryPaymentStatus.useQuery(
    { outTradeNo },
    {
      enabled: !!outTradeNo && paymentStatus === "pending",
      refetchInterval: 3000, // Poll every 3 seconds
    }
  );

  useEffect(() => {
    if (!plan || !["basic", "professional", "enterprise"].includes(plan)) {
      setLocation("/pricing");
      return;
    }

    // Create payment order
    createPayment.mutate(
      { plan },
      {
        onSuccess: async (data) => {
          setOutTradeNo(data.outTradeNo);
          // Generate QR code
          try {
            const dataUrl = await QRCode.toDataURL(data.qrCode, {
              width: 300,
              margin: 2,
            });
            setQrCodeDataUrl(dataUrl);
          } catch (error) {
            console.error("Failed to generate QR code:", error);
          }
        },
        onError: (error) => {
          console.error("Failed to create payment:", error);
          setPaymentStatus("failed");
        },
      }
    );
  }, [plan]);

  useEffect(() => {
    if (queryPaymentStatus.data?.status === "paid") {
      setPaymentStatus("paid");
    }
  }, [queryPaymentStatus.data]);

  if (!plan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container max-w-4xl py-12">
        <Button
          variant="ghost"
          onClick={() => setLocation("/pricing")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          返回套餐选择
        </Button>

        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">
              {paymentStatus === "pending" && "扫码支付"}
              {paymentStatus === "paid" && "支付成功"}
              {paymentStatus === "failed" && "支付失败"}
            </CardTitle>
            <CardDescription className="text-lg">
              {PLAN_NAMES[plan]} - {PLAN_PRICES[plan]}/月
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {paymentStatus === "pending" && (
              <>
                {createPayment.isPending && (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                    <p className="text-gray-600">正在生成支付二维码...</p>
                  </div>
                )}

                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center space-y-4">
                    <div className="bg-white p-6 rounded-lg shadow-md">
                      <img
                        src={qrCodeDataUrl}
                        alt="支付二维码"
                        className="w-[300px] h-[300px]"
                      />
                    </div>

                    <div className="text-center space-y-2">
                      <p className="text-lg font-medium text-gray-900">
                        请使用支付宝扫码支付
                      </p>
                      <p className="text-sm text-gray-600">
                        支付金额: {PLAN_PRICES[plan]}
                      </p>
                      <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>等待支付中...</span>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
                      <p className="text-sm text-blue-800">
                        💡 支付成功后会自动跳转,请勿关闭此页面
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {paymentStatus === "paid" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <CheckCircle2 className="h-20 w-20 text-green-600" />
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">支付成功!</h3>
                  <p className="text-gray-600">
                    您已成功订阅 {PLAN_NAMES[plan]}
                  </p>
                </div>
                <Button
                  onClick={() => setLocation("/")}
                  size="lg"
                  className="mt-4"
                >
                  开始使用
                </Button>
              </div>
            )}

            {paymentStatus === "failed" && (
              <div className="flex flex-col items-center justify-center py-12 space-y-6">
                <XCircle className="h-20 w-20 text-red-600" />
                <div className="text-center space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900">支付失败</h3>
                  <p className="text-gray-600">
                    创建支付订单失败,请稍后重试
                  </p>
                </div>
                <Button
                  onClick={() => setLocation("/pricing")}
                  size="lg"
                  className="mt-4"
                >
                  返回套餐选择
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>如有任何问题,请联系客服</p>
        </div>
      </div>
    </div>
  );
}
