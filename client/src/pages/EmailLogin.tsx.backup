import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import { Loader2, Mail, Shield } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function EmailLogin() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [countdown, setCountdown] = useState(0);

  const sendCodeMutation = trpc.auth.sendVerificationCode.useMutation({
    onSuccess: () => {
      toast.success("验证码已发送到您的邮箱");
      setStep("code");
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    onError: (error) => {
      toast.error(error.message || "发送验证码失败");
    },
  });

  const verifyCodeMutation = trpc.auth.verifyEmailCode.useMutation({
    onSuccess: () => {
      toast.success("登录成功！");
      setTimeout(() => {
        setLocation("/");
      }, 500);
    },
    onError: (error) => {
      toast.error(error.message || "验证码错误");
    },
  });

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("请输入邮箱地址");
      return;
    }
    sendCodeMutation.mutate({ email });
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) {
      toast.error("请输入6位验证码");
      return;
    }
    verifyCodeMutation.mutate({ email, code });
  };

  const handleResendCode = () => {
    if (countdown > 0) return;
    sendCodeMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <img src="/zhesi-logo.png" alt="哲思AI" className="w-16 h-16" />
          </div>
          <CardTitle className="text-2xl font-bold">欢迎来到哲思AI</CardTitle>
          <CardDescription>
            {step === "email" ? "输入邮箱地址以接收验证码" : "输入验证码以完成登录"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === "email" ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">邮箱地址</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={sendCodeMutation.isPending}
                    autoFocus
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={sendCodeMutation.isPending || !email}
              >
                {sendCodeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    发送中...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    获取验证码
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="code"
                    type="text"
                    placeholder="输入6位验证码"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="pl-10 text-center text-2xl tracking-widest"
                    disabled={verifyCodeMutation.isPending}
                    autoFocus
                    maxLength={6}
                  />
                </div>
                <p className="text-sm text-muted-foreground text-center">
                  验证码已发送到 <span className="font-medium">{email}</span>
                </p>
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={verifyCodeMutation.isPending || code.length !== 6}
              >
                {verifyCodeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    验证中...
                  </>
                ) : (
                  "登录"
                )}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setStep("email");
                    setCode("");
                  }}
                  disabled={verifyCodeMutation.isPending}
                >
                  更换邮箱
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={countdown > 0 || sendCodeMutation.isPending}
                >
                  {countdown > 0 ? `重新发送 (${countdown}s)` : "重新发送"}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <p>登录即表示您同意我们的</p>
            <p>
              <a href="#" className="text-primary hover:underline">
                服务条款
              </a>
              {" 和 "}
              <a href="#" className="text-primary hover:underline">
                隐私政策
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
