import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus, Eye, EyeOff, Mail, Lock, User } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trackConversion, ConversionEvents } from "@/lib/analytics";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/PasswordStrengthIndicator";
import { consumeLoginReturnPath } from "@/lib/loginReturn";
import { Footer } from "@/components/layout";

export default function Login() {
  const [, setLocation] = useLocation();
  
  // Tab：登录 | 注册
  const [activeTab, setActiveTab] = useState<"login" | "register">(
    new URLSearchParams(window.location.search).get("tab") === "register"
      ? "register"
      : "login"
  );

  // ========== 邮箱登录状态 ==========
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState("");
  const [loginPasswordError, setLoginPasswordError] = useState("");

  // ========== 邮箱注册状态 ==========
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerEmailError, setRegisterEmailError] = useState("");
  const [registerPasswordError, setRegisterPasswordError] = useState("");
  const [registerConfirmError, setRegisterConfirmError] = useState("");

  // ========== 邮箱登录 Mutations ==========
  const emailLoginMutation = trpc.auth.loginWithEmail.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      trackConversion(ConversionEvents.LOGIN_SUCCESS);
      toast.success("登录成功");
      setLocation(consumeLoginReturnPath());
    },
    onError: (error) => {
      trackConversion(ConversionEvents.LOGIN_FAIL);
      let errorMessage = "登录失败";
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
          errorMessage = parsed[0].message;
          if (errorMessage.includes("邮箱")) {
            setLoginEmailError(errorMessage);
            return;
          }
        }
      } catch {
        errorMessage = error.message || "登录失败";
      }
      setLoginPasswordError(errorMessage);
    },
  });

  const registerMutation = trpc.auth.registerWithEmail.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      trackConversion(ConversionEvents.REGISTER_SUCCESS);
      toast.success("注册成功，已自动登录");
      setLocation(consumeLoginReturnPath());
    },
    onError: (error) => {
      let errorMessage = "注册失败";
      try {
        const parsed = JSON.parse(error.message);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].message) {
          errorMessage = parsed[0].message;
          if (errorMessage.includes("邮箱")) {
            setRegisterEmailError(errorMessage);
            return;
          }
          if (errorMessage.includes("密码")) {
            setRegisterPasswordError(errorMessage);
            return;
          }
        }
      } catch {
        errorMessage = error.message || "注册失败";
      }
      setRegisterEmailError(errorMessage);
    },
  });

  // ========== 邮箱登录处理 ==========
  const handleEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginEmailError("");
    setLoginPasswordError("");

    let hasError = false;
    if (!loginEmail) {
      setLoginEmailError("请输入邮箱");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setLoginEmailError("请输入正确的邮箱格式");
      hasError = true;
    }
    if (!loginPassword) {
      setLoginPasswordError("请输入密码");
      hasError = true;
    }
    if (hasError) return;

    emailLoginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  // ========== 邮箱注册处理 ==========
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterEmailError("");
    setRegisterPasswordError("");
    setRegisterConfirmError("");

    let hasError = false;
    if (!registerEmail) {
      setRegisterEmailError("请输入邮箱");
      hasError = true;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registerEmail)) {
      setRegisterEmailError("请输入正确的邮箱格式");
      hasError = true;
    }
    if (!registerPassword) {
      setRegisterPasswordError("请输入密码");
      hasError = true;
    } else {
      const strength = validatePasswordStrength(registerPassword);
      if (!strength.valid) {
        setRegisterPasswordError(strength.message || "密码强度不足");
        hasError = true;
      }
    }
    if (!registerConfirmPassword) {
      setRegisterConfirmError("请确认密码");
      hasError = true;
    } else if (registerPassword !== registerConfirmPassword) {
      setRegisterConfirmError("两次输入的密码不一致");
      hasError = true;
    }
    if (hasError) return;

    registerMutation.mutate({
      email: registerEmail,
      password: registerPassword,
      name: registerName || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
        {/* Logo & Title */}
        <div className="relative z-10 mb-8 text-center">
          <Link href="/" className="group flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={APP_LOGO}
                alt={APP_TITLE}
                className="relative z-10 h-20 w-20 rounded-[var(--zs-radius-icon)] object-contain shadow-[var(--zs-shadow-card)]"
              />
            </div>
            <h1 className="font-serif text-3xl font-bold text-[var(--zs-primary)]">
              泽思AI
            </h1>
          </Link>
          <p className="mt-3 text-sm text-[var(--zs-sub)]">专业的AI商业咨询平台</p>
        </div>

        {/* Main Card */}
        <div className="relative z-10 w-full max-w-md">
          <Card className="border-[var(--zs-line)] bg-[var(--zs-card)] shadow-[var(--zs-shadow-card)]">
          {activeTab === "login" ? (
            <form onSubmit={handleEmailLogin}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-center gap-2 text-[var(--zs-ink)]">
                  <Mail className="w-5 h-5 text-[var(--zs-primary)]" />
                  <span className="text-lg font-medium">邮箱登录</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="font-medium text-[var(--zs-ink)]">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--zs-sub)]" />
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="请输入邮箱"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginEmailError("");
                      }}
                      disabled={emailLoginMutation.isPending}
                      className={`h-11 border-[var(--zs-line)] bg-white pl-10 text-[var(--zs-ink)] placeholder:text-[var(--zs-weak)] transition-all focus-visible:border-[var(--zs-primary)] focus-visible:ring-[rgba(31,61,50,.16)] ${loginEmailError ? "border-red-500" : ""}`}
                    />
                  </div>
                  {loginEmailError && <p className="text-sm text-red-500">{loginEmailError}</p>}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="login-password" className="font-medium text-[var(--zs-ink)]">密码</Label>
                    <Link href="/forgot-password" className="text-xs text-[var(--zs-primary)] hover:underline">
                      忘记密码？
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--zs-sub)]" />
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      value={loginPassword}
                      onChange={(e) => {
                        setLoginPassword(e.target.value);
                        setLoginPasswordError("");
                      }}
                      disabled={emailLoginMutation.isPending}
                      className={`h-11 border-[var(--zs-line)] bg-white pl-10 pr-10 text-[var(--zs-ink)] placeholder:text-[var(--zs-weak)] transition-all focus-visible:border-[var(--zs-primary)] focus-visible:ring-[rgba(31,61,50,.16)] ${loginPasswordError ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zs-sub)] hover:text-[var(--zs-ink)]"
                    >
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {loginPasswordError && <p className="text-sm text-red-500">{loginPasswordError}</p>}
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full"
                  disabled={emailLoginMutation.isPending}
                >
                  {emailLoginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                      登录中...
                    </>
                  ) : (
                    <>
                      <LogIn className="mr-2 h-5 w-5" />
                      登录
                    </>
                  )}
                </Button>
                <p className="text-center text-sm text-[var(--zs-sub)]">
                  还没有账号？
                  <button
                    type="button"
                    onClick={() => setActiveTab("register")}
                    className="ml-1 text-[var(--zs-primary)] hover:underline"
                  >
                    立即注册
                  </button>
                </p>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-center gap-2 text-[var(--zs-ink)]">
                  <UserPlus className="w-5 h-5 text-[var(--zs-primary)]" />
                  <span className="text-lg font-medium">邮箱注册</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="register-email" className="font-medium text-[var(--zs-ink)]">邮箱</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--zs-sub)]" />
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="请输入邮箱"
                      value={registerEmail}
                      onChange={(e) => {
                        setRegisterEmail(e.target.value);
                        setRegisterEmailError("");
                      }}
                      disabled={registerMutation.isPending}
                      className={`h-11 border-[var(--zs-line)] bg-white pl-10 text-[var(--zs-ink)] placeholder:text-[var(--zs-weak)] transition-all focus-visible:border-[var(--zs-primary)] focus-visible:ring-[rgba(31,61,50,.16)] ${registerEmailError ? "border-red-500" : ""}`}
                    />
                  </div>
                  {registerEmailError && <p className="text-sm text-red-500">{registerEmailError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-password" className="font-medium text-[var(--zs-ink)]">密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--zs-sub)]" />
                    <Input
                      id="register-password"
                      type={showRegisterPassword ? "text" : "password"}
                      placeholder="请输入密码"
                      value={registerPassword}
                      onChange={(e) => {
                        setRegisterPassword(e.target.value);
                        setRegisterPasswordError("");
                      }}
                      disabled={registerMutation.isPending}
                      className={`h-11 border-[var(--zs-line)] bg-white pl-10 pr-10 text-[var(--zs-ink)] placeholder:text-[var(--zs-weak)] transition-all focus-visible:border-[var(--zs-primary)] focus-visible:ring-[rgba(31,61,50,.16)] ${registerPasswordError ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zs-sub)] hover:text-[var(--zs-ink)]"
                    >
                      {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerPasswordError && <p className="text-sm text-red-500">{registerPasswordError}</p>}
                  {registerPassword && <PasswordStrengthIndicator password={registerPassword} />}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-confirm" className="font-medium text-[var(--zs-ink)]">确认密码</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--zs-sub)]" />
                    <Input
                      id="register-confirm"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="请再次输入密码"
                      value={registerConfirmPassword}
                      onChange={(e) => {
                        setRegisterConfirmPassword(e.target.value);
                        setRegisterConfirmError("");
                      }}
                      disabled={registerMutation.isPending}
                      className={`h-11 border-[var(--zs-line)] bg-white pl-10 pr-10 text-[var(--zs-ink)] placeholder:text-[var(--zs-weak)] transition-all focus-visible:border-[var(--zs-primary)] focus-visible:ring-[rgba(31,61,50,.16)] ${registerConfirmError ? "border-red-500" : ""}`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--zs-sub)] hover:text-[var(--zs-ink)]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {registerConfirmError && <p className="text-sm text-red-500">{registerConfirmError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-name" className="font-medium text-[var(--zs-ink)]">昵称（选填）</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--zs-sub)]" />
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="请输入昵称"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      disabled={registerMutation.isPending}
                      className="h-11 border-[var(--zs-line)] bg-white pl-10 text-[var(--zs-ink)] placeholder:text-[var(--zs-weak)] transition-all focus-visible:border-[var(--zs-primary)] focus-visible:ring-[rgba(31,61,50,.16)]"
                    />
                  </div>
                </div>
                <p className="text-xs text-[var(--zs-sub)]">
                  继续即表示您同意我们的{" "}
                  <Link href="/terms" className="text-[var(--zs-primary)] hover:underline">用户协议</Link>
                  {" "}和{" "}
                  <Link href="/privacy" className="text-[var(--zs-primary)] hover:underline">隐私政策</Link>。
                </p>
              </CardContent>
              <CardFooter className="flex flex-col gap-4 pt-2">
                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full"
                  disabled={registerMutation.isPending}
                >
                  {registerMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin text-white" />
                      注册中...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-5 w-5" />
                      注册
                    </>
                  )}
                </Button>
                <p className="text-center text-sm text-[var(--zs-sub)]">
                  已有账号？
                  <button
                    type="button"
                    onClick={() => setActiveTab("login")}
                    className="ml-1 text-[var(--zs-primary)] hover:underline"
                  >
                    立即登录
                  </button>
                </p>
              </CardFooter>
            </form>
          )}
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
}
