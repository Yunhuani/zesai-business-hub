import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { Loader2, User, Mail, Calendar, Coins, MessageSquare, Users } from "lucide-react";
import * as Icons from "lucide-react";

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: number;
}

export function UserDetailDialog({ open, onOpenChange, userId }: UserDetailDialogProps) {
  const { data, isLoading } = trpc.admin.getUserDetail.useQuery(
    { userId },
    { enabled: open && !!userId }
  );

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className="w-4 h-4" /> : <Icons.Bot className="w-4 h-4" />;
  };

  const getPlanLabel = (plan: string) => {
    const labels: Record<string, string> = {
      free: "免费版",
      basic: "基础版",
      professional: "专业版",
      enterprise: "企业版",
    };
    return labels[plan] || plan;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            用户详情
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* 用户基本信息 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">基本信息</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">姓名：</span>
                    <span>{data.user.name || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">邮箱：</span>
                    <span>{data.user.email || "-"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">注册时间：</span>
                    <span>{formatDate(data.user.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">最后登录：</span>
                    <span>{formatDate(data.user.lastSignedIn)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">积分余额：</span>
                    <span className="font-semibold">
                      {(data.user.creditsSubscription || 0) + (data.user.creditsPurchased || 0)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      (订阅: {data.user.creditsSubscription || 0} / 购买: {data.user.creditsPurchased || 0})
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">订阅套餐：</span>
                    <Badge variant={data.subscription?.plan === "professional" ? "default" : "secondary"}>
                      {data.subscription ? getPlanLabel(data.subscription.plan) : "免费版"}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 使用统计 */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{data.stats.totalConversations}</div>
                    <div className="text-xs text-muted-foreground">总对话数</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{data.stats.totalMessages}</div>
                    <div className="text-xs text-muted-foreground">总消息数</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{data.stats.agentCount}</div>
                    <div className="text-xs text-muted-foreground">使用顾问数</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Agent访问记录 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  顾问访问记录
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.agentVisits.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>顾问名称</TableHead>
                          <TableHead className="text-center">对话次数</TableHead>
                          <TableHead className="text-center">消息数</TableHead>
                          <TableHead>最近访问</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.agentVisits.map((visit) => (
                          <TableRow key={visit.agentId}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getIconComponent(visit.agentIcon)}
                                <span>{visit.agentName}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{visit.conversationCount}</TableCell>
                            <TableCell className="text-center">{visit.messageCount}</TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {formatDate(visit.lastVisit)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无访问记录</div>
                )}
              </CardContent>
            </Card>

            {/* 最近对话 */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">最近对话</CardTitle>
              </CardHeader>
              <CardContent>
                {data.recentConversations.length > 0 ? (
                  <div className="space-y-2">
                    {data.recentConversations.map((conv) => (
                      <div
                        key={conv.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {getIconComponent(conv.agentIcon)}
                          <div>
                            <div className="font-medium text-sm">{conv.title}</div>
                            <div className="text-xs text-muted-foreground">{conv.agentName}</div>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">{formatDate(conv.createdAt)}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">暂无对话记录</div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12 text-muted-foreground">加载失败</div>
        )}
      </DialogContent>
    </Dialog>
  );
}
