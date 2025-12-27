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
      window.location.href = getLoginUrl();
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
              <h1 className="text-2xl font-bold">历史记录</h1>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">欢迎, {user.name}</span>
            </div>
          )}
        </div>
      </header>

      <div className="container py-8 max-w-4xl">
        {conversationsLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-4">
            {conversations.map((conv) => {
              const IconComponent = (Icons as any)[conv.agentIcon || "Sparkles"] || Icons.Sparkles;
              return (
                <Card
                  key={conv.id}
                  className="hover:shadow-lg transition-shadow cursor-pointer"
                >
                  <Link href={`/conversation/${conv.id}`}>
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                          <IconComponent className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg">{conv.title}</CardTitle>
                          <CardDescription className="flex items-center gap-2 mt-1">
                            <span>{conv.agentName}</span>
                            <span>•</span>
                            <span>{new Date(conv.createdAt).toLocaleDateString()}</span>
                          </CardDescription>
                        </div>
                        <Icons.ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </CardHeader>
                  </Link>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="py-20 text-center">
              <Icons.MessageSquareOff className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">暂无历史记录</h3>
              <p className="text-muted-foreground mb-6">开始与AI顾问对话,创建您的第一个咨询记录</p>
              <Button asChild>
                <Link href="/">
                  <Icons.Home className="w-4 h-4 mr-2" />
                  返回首页
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
