import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppFooter } from "@/components/layout/Footer";
import { AppHeader } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import * as Icons from "lucide-react";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/PasswordStrengthIndicator";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [confirmError, setConfirmError] = useState("");

  // 从URL获取token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      toast.error("缺少重置令牌");
      navigate("/login");
    }
  }, [navigate]);

  // 验证token
  const { data: tokenValid, isLoading: verifying, error: verifyError } = trpc.passwordReset.verifyToken.useQuery(
    { token },
    { 
      enabled: !!token,
      retry: false,
    }
  );
  
  // 处理验证错误
  useEffect(() => {
    if (verifyError) {
      toast.error(verifyError.message);
      setTimeout(() => navigate("/forgot-password"), 2000);
    }
  }, [verifyError, navigate]);

  const resetPassword = trpc.passwordReset.resetPassword.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setResetSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    },
    onError: (error) => {
      let errorMessage = error.message || "重置失败";
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
          errorMessage = parsed[0].message;
        }
      } catch {
        // 保持原错误消息
      }
      setPasswordError(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError("");
    setConfirmError("");
    
    let hasError = false;
    if (!password) {
      setPasswordError("请输入新密码");
      hasError = true;
    } else {
      const strengthCheck = validatePasswordStrength(password);
      if (!strengthCheck.valid) {
        setPasswordError(strengthCheck.message ?? "");
        hasError = true;
      }
    }
    
    if (!confirmPassword) {
      setConfirmError("请确认密码");
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmError("两次输入的密码不一致");
      hasError = true;
    }
    
    if (hasError) return;
    
    resetPassword.mutate({ token, password });
  };

  if (verifying) {
    return (
      <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
        <AppHeader />
        <main className="zs-container flex min-h-[560px] items-center justify-center py-16">
        <div className="text-center">
          <Icons.Loader2 className="w-12 h-12 animate-spin text-[var(--zs-primary)] mx-auto mb-4" />
          <p className="text-muted-foreground">验证重置链接...</p>
        </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />
      <main className="zs-container flex min-h-[560px] items-center justify-center py-16">
        <Card className="w-full max-w-md border-[var(--zs-line)] bg-[var(--zs-card)] p-8 shadow-[var(--zs-shadow-card)]">
        <div className="flex flex-col items-center mb-8">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-12 mb-4" />
          <h1 className="text-2xl font-bold">重置密码</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            请输入您的新密码
          </p>
        </div>

        {!resetSuccess ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">新密码</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="请输入新密码"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError("");
                  }}
                  disabled={resetPassword.isPending}
                  required
                  className={`pr-10 ${passwordError ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-red-500 mt-1">{passwordError}</p>
              )}
              {password && <PasswordStrengthIndicator password={password} />}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">确认密码</label>
              <div className="relative">
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setConfirmError("");
                  }}
                  disabled={resetPassword.isPending}
                  required
                  className={`pr-10 ${confirmError ? "border-red-500" : ""}`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? <Icons.EyeOff className="w-4 h-4" /> : <Icons.Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmError && (
                <p className="text-sm text-red-500 mt-1">{confirmError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={resetPassword.isPending}
            >
              {resetPassword.isPending ? (
                <>
                  <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  重置中...
                </>
              ) : (
                "重置密码"
              )}
            </Button>

            <div className="text-center text-sm">
              <Link href="/login" className="text-[var(--zs-primary)] hover:underline">
                返回登录
              </Link>
            </div>
          </form>
        ) : (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-[var(--zs-primary)]/10 rounded-full flex items-center justify-center mx-auto">
              <Icons.Check className="w-8 h-8 text-[var(--zs-primary)]" />
            </div>
            <div>
              <h3 className="font-bold mb-2">密码重置成功</h3>
              <p className="text-sm text-muted-foreground mb-4">
                您的密码已成功重置，即将跳转到登录页面...
              </p>
            </div>
            <Link href="/login">
              <Button className="w-full">
                立即登录
              </Button>
            </Link>
          </div>
        )}
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
