import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { consumeLoginReturnPath } from "@/lib/loginReturn";

export default function WechatLogin() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useAuth();
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Get WeChat auth URL
  const { data: authData } = trpc.auth.getWechatAuthUrl.useQuery({
    redirectUri: `${window.location.origin}/wechat-callback`,
  });

  // Handle WeChat callback
  const wechatCallbackMutation = trpc.auth.wechatCallback.useMutation({
    onSuccess: () => {
      toast.success("微信登录成功!");
      setLocation(consumeLoginReturnPath());
    },
    onError: (error) => {
      toast.error("微信登录失败: " + error.message);
      setIsLoading(false);
    },
  });

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation(consumeLoginReturnPath());
    }
  }, [isAuthenticated, setLocation]);

  // Check for WeChat callback code in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get("code");
    
    if (code && !isLoading) {
      setIsLoading(true);
      wechatCallbackMutation.mutate({ code });
    }
  }, []);

  // Generate QR code URL when auth URL is available
  useEffect(() => {
    if (authData?.url) {
      // WeChat will display QR code automatically when visiting this URL in iframe
      setQrCodeUrl(authData.url);
    }
  }, [authData]);

  if (isLoading || wechatCallbackMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4">
              <Icons.Loader2 className="w-12 h-12 animate-spin text-blue-600" />
              <p className="text-lg text-muted-foreground">正在处理微信登录...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center">
              <Icons.Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
          <CardTitle className="text-2xl">微信登录</CardTitle>
          <CardDescription>使用微信扫码登录 {APP_TITLE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {qrCodeUrl ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-full aspect-square max-w-xs bg-white rounded-lg border-2 border-gray-700 overflow-hidden">
                <iframe
                  src={qrCodeUrl}
                  className="w-full h-full"
                  frameBorder="0"
                  scrolling="no"
                  title="WeChat QR Code"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Icons.Smartphone className="w-4 h-4" />
                <span>请使用微信扫描二维码登录</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <Icons.Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-sm text-muted-foreground">正在加载二维码...</p>
            </div>
          )}

          <div className="pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/")}
            >
              <Icons.ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
