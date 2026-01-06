import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Loader2, LogIn, UserPlus } from "lucide-react";
import { Link } from "wouter";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function EmailLogin() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [registerName, setRegisterName] = useState("");

  const loginMutation = trpc.auth.loginWithEmail.useMutation({
    onSuccess: (data) => {
      // Save token to localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      toast.success("登录成功");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "登录失败");
    },
  });

  const registerMutation = trpc.auth.registerWithEmail.useMutation({
    onSuccess: (data) => {
      // Save token to localStorage
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      toast.success("注册成功，已自动登录");
      setLocation("/");
    },
    onError: (error) => {
      toast.error(error.message || "注册失败");
    },
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("请输入邮箱和密码");
      return;
    }
    loginMutation.mutate({ email: loginEmail, password: loginPassword });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!registerEmail || !registerPassword) {
      toast.error("请输入邮箱和密码");
      return;
    }
    if (registerPassword.length < 6) {
      toast.error("密码长度至少6位");
      return;
    }
    if (registerPassword !== registerConfirmPassword) {
      toast.error("两次输入的密码不一致");
      return;
    }
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
                      onChange={(e) => setLoginEmail(e.target.value)}
                      disabled={loginMutation.isPending}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">密码</Label>
                      <Link href="/forgot-password" className="text-xs text-blue-600 hover:underline">
                        忘记密码？
                      </Link>
                    </div>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="请输入密码"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loginMutation.isPending}
                      autoComplete="current-password"
                    />
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
                      className="text-purple-600 hover:underline ml-1"
                      onClick={() => setActiveTab("register")}
                    >
                      立即注册
                    </button>
                  </div>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          {/* Register Tab */}
          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>注册账号</CardTitle>
                <CardDescription>创建新账号开始使用</CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-email">邮箱</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="请输入邮箱地址"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      disabled={registerMutation.isPending}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">密码</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="至少6位密码"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      disabled={registerMutation.isPending}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">确认密码</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="再次输入密码"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      disabled={registerMutation.isPending}
                      autoComplete="new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-name">昵称（可选）</Label>
                    <Input
                      id="register-name"
                      type="text"
                      placeholder="显示名称"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      disabled={registerMutation.isPending}
                      autoComplete="name"
                    />
                  </div>
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
                      className="text-purple-600 hover:underline ml-1"
                      onClick={() => setActiveTab("login")}
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
      <footer className="w-full py-6 mt-8">
        <div className="text-center text-sm text-muted-foreground space-y-3">
          <div className="flex justify-center gap-6">
            <a 
              href="/about" 
              className="hover:text-foreground transition-colors"
            >
              关于我们
            </a>
            <a 
              href="/support" 
              className="hover:text-foreground transition-colors"
            >
              联系客服
            </a>
            <a 
              href="/pricing" 
              className="hover:text-foreground transition-colors"
            >
              价格套餐
            </a>
          </div>
          <div>© 2025 泽思 Zenith AI - 专业AI商业咨询平台</div>
          <div>
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              沪ICP备2024048847号
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
