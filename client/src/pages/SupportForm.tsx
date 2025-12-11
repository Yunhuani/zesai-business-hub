import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

const issueTypeMap = {
  technical: "技术问题",
  account: "账户问题",
  payment: "支付问题",
  feature: "功能建议",
  other: "其他问题",
};

export default function SupportForm() {
  const { user } = useAuth();
  const [userName, setUserName] = useState(user?.name || "");
  const [userEmail, setUserEmail] = useState(user?.email || "");
  const [issueType, setIssueType] = useState<keyof typeof issueTypeMap>("technical");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitTicket = trpc.support.submitTicket.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      toast.success("提交成功！我们会尽快通过邮件回复您");
    },
    onError: (error) => {
      toast.error("提交失败：" + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!userName.trim()) {
      toast.error("请输入姓名");
      return;
    }

    if (!userEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
      toast.error("请输入有效的邮箱地址");
      return;
    }

    if (description.trim().length < 10) {
      toast.error("问题描述至少10个字符");
      return;
    }

    submitTicket.mutate({
      userName: userName.trim(),
      userEmail: userEmail.trim(),
      issueType,
      description: description.trim(),
    });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">提交成功！</CardTitle>
            <CardDescription>
              我们已收到您的问题，会尽快通过邮件回复您。
              <br />
              请留意邮箱 <strong>{userEmail}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => (window.location.href = "/")} variant="outline">
              返回首页
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 p-4 py-12">
      <div className="container max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">联系客服</CardTitle>
            <CardDescription>
              遇到问题或有建议？请填写以下表单，我们会尽快通过邮件回复您。
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 姓名 */}
              <div className="space-y-2">
                <Label htmlFor="userName">姓名 *</Label>
                <Input
                  id="userName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="请输入您的姓名"
                  required
                />
              </div>

              {/* 邮箱 */}
              <div className="space-y-2">
                <Label htmlFor="userEmail">邮箱 *</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="请输入您的邮箱地址"
                  required
                />
                <p className="text-sm text-muted-foreground">我们会通过此邮箱回复您</p>
              </div>

              {/* 问题类型 */}
              <div className="space-y-2">
                <Label htmlFor="issueType">问题类型 *</Label>
                <Select
                  value={issueType}
                  onValueChange={(value) => setIssueType(value as keyof typeof issueTypeMap)}
                >
                  <SelectTrigger id="issueType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(issueTypeMap).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 问题描述 */}
              <div className="space-y-2">
                <Label htmlFor="description">问题描述 *</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="请详细描述您遇到的问题或建议（至少10个字符）"
                  rows={6}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  {description.length}/10 字符（最少10个字符）
                </p>
              </div>

              {/* 提交按钮 */}
              <div className="flex gap-4">
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitTicket.isPending}
                >
                  {submitTicket.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      提交中...
                    </>
                  ) : (
                    "提交"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => (window.location.href = "/")}
                >
                  取消
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
