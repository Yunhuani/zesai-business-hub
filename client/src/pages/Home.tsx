import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_TITLE, getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import * as Icons from "lucide-react";
import { useState } from "react";
import { ExpertConsultationDialog } from "@/components/ExpertConsultationDialog";
import { Link } from "wouter";

// Agent分类配置
const AGENT_CATEGORIES = [
  {
    id: "strategy",
    name: "战略与规划",
    icon: "Target",
    description: "企业战略、商业模式、融资路演、竞品分析、一人公司",
    agentNames: ["战略规划", "融资BP与路演", "竞品分析专家", "商业模式设计", "一人公司顾问"],
    defaultOpen: true,
    colors: {
      gradient: "from-purple-600 to-blue-600",
      iconBg: "bg-gradient-to-br from-purple-600 to-blue-600",
      cardBorder: "hover:border-purple-500/50",
      text: "text-purple-600",
    },
  },
  {
    id: "marketing",
    name: "营销与增长",
    icon: "TrendingUp",
    description: "品牌营销、获客增长、营收增长、流量运营",
    agentNames: ["品牌营销策划师", "获客增长专家", "营收增长专家", "流量运营专家"],
    defaultOpen: false,
    colors: {
      gradient: "from-green-600 to-emerald-500",
      iconBg: "bg-gradient-to-br from-green-600 to-emerald-500",
      cardBorder: "hover:border-green-500/50",
      text: "text-green-600",
    },
  },
  {
    id: "operation",
    name: "运营与管理",
    icon: "Users",
    description: "股权架构、绩效管理、用户需求洞察",
    agentNames: ["股权架构设计", "绩效管理与激励", "用户需求洞察"],
    defaultOpen: false,
    colors: {
      gradient: "from-blue-600 to-cyan-500",
      iconBg: "bg-gradient-to-br from-blue-600 to-cyan-500",
      cardBorder: "hover:border-blue-500/50",
      text: "text-blue-600",
    },
  },
  {
    id: "investment",
    name: "投资与机会",
    icon: "Lightbulb",
    description: "资产配置、职业规划、高考志愿、创业商机",
    agentNames: ["大类资产投资顾问", "职业路径规划师", "高考专业规划师", "创业商机雷达"],
    defaultOpen: false,
    colors: {
      gradient: "from-orange-600 to-amber-500",
      iconBg: "bg-gradient-to-br from-orange-600 to-amber-500",
      cardBorder: "hover:border-orange-500/50",
      text: "text-orange-600",
    },
  },
];

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery();
  const logoutMutation = trpc.auth.logout.useMutation();
  
  // 控制每个分类的展开/折叠状态
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>(
    Object.fromEntries(AGENT_CATEGORIES.map(cat => [cat.id, cat.defaultOpen]))
  );
  const [expertDialogOpen, setExpertDialogOpen] = useState(false);

  const toggleCategory = (categoryId: string) => {
    setOpenCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  // 按分类组织agents
  const getAgentsByCategory = (categoryAgentNames: string[]) => {
    if (!agents) return [];
    return agents.filter(agent => categoryAgentNames.includes(agent.name));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/zenith-icon-only.png" alt="泽思AI" className="w-10 h-10 rounded-lg" />
            <h1 className="text-2xl font-bold">泽思 Zenith AI</h1>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <>
                {user?.role === "admin" && (
                  <Link href="/admin">
                    <Button variant="outline" className="gap-2">
                      <Icons.Settings className="w-4 h-4" />
                      管理后台
                    </Button>
                  </Link>
                )}
                <Link href="/pricing">
                  <Button variant="outline" className="gap-2">
                    <Icons.Sparkles className="w-4 h-4" />
                    升级套餐
                  </Button>
                </Link>
                <Link href="/history">
                  <Button variant="ghost" className="gap-2">
                    <Icons.History className="w-4 h-4" />
                    历史记录
                  </Button>
                </Link>
              </>
            )}
            {loading ? (
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Icons.User className="w-4 h-4" />
                    {user?.name || user?.email || user?.username}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>我的账号</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    {user?.email && <div>邮箱: {user.email}</div>}
                    {user?.username && <div>用户名: {user.username}</div>}
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-red-600 focus:text-red-600"
                    onClick={() => {
                      logoutMutation.mutate(undefined, {
                        onSuccess: () => {
                          window.location.href = '/email-login';
                        },
                      });
                    }}
                  >
                    <Icons.LogOut className="w-4 h-4 mr-2" />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button asChild>
                <a href="/email-login">登录</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-16 text-center">
        <h2 className="text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
          您的AI商业顾问
        </h2>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          麦肯锡级别的专业咨询服务,随时为您的企业提供战略规划、商业模式设计、市场洞察等全方位支持
        </p>
      </section>

      {/* Agents by Category */}
      <section className="container pb-20">
        {agentsLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 max-w-6xl mx-auto">
            {AGENT_CATEGORIES.map((category) => {
              const CategoryIcon = (Icons as any)[category.icon] || Icons.Folder;
              const categoryAgents = getAgentsByCategory(category.agentNames);
              const isOpen = openCategories[category.id];

              return (
                <Collapsible
                  key={category.id}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <Card className="border-2 overflow-hidden">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-lg ${category.colors.iconBg} flex items-center justify-center`}>
                              <CategoryIcon className="w-6 h-6 text-white" />
                            </div>
                            <div className="text-left">
                              <CardTitle className="text-2xl flex items-center gap-2">
                                {category.name}
                                <span className="text-sm font-normal text-muted-foreground">
                                  ({categoryAgents.length}个顾问)
                                </span>
                              </CardTitle>
                              <CardDescription className="text-base mt-1">
                                {category.description}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isOpen ? (
                              <Icons.ChevronUp className="w-6 h-6 text-muted-foreground" />
                            ) : (
                              <Icons.ChevronDown className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <CardContent className="pt-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {categoryAgents.map((agent) => {
                            const IconComponent = (Icons as any)[agent.icon] || Icons.Sparkles;
                            return (
                              <Card
                                key={agent.id}
                                className={`group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border ${category.colors.cardBorder}`}
                              >
                                <Link href={`/agent/${agent.id}`}>
                                  <CardHeader>
                                    <div className="flex items-start gap-3">
                                      <div className={`w-12 h-12 rounded-lg ${category.colors.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                                        <IconComponent className="w-6 h-6 text-white" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <CardTitle className={`text-lg mb-2 group-hover:${category.colors.text} transition-colors`}>
                                          {agent.name}
                                        </CardTitle>
                                        <CardDescription className="text-sm line-clamp-2">
                                          {agent.description}
                                        </CardDescription>
                                      </div>
                                    </div>
                                  </CardHeader>
                                  <CardContent>
                                    <div className={`flex items-center text-sm ${category.colors.text} font-medium group-hover:gap-2 transition-all`}>
                                      开始咨询
                                      <Icons.ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                  </CardContent>
                                </Link>
                              </Card>
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </section>

      {/* Expert Consultation CTA */}
      <section className="container pb-16">
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-blue-50 max-w-3xl mx-auto">
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center">
              <Icons.Users className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl">需要人工专家指导？</CardTitle>
            <CardDescription className="text-base mt-2">
              我们的专家顾问团队随时为您提供一对一的专业咨询服务
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
              onClick={() => setExpertDialogOpen(true)}
            >
              <Icons.MessageCircle className="w-5 h-5 mr-2" />
              联系专家顾问
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-white/50">
        <div className="container text-center text-sm text-muted-foreground space-y-2">
          <div>© 2025 泽思 Zenith AI - 专业AI商业咨询平台</div>
          <div>
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              沪ICP备2024048847号
            </a>
          </div>
        </div>
      </footer>

      <ExpertConsultationDialog 
        open={expertDialogOpen} 
        onOpenChange={setExpertDialogOpen} 
      />
    </div>
  );
}
