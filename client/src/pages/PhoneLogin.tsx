import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, LogIn, Smartphone } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trackConversion, ConversionEvents } from "@/lib/analytics";

export default function PhoneLogin() {
  const [, setLocation] = useLocation();
  
  // Form state
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  
  // Countdown state
  const [countdown, setCountdown] = useState(0);
  
  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const sendCodeMutation = trpc.phoneAuth.sendCode.useMutation({
    onSuccess: () => {
      toast.success("验证码已发送");
      setCountdown(60);
      setCodeError("");
    },
    onError: (error) => {
      let errorMessage = "发送失败";
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
          errorMessage = parsed[0].message;
        }
      } catch {
        errorMessage = error.message || "发送失败";
      }
      setPhoneError(errorMessage);
    },
  });

  const loginMutation = trpc.phoneAuth.loginWithPhone.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      trackConversion(ConversionEvents.LOGIN_SUCCESS);
      toast.success(data.message);
      setLocation("/");
    },
    onError: (error) => {
      trackConversion(ConversionEvents.LOGIN_FAIL);
      let errorMessage = "登录失败";
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
          errorMessage = parsed[0].message;
        }
      } catch {
        errorMessage = error.message || "登录失败";
      }
      setCodeError(errorMessage);
    },
  });

  const handleSendCode = () => {
    setPhoneError("");
    if (!phone) {
      setPhoneError("请输入手机号");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneError("请输入正确的手机号");
      return;
    }
    sendCodeMutation.mutate({ phone, type: "login" });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    setCodeError("");
    
    let hasError = false;
    if (!phone) {
      setPhoneError("请输入手机号");
      hasError = true;
    } else if (!/^1[3-9]\d{9}$/.test(phone)) {
      setPhoneError("请输入正确的手机号");
      hasError = true;
    }
    if (!code) {
      setCodeError("请输入验证码");
      hasError = true;
    } else if (!/^\d{6}$/.test(code)) {
      setCodeError("验证码为6位数字");
      hasError = true;
    }
    if (hasError) return;
    
    loginMutation.mutate({ phone, code });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md flex-1 flex flex-col justify-center">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-16 mx-auto mb-4" />
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            {APP_TITLE}
          </h1>
          <p className="text-gray-400 mt-2">专业的AI商业咨询平台</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              手机验证码登录
            </CardTitle>
            <CardDescription>输入手机号获取验证码登录，新用户自动注册</CardDescription>
          </CardHeader>
          <form onSubmit={handleLogin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">手机号</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="请输入手机号"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 11));
                    setPhoneError("");
                  }}
                  disabled={loginMutation.isPending}
                  autoComplete="tel"
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && (
                  <p className="text-sm text-red-500">{phoneError}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="code">验证码</Label>
                <div className="flex gap-2">
                  <Input
                    id="code"
                    type="text"
                    placeholder="请输入6位验证码"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                      setCodeError("");
                    }}
                    disabled={loginMutation.isPending}
                    autoComplete="one-time-code"
                    className={`flex-1 ${codeError ? "border-red-500" : ""}`}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sendCodeMutation.isPending || !phone}
                    className="w-28 shrink-0"
                  >
                    {sendCodeMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : countdown > 0 ? (
                      `${countdown}秒`
                    ) : (
                      "获取验证码"
                    )}
                  </Button>
                </div>
                {codeError && (
                  <p className="text-sm text-red-500">{codeError}</p>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    登录中...
                  </>
                ) : (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    登录 / 注册
                  </>
                )}
              </Button>
              <div className="text-center text-sm text-gray-400">
                <Link href="/login" className="text-blue-600 hover:underline">
                  使用邮箱密码登录
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md text-center text-sm text-gray-500 py-4 space-y-2">
        <div className="flex justify-center gap-4">
          <Link href="/about" className="hover:text-gray-300">关于我们</Link>
          <Link href="/contact" className="hover:text-gray-300">联系客服</Link>
          <Link href="/pricing" className="hover:text-gray-300">价格套餐</Link>
        </div>
        <p>© 2025 泽思 Zenith AI - 专业AI商业咨询平台</p>
        <div className="flex justify-center gap-4 text-xs">
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
            沪ICP备2024048847号
          </a>
          <a href="https://www.beian.gov.cn/portal/registerSystemInfo?recordcode=31011502404980" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300 flex items-center gap-1">
            <img src="https://www.beian.gov.cn/img/ghs.png" alt="" className="w-3 h-3" />
            沪公网安备31011502404980号
          </a>
        </div>
      </footer>
    </div>
  );
}
