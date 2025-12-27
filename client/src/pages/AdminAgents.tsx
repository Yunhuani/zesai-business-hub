import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminAgents() {
  const [, setLocation] = useLocation();
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: agents, isLoading, refetch } = trpc.admin.agents.list.useQuery(undefined, {
    enabled: isAuthenticated && user?.role === "admin",
  });

  const [editingAgent, setEditingAgent] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    icon: "",
    systemPrompt: "",
    inputFields: "",
  });

  const updateMutation = trpc.admin.agents.update.useMutation({
    onSuccess: () => {
      toast.success("Agent 更新成功!");
      setEditingAgent(null);
      refetch();
    },
    onError: (error) => {
      toast.error("更新失败: " + error.message);
    },
  });

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    } else if (!authLoading && isAuthenticated && user?.role !== "admin") {
      setLocation("/");
    }
  }, [authLoading, isAuthenticated, user, setLocation]);

  useEffect(() => {
    if (editingAgent) {
      setFormData({
        name: editingAgent.name || "",
        description: editingAgent.description || "",
        icon: editingAgent.icon || "",
        systemPrompt: editingAgent.systemPrompt || "",
        inputFields: editingAgent.inputFields || "",
      });
    }
  }, [editingAgent]);

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return null;
  }

  const handleSave = () => {
    if (!editingAgent) return;
    updateMutation.mutate({
      id: editingAgent.id,
      ...formData,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Agent 管理
            </h1>
          </div>
        </div>
      </header>

      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {agents?.map((agent) => (
            <Card key={agent.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {agent.icon && <span>{agent.icon}</span>}
                      {agent.name}
                    </CardTitle>
                    <CardDescription className="mt-2">{agent.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setEditingAgent(agent)}
                >
                  <Icons.Edit className="w-4 h-4 mr-2" />
                  编辑
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingAgent} onOpenChange={(open) => !open && setEditingAgent(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>编辑 Agent: {editingAgent?.name}</DialogTitle>
            <DialogDescription>修改 Agent 的配置和提示词</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">图标 (Emoji)</Label>
              <Input
                id="icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="例如: 🎯"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="systemPrompt">系统提示词</Label>
              <Textarea
                id="systemPrompt"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                rows={10}
                placeholder="输入 Agent 的系统提示词..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inputFields">输入字段配置 (JSON格式)</Label>
              <Textarea
                id="inputFields"
                value={formData.inputFields}
                onChange={(e) => setFormData({ ...formData, inputFields: e.target.value })}
                rows={6}
                placeholder='[{"name":"companyName","label":"公司名称","type":"text"}]'
              />
              <p className="text-xs text-muted-foreground">
                格式示例: {`[{"name":"field1","label":"字段标签","type":"text"}]`}
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingAgent(null)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Icons.Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  保存中...
                </>
              ) : (
                "保存"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
