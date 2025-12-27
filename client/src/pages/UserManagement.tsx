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
import { AdjustCreditsDialog } from "@/components/AdjustCreditsDialog";
import { trpc } from "@/lib/trpc";
import { Loader2, Search, Coins } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export default function UserManagement() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [searchEmail, setSearchEmail] = useState("");
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: number;
    name: string;
    credits: {
      subscription: number;
      purchased: number;
      total: number;
    };
  } | null>(null);

  const { data: users, isLoading } = trpc.admin.listUsers.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  // 检查权限
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== "admin")) {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "admin") {
    return null;
  }

  const filteredUsers = users?.filter((u: any) => 
    !searchEmail || u.email?.toLowerCase().includes(searchEmail.toLowerCase())
  );

  const handleOpenAdjustDialog = (u: any) => {
    setSelectedUser({
      id: u.id,
      name: u.name || u.email || `用户${u.id}`,
      credits: {
        subscription: u.creditsSubscription || 0,
        purchased: u.creditsPurchased || 0,
        total: (u.creditsSubscription || 0) + (u.creditsPurchased || 0),
      },
    });
    setAdjustDialogOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            用户管理
          </h1>
          <Button variant="outline" onClick={() => setLocation("/admin")}>
            返回管理后台
          </Button>
        </div>
      </header>

      <div className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5 text-purple-600" />
              用户列表
            </CardTitle>
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
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>姓名</TableHead>
                      <TableHead>邮箱</TableHead>
                      <TableHead>角色</TableHead>
                      <TableHead>订阅套餐</TableHead>
                      <TableHead className="text-right">总积分</TableHead>
                      <TableHead className="text-right">订阅积分</TableHead>
                      <TableHead className="text-right">购买积分</TableHead>
                      <TableHead>注册时间</TableHead>
                      <TableHead>最后登录</TableHead>
                      <TableHead className="text-center">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers && filteredUsers.length > 0 ? (
                      filteredUsers.map((u: any) => {
                        const totalCredits = (u.creditsSubscription || 0) + (u.creditsPurchased || 0);
                        return (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.id}</TableCell>
                            <TableCell>{u.name || "-"}</TableCell>
                            <TableCell>{u.email || "-"}</TableCell>
                            <TableCell>
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                u.role === "admin" 
                                  ? "bg-purple-100 text-purple-700" 
                                  : "bg-gray-800 text-gray-300"
                              }`}>
                                {u.role === "admin" ? "管理员" : "用户"}
                              </span>
                            </TableCell>
                            <TableCell>
                              {u.subscription ? (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  u.subscription.plan === "enterprise" ? "bg-orange-100 text-orange-700" :
                                  u.subscription.plan === "professional" ? "bg-purple-100 text-purple-700" :
                                  u.subscription.plan === "basic" ? "bg-blue-100 text-blue-700" :
                                  "bg-gray-800 text-gray-300"
                                }`}>
                                  {u.subscription.plan === "enterprise" ? "企业版" :
                                   u.subscription.plan === "professional" ? "专业版" :
                                   u.subscription.plan === "basic" ? "基础版" : "免费版"}
                                </span>
                              ) : (
                                <span className="px-2 py-1 rounded text-xs font-medium bg-gray-800 text-gray-300">免费版</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {totalCredits}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {u.creditsSubscription || 0}
                            </TableCell>
                            <TableCell className="text-right text-muted-foreground">
                              {u.creditsPurchased || 0}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(u.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(u.lastSignedIn).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenAdjustDialog(u)}
                                className="hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300"
                              >
                                <Coins className="w-4 h-4 mr-1" />
                                调整积分
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          {searchEmail ? "未找到匹配的用户" : "暂无用户数据"}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Adjust Credits Dialog */}
      {selectedUser && (
        <AdjustCreditsDialog
          open={adjustDialogOpen}
          onOpenChange={setAdjustDialogOpen}
          userId={selectedUser.id}
          userName={selectedUser.name}
          currentCredits={selectedUser.credits}
        />
      )}
    </div>
  );
}
