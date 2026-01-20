import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus, Eye, EyeOff } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trackConversion, ConversionEvents } from "@/lib/analytics";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/PasswordStrengthIndicator";

export default function EmailLogin() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginEmailError, setLoginEmailError] = useState("");
  const [loginPasswordError, setLoginPasswordError] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerEmailError, setRegisterEmailError] = useState("");
  const [registerPasswordError, setRegisterPasswordError] = useState("");
  const [registerConfirmError, setRegisterConfirmError] = useState("");

  const clearLoginErrors = () => {
    setLoginEmailError("");
    setLoginPasswordError("");
  };

  const clearRegisterErrors = () => {
    setRegisterEmailError("");
    setRegisterPasswordError("");
    setRegisterConfirmError("");
  };

  const loginMutation = trpc.auth.loginWithEmail.useMutation({
    onSuccess: (data) => {
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      trackConversion(ConversionEvents.LOGIN_SUCCESS);
      toast.success("登录成功");
      setLocation("/");
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
      // 登录失败显示在密码框下方
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
      setLocation("/");
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
      // 其他错误显示在密码框下方
      setRegisterPasswordError(errorMessage);
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    clearLoginErrors();
    
    let hasError = false;
    if (!loginEmail) {
      setLoginEmailError("请输入邮箱");
      hasError = true;
    }
    if (!loginPassword) {
      setLoginPasswordError("请输入密码");
      hasError = true;
    }
    if (hasError) return;
    
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    clearRegisterErrors();
    
    let hasError = false;
    if (!registerEmail) {
      setRegisterEmailError("请输入邮箱");
      hasError = true;
    }
    if (!registerPassword) {
      setRegisterPasswordError("请输入密码");
      hasError = true;
    } else {
      const strengthCheck = validatePasswordStrength(registerPassword);
      if (!strengthCheck.valid) {
        setRegisterPasswordError(strengthCheck.message);
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
      name: registerName || registerEmail.split('@')[0],
    });
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

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          {/* Login Tab */}
          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>邮箱登录</CardTitle>
                <CardDescription>使用邮箱和密码登录</CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">邮箱</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="请输入邮箱"
                      value={loginEmail}
                      onChange={(e) => {
                        setLoginEmail(e.target.value);
                        setLoginEmailError("");
                      }}
                      disabled={loginMutation.isPending}
                      autoComplete="email"
                      className={loginEmailError ? "border-red-500" : ""}
                    />
                    {loginEmailError && (
                      <p className="text-sm text-red-500">{loginEmailError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">密码</Label>
                      <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                        忘记密码？
                      </Link>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="请输入密码"
                        value={loginPassword}
                        onChange={(e) => {
                          setLoginPassword(e.target.value);
                          setLoginPasswordError("");
                        }}
                        disabled={loginMutation.isPending}
                        autoComplete="current-password"
                        className={`pr-10 ${loginPasswordError ? "border-red-500" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {loginPasswordError && (
                      <p className="text-sm text-red-500">{loginPasswordError}</p>
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
                        登录
                      </>
                    )}
                  </Button>
                  <div className="text-center text-sm text-gray-400">
                    还没有账号？
                    <button
                      type="button"
                      onClick={() => setActiveTab("register")}
                      className="text-blue-600 hover:underline ml-1"
                    >
                      立即注册
                    </button>
                  </div>
                  <div className="text-center text-sm text-gray-400">
                    <Link href="/login" className="text-blue-600 hover:underline">
                      使用手机验证码登录
                    </Link>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>注册</CardTitle>
                <CardDescription>创建您的账户</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">邮箱</Label>
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
                      autoComplete="email"
                      className={registerEmailError ? "border-red-500" : ""}
                    />
                    {registerEmailError && (
                      <p className="text-sm text-red-500">{registerEmailError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">密码</Label>
                    <div className="relative">
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
                        autoComplete="new-password"
                        className={`pr-10 ${registerPasswordError ? "border-red-500" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerPasswordError && (
                      <p className="text-sm text-red-500">{registerPasswordError}</p>
                    )}
                    <PasswordStrengthIndicator password={registerPassword} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">确认密码</Label>
                    <div className="relative">
                      <Input
                        id="register-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="请再次输入密码"
                        value={registerConfirmPassword}
                        onChange={(e) => {
                          setRegisterConfirmPassword(e.target.value);
                          setRegisterConfirmError("");
                        }}
                        disabled={registerMutation.isPending}
                        autoComplete="new-password"
                        className={`pr-10 ${registerConfirmError ? "border-red-500" : ""}`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {registerConfirmError && (
                      <p className="text-sm text-red-500">{registerConfirmError}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-name">昵称（可选）</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="请输入昵称"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      disabled={registerMutation.isPending}
                      autoComplete="name"
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    继续即表示您同意我们的{" "}
                    <Link href="/terms" className="text-blue-600 hover:underline">用户协议</Link>
                    {" "}和{" "}
                    <Link href="/privacy" className="text-blue-600 hover:underline">隐私政策</Link>。
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-4">
                  <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
                    {registerMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        注册中...
                      </>
                    ) : (
                      <>
                        <UserPlus className="mr-2 h-4 w-4" />
                        注册
                      </>
                    )}
                  </Button>
                  <div className="text-center text-sm text-gray-400">
                    已有账号？
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className="text-blue-600 hover:underline ml-1"
                    >
                      立即登录
                    </button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
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
