import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus, Eye, EyeOff, Smartphone, Mail } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trackConversion, ConversionEvents } from "@/lib/analytics";
import { PasswordStrengthIndicator, validatePasswordStrength } from "@/components/PasswordStrengthIndicator";

export default function Login() {
  const [, setLocation] = useLocation();
  
  // 主Tab：手机 | 邮箱
  const [mainTab, setMainTab] = useState<"phone" | "email">("phone");
  // 邮箱子Tab：登录 | 注册
  const [emailTab, setEmailTab] = useState<"login" | "register">("login");

  // ========== 手机登录状态 ==========
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [countdown, setCountdown] = useState(0);

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

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // ========== 手机登录 Mutations ==========
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

  const phoneLoginMutation = trpc.phoneAuth.loginWithPhone.useMutation({
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

  // ========== 邮箱登录 Mutations ==========
  const emailLoginMutation = trpc.auth.loginWithEmail.useMutation({
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
      setRegisterEmailError(errorMessage);
    },
  });

  // ========== 手机登录处理 ==========
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

  const handlePhoneLogin = (e: React.FormEvent) => {
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
    
    phoneLoginMutation.mutate({ phone, code });
  };

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
      if (!strength.isValid) {
        setRegisterPasswordError(strength.feedback);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4">
      {/* Logo & Title */}
      <div className="text-center mb-6">
        <Link href="/" className="flex flex-col items-center gap-3">
          <img src={APP_LOGO} alt={APP_TITLE} className="w-16 h-16" />
          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            泽思AI商业智库
          </h1>
        </Link>
        <p className="text-gray-400 text-sm mt-2">专业的AI商业咨询平台</p>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md">
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          {/* 主Tab：手机 | 邮箱 */}
          <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as "phone" | "email")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-700/50 p-1 m-4 mx-auto" style={{ width: 'calc(100% - 2rem)' }}>
              <TabsTrigger 
                value="phone" 
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex items-center gap-2"
              >
                <Smartphone className="w-4 h-4" />
                手机登录
              </TabsTrigger>
              <TabsTrigger 
                value="email"
                className="data-[state=active]:bg-purple-600 data-[state=active]:text-white flex items-center gap-2"
              >
                <Mail className="w-4 h-4" />
                邮箱登录
              </TabsTrigger>
            </TabsList>

            {/* ========== 手机登录 Tab ========== */}
            <TabsContent value="phone" className="mt-0">
              <form onSubmit={handlePhoneLogin}>
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg text-white">手机验证码登录</CardTitle>
                  <CardDescription className="text-gray-400">
                    输入手机号获取验证码，新用户自动注册
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                      disabled={phoneLoginMutation.isPending || sendCodeMutation.isPending}
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
                        disabled={phoneLoginMutation.isPending}
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
                    disabled={phoneLoginMutation.isPending}
                  >
                    {phoneLoginMutation.isPending ? (
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
                  <p className="text-xs text-gray-500 text-center">
                    ✨ 未注册手机号验证后自动创建账号
                  </p>
                </CardFooter>
              </form>
            </TabsContent>

            {/* ========== 邮箱登录 Tab ========== */}
            <TabsContent value="email" className="mt-0">
              {/* 邮箱子Tab：登录 | 注册 */}
              <Tabs value={emailTab} onValueChange={(v) => setEmailTab(v as "login" | "register")} className="w-full">
                <div className="px-4">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-700/30 h-9">
                    <TabsTrigger value="login" className="data-[state=active]:bg-gray-600 text-sm">登录</TabsTrigger>
                    <TabsTrigger value="register" className="data-[state=active]:bg-gray-600 text-sm">注册</TabsTrigger>
                  </TabsList>
                </div>

                {/* 邮箱登录 */}
                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleEmailLogin}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg text-white">邮箱密码登录</CardTitle>
                      <CardDescription className="text-gray-400">使用邮箱和密码登录</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="text-gray-300">邮箱</Label>
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
                          className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 ${loginEmailError ? "border-red-500" : ""}`}
                        />
                        {loginEmailError && <p className="text-sm text-red-500">{loginEmailError}</p>}
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="login-password" className="text-gray-300">密码</Label>
                          <Link href="/forgot-password" className="text-xs text-purple-400 hover:underline">
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
                            disabled={emailLoginMutation.isPending}
                            className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 pr-10 ${loginPasswordError ? "border-red-500" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowLoginPassword(!showLoginPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {loginPasswordError && <p className="text-sm text-red-500">{loginPasswordError}</p>}
                      </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={emailLoginMutation.isPending}
                      >
                        {emailLoginMutation.isPending ? (
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
                      <p className="text-sm text-gray-400 text-center">
                        还没有账号？
                        <button
                          type="button"
                          onClick={() => setEmailTab("register")}
                          className="text-purple-400 hover:underline ml-1"
                        >
                          立即注册
                        </button>
                      </p>
                    </CardFooter>
                  </form>
                </TabsContent>

                {/* 邮箱注册 */}
                <TabsContent value="register" className="mt-0">
                  <form onSubmit={handleRegister}>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-lg text-white">邮箱注册</CardTitle>
                      <CardDescription className="text-gray-400">创建您的账户</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-email" className="text-gray-300">邮箱</Label>
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
                          className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 ${registerEmailError ? "border-red-500" : ""}`}
                        />
                        {registerEmailError && <p className="text-sm text-red-500">{registerEmailError}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-password" className="text-gray-300">密码</Label>
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
                            className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 pr-10 ${registerPasswordError ? "border-red-500" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showRegisterPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {registerPasswordError && <p className="text-sm text-red-500">{registerPasswordError}</p>}
                        {registerPassword && <PasswordStrengthIndicator password={registerPassword} />}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-confirm" className="text-gray-300">确认密码</Label>
                        <div className="relative">
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
                            className={`bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500 pr-10 ${registerConfirmError ? "border-red-500" : ""}`}
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
                          >
                            {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {registerConfirmError && <p className="text-sm text-red-500">{registerConfirmError}</p>}
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-name" className="text-gray-300">昵称（选填）</Label>
                        <Input
                          id="register-name"
                          type="text"
                          placeholder="请输入昵称"
                          value={registerName}
                          onChange={(e) => setRegisterName(e.target.value)}
                          disabled={registerMutation.isPending}
                          className="bg-gray-700/50 border-gray-600 text-white placeholder:text-gray-500"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        继续即表示您同意我们的{" "}
                        <Link href="/terms" className="text-purple-400 hover:underline">用户协议</Link>
                        {" "}和{" "}
                        <Link href="/privacy" className="text-purple-400 hover:underline">隐私政策</Link>。
                      </p>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-4">
                      <Button 
                        type="submit" 
                        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                        disabled={registerMutation.isPending}
                      >
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
                      <p className="text-sm text-gray-400 text-center">
                        已有账号？
                        <button
                          type="button"
                          onClick={() => setEmailTab("login")}
                          className="text-purple-400 hover:underline ml-1"
                        >
                          立即登录
                        </button>
                      </p>
                    </CardFooter>
                  </form>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md text-center text-sm text-gray-500 py-4 space-y-2 mt-4">
        <div className="flex justify-center gap-4">
          <Link href="/about" className="hover:text-gray-300">关于我们</Link>
          <Link href="/support" className="hover:text-gray-300">联系客服</Link>
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
