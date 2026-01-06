import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useEffect } from "react";
import { Link } from "wouter";

export default function History() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const { data: conversations, isLoading: conversationsLoading } = trpc.conversation.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      setTimeout(() => window.location.href = getLoginUrl(), 0);
    }
  }, [authLoading, isAuthenticated]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/">
                <Icons.ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <Icons.History className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">对话历史</h1>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">欢迎, {user.name}</span>
            </div>
          )}
        </div>
      </header>

      <div className="container py-8 max-w-5xl">
        {conversationsLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-3">
            {conversations.map((conv) => {
              const IconComponent = (Icons as any)[conv.agentIcon || "Sparkles"] || Icons.Sparkles;
              return (
                <Link key={conv.id} href={`/conversation/${conv.id}`}>
                  <div className="glass-effect rounded-xl p-4 hover:bg-white/[0.08] transition-all cursor-pointer border border-white/[0.05] hover:border-purple-500/30">
                    <div className="flex items-center gap-4">
                      {/* Agent图标 */}
                      <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-7 h-7 text-white" />
                      </div>
                      
                      {/* 对话信息 */}
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1 truncate">{conv.title}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="truncate">{conv.agentName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Icons.Clock className="w-3.5 h-3.5" />
                            {new Date(conv.updatedAt).toLocaleString('zh-CN', { 
                              timeZone: 'Asia/Shanghai',
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                      
                      {/* 箭头图标 */}
                      <Icons.ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="glass-effect rounded-xl p-12 text-center border border-white/[0.05]">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Icons.MessageSquareOff className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">暂无历史记录</h3>
            <p className="text-muted-foreground mb-6">开始与AI顾问对话，创建您的第一个咨询记录</p>
            <Button asChild size="lg">
              <Link href="/">
                <Icons.Home className="w-4 h-4 mr-2" />
                返回首页
              </Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
