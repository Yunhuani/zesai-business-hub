import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, Smartphone, ArrowLeft, CheckCircle } from "lucide-react";

import { APP_LOGO, APP_TITLE } from "@/const";

export default function BindPhone() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated, refetch } = useAuth();
  
  // Form state
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [bindSuccess, setBindSuccess] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setLocation("/login");
    }
  }, [authLoading, isAuthenticated, setLocation]);

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

  const bindPhoneMutation = trpc.phoneAuth.bindPhone.useMutation({
    onSuccess: (data: any) => {
      setBindSuccess(true);
      toast.success("手机号绑定成功");
      // 绑定成功后，保存新的JWT token到localStorage
      if (data.token) {
        localStorage.setItem("auth_token", data.token);
      }
      // 然后刷新页面以重新加载用户信息
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: (error) => {
      let errorMessage = "绑定失败";
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
          errorMessage = parsed[0].message;
        }
      } catch {
        errorMessage = error.message || "绑定失败";
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
    sendCodeMutation.mutate({ phone, type: "bind" });
  };

  const handleBindPhone = (e: React.FormEvent) => {
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
      setCodeError("请输入6位数字验证码");
      hasError = true;
    }
    if (hasError) return;
    
    bindPhoneMutation.mutate({ phone, code });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // 已绑定手机号
  if (user?.phone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
        <button onClick={() => window.location.href = "/"} className="flex flex-col items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <img src={APP_LOGO} alt={APP_TITLE} className="w-16 h-16" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              泽思 AI商业智库
            </h1>
          </button>
        </div>
        
        <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-xl text-white">手机号已绑定</CardTitle>
            <CardDescription className="text-gray-400">
              您的账号已绑定手机号：{user.phone.replace(/(\d{3})\d{4}(\d{4})/, "$1****$2")}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => window.location.href = "/"}
              className="w-full" 
              variant="outline"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // 绑定成功
  if (bindSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-6">
          <button onClick={() => window.location.href = "/"} className="flex flex-col items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
            <img src={APP_LOGO} alt={APP_TITLE} className="w-16 h-16" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              泽思 AI商业智库
            </h1>
          </button>
        </div>
        
        <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <CardTitle className="text-xl text-white">绑定成功</CardTitle>
            <CardDescription className="text-gray-400">
              您的手机号已成功绑定，现在可以使用手机号登录了
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button 
              onClick={() => window.location.href = "/"}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            >
              返回首页
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Logo & Title */}
      <div className="text-center mb-6">
        <button onClick={() => window.location.href = "/"} className="flex flex-col items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <img src={APP_LOGO} alt={APP_TITLE} className="w-16 h-16" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            泽思 AI商业智库
          </h1>
        </button>
        <p className="text-gray-400 text-sm mt-2">专业的AI商业咨询平台</p>
      </div>

      {/* Main Card */}
      <Card className="w-full max-w-md bg-gray-800/50 border-gray-700 backdrop-blur-sm">
        <form onSubmit={handleBindPhone}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-purple-400" />
              <CardTitle className="text-lg text-white">绑定手机号</CardTitle>
            </div>
            <CardDescription className="text-gray-400">
              绑定手机号后，您可以使用手机号快速登录
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 当前账号信息 */}
            <div className="bg-gray-700/30 rounded-lg p-3 text-sm">
              <p className="text-gray-400">当前账号</p>
              <p className="text-white">{user?.email || user?.name || "未知"}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-300">手机号</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="请输入手机号"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError("");
                }}
                disabled={bindPhoneMutation.isPending || sendCodeMutation.isPending}
                className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 ${phoneError ? "border-red-500" : ""}`}
              />
              {phoneError && <p className="text-sm text-red-500">{phoneError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="code" className="text-gray-300">验证码</Label>
              <div className="flex gap-2">
                <Input
                  id="code"
                  type="text"
                  placeholder="请输入6位验证码"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
                    setCodeError("");
                  }}
                  disabled={bindPhoneMutation.isPending}
                  className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 flex-1 ${codeError ? "border-red-500" : ""}`}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSendCode}
                  disabled={countdown > 0 || sendCodeMutation.isPending || !phone}
                  className="bg-purple-600/20 border-purple-500 text-purple-400 hover:bg-purple-600/30 whitespace-nowrap"
                >
                  {sendCodeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : countdown > 0 ? (
                    `${countdown}秒`
                  ) : (
                    "获取验证码"
                  )}
                </Button>
              </div>
              {codeError && <p className="text-sm text-red-500">{codeError}</p>}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              disabled={bindPhoneMutation.isPending}
            >
              {bindPhoneMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  绑定中...
                </>
              ) : (
                "确认绑定"
              )}
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => window.location.href = "/"}
              className="w-full text-gray-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              返回首页
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
