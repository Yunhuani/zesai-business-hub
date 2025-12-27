import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

export default function PaymentResult() {
  const [, setLocation] = useLocation();
  const [status, setStatus] = useState<"success" | "failed" | "pending">("pending");

  useEffect(() => {
    // Parse URL parameters
    const params = new URLSearchParams(window.location.search);
    const tradeStatus = params.get("trade_status");
    
    if (tradeStatus === "TRADE_SUCCESS") {
      setStatus("success");
    } else if (tradeStatus) {
      setStatus("failed");
    }
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl">
            {status === "success" && "支付成功"}
            {status === "failed" && "支付失败"}
            {status === "pending" && "处理中"}
          </CardTitle>
          <CardDescription>
            {status === "success" && "感谢您的订阅,您的会员权益已生效"}
            {status === "failed" && "支付未完成,请重试"}
            {status === "pending" && "正在处理您的支付..."}
          </CardDescription>
        </CardHeader>

        <CardContent className="flex flex-col items-center gap-6 py-8">
          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-green-100 p-4">
                <CheckCircle2 className="h-16 w-16 text-green-600" />
              </div>
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  您现在可以开始使用所有会员功能了
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setLocation("/")}>
                    返回首页
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/history")}>
                    查看历史记录
                  </Button>
                </div>
              </div>
            </div>
          )}

          {status === "failed" && (
            <div className="flex flex-col items-center gap-4">
              <div className="rounded-full bg-red-100 p-4">
                <XCircle className="h-16 w-16 text-red-600" />
              </div>
              <div className="text-center space-y-4">
                <p className="text-muted-foreground">
                  支付过程中出现问题,请重新尝试
                </p>
                <div className="flex gap-3">
                  <Button onClick={() => setLocation("/pricing")}>
                    重新选择套餐
                  </Button>
                  <Button variant="outline" onClick={() => setLocation("/")}>
                    返回首页
                  </Button>
                </div>
              </div>
            </div>
          )}

          {status === "pending" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">请稍候...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
