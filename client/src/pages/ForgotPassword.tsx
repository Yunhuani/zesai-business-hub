import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AppFooter } from "@/components/layout/Footer";
import { AppHeader } from "@/components/layout/Navbar";
import { Input } from "@/components/ui/input";
import { APP_LOGO, APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import * as Icons from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [emailError, setEmailError] = useState("");

  const requestReset = trpc.passwordReset.requestReset.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      setSubmitted(true);
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
      // 所有错误都显示在输入框下方
      setEmailError(errorMessage);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError("");
    
    if (!email) {
      setEmailError("请输入邮箱地址");
      return;
    }
    requestReset.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-[var(--zs-bg)] text-[var(--zs-ink)]">
      <AppHeader />
      <main className="zs-container flex min-h-[560px] items-center justify-center py-16">
        <Card className="w-full max-w-md border-[var(--zs-line)] bg-[var(--zs-card)] p-8 shadow-[var(--zs-shadow-card)]">
        <div className="flex flex-col items-center mb-8">
          <img src={APP_LOGO} alt={APP_TITLE} className="h-12 mb-4" />
          <h1 className="text-2xl font-bold">忘记密码</h1>
          <p className="text-sm text-muted-foreground mt-2 text-center">
            输入您的邮箱地址，我们将发送重置密码的链接
          </p>
        </div>

        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">邮箱地址</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(""); // 输入时清除错误
                }}
                disabled={requestReset.isPending}
                required
                className={emailError ? "border-red-500" : ""}
              />
              {emailError && (
                <p className="text-sm text-red-500 mt-1">{emailError}</p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={requestReset.isPending}
            >
              {requestReset.isPending ? (
                <>
                  <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  发送中...
                </>
              ) : (
                "发送重置链接"
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
              <Icons.Mail className="w-8 h-8 text-[var(--zs-primary)]" />
            </div>
            <div>
              <h3 className="font-bold mb-2">邮件已发送</h3>
              <p className="text-sm text-muted-foreground mb-4">
                如果该邮箱已注册，您将收到重置密码的邮件。
                <br />
                请检查您的收件箱（包括垃圾邮件文件夹）。
              </p>
              <p className="text-xs text-muted-foreground">
                重置链接将在30分钟后过期
              </p>
            </div>
            <div className="pt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setSubmitted(false);
                  setEmail("");
                  setEmailError("");
                }}
              >
                重新发送
              </Button>
              <Link href="/login">
                <Button variant="ghost" className="w-full">
                  返回登录
                </Button>
              </Link>
            </div>
          </div>
        )}
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
