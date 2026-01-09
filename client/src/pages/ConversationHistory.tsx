import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { formatToBeijingTime } from "@/utils/formatTime";
import { Clock, MessageSquare, ArrowLeft, Target, FileText, TrendingUp, Lightbulb, DollarSign, Sparkles, Briefcase, GraduationCap, Users, Award, BarChart, Megaphone, Tag, Bot } from "lucide-react";
import { Link } from "wouter";

export default function ConversationHistory() {
  const { user, isAuthenticated } = useAuth();
  const { data: conversations, isLoading } = trpc.conversation.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-blue-50">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">请先登录</h2>
          <p className="text-muted-foreground mb-6">
            登录后即可查看您的对话历史记录
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              对话历史
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            <p className="mt-4 text-muted-foreground">加载中...</p>
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <Card className="p-12 text-center">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">暂无对话记录</h2>
            <p className="text-muted-foreground mb-6">
              开始与AI顾问对话，您的对话记录将显示在这里
            </p>
            <Link href="/">
              <Button>开始对话</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {conversations.map((conv) => (
              <Link key={conv.id} href={`/conversation/${conv.id}`}>
                <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                  <div className="flex items-start gap-4">
                    {/* Agent Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white flex-shrink-0">
                      {(() => {
                        const iconName = conv.agentIcon;
                        const iconProps = { className: "w-6 h-6" };
                        switch (iconName) {
                          case "Target": return <Target {...iconProps} />;
                          case "FileText": return <FileText {...iconProps} />;
                          case "TrendingUp": return <TrendingUp {...iconProps} />;
                          case "Lightbulb": return <Lightbulb {...iconProps} />;
                          case "DollarSign": return <DollarSign {...iconProps} />;
                          case "Sparkles": return <Sparkles {...iconProps} />;
                          case "Briefcase": return <Briefcase {...iconProps} />;
                          case "GraduationCap": return <GraduationCap {...iconProps} />;
                          case "Users": return <Users {...iconProps} />;
                          case "Award": return <Award {...iconProps} />;
                          case "BarChart": return <BarChart {...iconProps} />;
                          case "Megaphone": return <Megaphone {...iconProps} />;
                          case "Tag": return <Tag {...iconProps} />;
                          case "Bot": return <Bot {...iconProps} />;
                          default: return <Bot {...iconProps} />;
                        }
                      })()}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg truncate">
                          {conv.agentName}
                        </h3>
                        <span className="text-sm text-muted-foreground flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-4 h-4" />
                          {formatToBeijingTime(conv.updatedAt)}
                        </span>
                      </div>
                      <p className="text-muted-foreground truncate">
                        {conv.title}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
