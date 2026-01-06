import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { APP_TITLE } from "@/const";
import { trpc } from "@/lib/trpc";
import { Clock, MessageSquare, ArrowLeft, Target, TrendingUp, Users, Lightbulb, DollarSign, Briefcase, GraduationCap, Compass } from "lucide-react";
import { Link } from "wouter";

// 根据Agent名称返回对应的图标
const getAgentIcon = (agentName: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    "战略规划专家": <Target className="w-6 h-6" />,
    "融资BP与路演": <TrendingUp className="w-6 h-6" />,
    "竞品分析专家": <Users className="w-6 h-6" />,
    "商业模式设计": <Lightbulb className="w-6 h-6" />,
    "一人公司顾问": <Briefcase className="w-6 h-6" />,
    "品牌营销策划师": <MessageSquare className="w-6 h-6" />,
    "获客增长专家": <TrendingUp className="w-6 h-6" />,
    "业务营收增长专家": <DollarSign className="w-6 h-6" />,
    "小红书/抖音/视频号运营专家": <MessageSquare className="w-6 h-6" />,
    "股权架构师": <Users className="w-6 h-6" />,
    "薪酬绩效专家": <DollarSign className="w-6 h-6" />,
    "OKR目标管理教练": <Target className="w-6 h-6" />,
    "大类资产投资顾问": <DollarSign className="w-6 h-6" />,
    "职业路径规划师": <GraduationCap className="w-6 h-6" />,
    "高考专业规划师": <GraduationCap className="w-6 h-6" />,
    "创业商机顾问": <Compass className="w-6 h-6" />,
  };
  return iconMap[agentName] || <Target className="w-6 h-6" />;
};

export default function ConversationHistory() {
  const { user, isAuthenticated } = useAuth();
  const { data: conversations, isLoading } = trpc.conversation.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  // 转换为北京时间（UTC+8）
  const formatBeijingTime = (dateString: string) => {
    const date = new Date(dateString);
    
    return date.toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Shanghai"
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Card className="p-8 max-w-md text-center bg-slate-900/50 backdrop-blur-sm border-slate-800">
          <h2 className="text-2xl font-bold mb-4 text-white">请先登录</h2>
          <p className="text-slate-400 mb-6">
            登录后即可查看您的对话历史记录
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="bg-slate-900/50 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm" className="text-slate-300 hover:text-white">
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回首页
              </Button>
            </Link>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
              对话历史
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
            <p className="mt-4 text-slate-400">加载中...</p>
          </div>
        ) : !conversations || conversations.length === 0 ? (
          <Card className="p-12 text-center bg-slate-900/50 backdrop-blur-sm border-slate-800">
            <MessageSquare className="w-16 h-16 mx-auto mb-4 text-slate-500" />
            <h2 className="text-xl font-semibold mb-2 text-white">暂无对话记录</h2>
            <p className="text-slate-400 mb-6">
              开始与AI顾问对话，您的对话记录将显示在这里
            </p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
                开始对话
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {conversations.map((conv) => (
              <Link key={conv.id} href={`/conversation/${conv.id}`}>
                <Card className="p-6 hover:shadow-xl hover:shadow-purple-500/10 transition-all cursor-pointer bg-slate-900/50 backdrop-blur-sm border-slate-800 hover:border-purple-500/50">
                  <div className="flex items-start gap-4">
                    {/* Agent Icon */}
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                      {getAgentIcon(conv.agentName)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg truncate text-white">
                          {conv.agentName}
                        </h3>
                        <span className="text-sm text-slate-400 flex items-center gap-1 flex-shrink-0">
                          <Clock className="w-4 h-4" />
                          {formatBeijingTime(conv.updatedAt)}
                        </span>
                      </div>
                      <p className="text-slate-400 truncate">
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
