import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [searchEmail, setSearchEmail] = useState("");
  const [adjustUserId, setAdjustUserId] = useState<number | null>(null);
  const [adjustAmount, setAdjustAmount] = useState("");

  const { data: users, isLoading, refetch } = trpc.admin.listUsers.useQuery();

  const adjustCredits = trpc.admin.adjustUserCredits.useMutation({
    onSuccess: () => {
      toast.success("积分调整成功");
      setAdjustUserId(null);
      setAdjustAmount("");
      refetch();
    },
    onError: (error: any) => {
      toast.error("调整失败", {
        description: error.message,
      });
    },
  });

  // 检查权限
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    setLocation("/");
    return null;
  }

  const filteredUsers = users?.filter((u: any) => 
    !searchEmail || u.email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const handleAdjust = (userId: number) => {
    const amount = parseInt(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      toast.error("请输入有效的积分数量");
      return;
    }

    adjustCredits.mutate({
      userId,
      amount,
      reason: amount > 0 ? "管理员手动充值" : "管理员手动扣除",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">用户管理</h1>
          <Button variant="outline" onClick={() => setLocation("/")}>
            返回首页
          </Button>
        </div>
      </header>

      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>用户列表</CardTitle>
            <CardDescription>管理用户积分和查看用户信息</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="mb-6">
              <Label htmlFor="search">搜索用户</Label>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="输入邮箱搜索..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>姓名</TableHead>
                    <TableHead>邮箱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>购买积分</TableHead>
                    <TableHead>订阅积分</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers?.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>{u.id}</TableCell>
                      <TableCell>{u.name || "-"}</TableCell>
                      <TableCell>{u.email || "-"}</TableCell>
                      <TableCell>
                        <span className={u.role === "admin" ? "text-purple-600 font-medium" : ""}>
                          {u.role === "admin" ? "管理员" : "用户"}
                        </span>
                      </TableCell>
                      <TableCell>{u.purchasedCredits}</TableCell>
                      <TableCell>{u.subscriptionCredits}</TableCell>
                      <TableCell>
                        {adjustUserId === u.id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              placeholder="±积分"
                              value={adjustAmount}
                              onChange={(e) => setAdjustAmount(e.target.value)}
                              className="w-24"
                              disabled={adjustCredits.isPending}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleAdjust(u.id)}
                              disabled={adjustCredits.isPending}
                            >
                              {adjustCredits.isPending ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                "确认"
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAdjustUserId(null);
                                setAdjustAmount("");
                              }}
                              disabled={adjustCredits.isPending}
                            >
                              取消
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setAdjustUserId(u.id)}
                          >
                            调整积分
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
