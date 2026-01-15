import { useAuth } from "@/_core/hooks/useAuth";
// Version: 2024-12-30 - 统一业务营收增长专家名称
import React from "react";
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
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { SmartAssistantSearch } from "@/components/SmartAssistantSearch";
import { Link } from "wouter";
import { WeChatBrowserGuide } from "@/components/WeChatBrowserGuide";
import { isWeChatBrowser } from "@/utils/wechatDetector";
import { trackConversion, ConversionEvents, trackAgent, AgentEvents } from "@/lib/analytics";
import { useEffect } from "react";
import { DataWaveBackground } from "@/components/DataWaveBackground";

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
    agentNames: ["品牌营销策划师", "流量增长获客专家", "业务营收增长专家", "抖音爆款操盘手", "小红书种草专家", "视频号私域增长专家"],
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
    description: "股权架构、薪酬绩效、OKR目标管理",
    agentNames: ["股权架构师", "薪酬绩效专家", "OKR目标管理教练"],
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
    agentNames: ["大类资产投资顾问", "职业路径规划师", "高考专业规划师", "创业商机顾问"],
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
  const { user, loading, isAuthenticated, logout } = useAuth();
  const [isInWeChatBrowser] = useState(isWeChatBrowser());
  const { data: agents, isLoading: agentsLoading } = trpc.agent.list.useQuery();
  
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

  // 场景化引导配置
  const SCENARIO_CHIPS = [
    { id: 'money', label: '💰 我要搞钱', targetCategory: 'strategy' },
    { id: 'traffic', label: '📈 我要流量', targetCategory: 'marketing' },
    { id: 'manage', label: '🏢 我要管理', targetCategory: 'operation' },
    { id: 'opportunity', label: '💡 寻找机会', targetCategory: 'investment' },
  ];

  // 点击场景胶囊：展开对应分类并滚动
  const handleScenarioClick = (targetCategory: string) => {
    // 展开目标分类
    setOpenCategories(prev => ({
      ...prev,
      [targetCategory]: true,
    }));
    // 滚动到目标分类
    setTimeout(() => {
      const element = document.getElementById(`category-${targetCategory}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // 按分类组织agents
  const getAgentsByCategory = (categoryAgentNames: string[]) => {
    if (!agents) return [];
    return agents.filter(agent => categoryAgentNames.includes(agent.name));
  };

  // 追踪首页访问
  useEffect(() => {
    trackConversion(ConversionEvents.HOME_VISIT);
  }, []);

  return (
    <div className="min-h-screen bg-background relative">
      {/* 数据波纹背景 */}
      <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 0 }}>
        <DataWaveBackground />
      </div>
      {/* Header */}
      <header className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-3 md:py-4 flex items-center justify-between">
          {/* Logo区域 */}
          <div className="flex items-center gap-2 md:gap-3">
            <img src="/zenith-icon-only.png" alt="泽思AI" className="w-8 h-8 md:w-10 md:h-10 rounded-xl" />
            <h1 className="hidden sm:block text-xl md:text-2xl font-bold">泽思 Zenith AI</h1>
          </div>
          
          {/* 右侧操作区 */}
          <div className="flex items-center gap-2 md:gap-4">
            {isAuthenticated && (
              <>
                {/* 积分显示 - 移动端简化 */}
                <CreditsDisplay />
                
                {/* 桌面端显示完整按钮 */}
                <div className="hidden md:flex items-center gap-4">
                  {user?.role === "admin" && (
                    <Link href="/admin">
                      <Button variant="outline" className="gap-2">
                        <Icons.Settings className="w-4 h-4" />
                        管理后台
                      </Button>
                    </Link>
                  )}
                  <Link href="/history">
                    <Button variant="outline" className="gap-2">
                      <Icons.History className="w-4 h-4" />
                      历史记录
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="outline" className="gap-2">
                      <Icons.Sparkles className="w-4 h-4" />
                      升级套餐
                    </Button>
                  </Link>
                </div>
                
                {/* 移动端汉堡菜单 */}
                <div className="md:hidden">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Icons.Menu className="w-5 h-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {user?.role === "admin" && (
                        <DropdownMenuItem asChild>
                          <Link href="/admin" className="flex items-center cursor-pointer">
                            <Icons.Settings className="w-4 h-4 mr-2" />
                            管理后台
                          </Link>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem asChild>
                        <Link href="/history" className="flex items-center cursor-pointer">
                          <Icons.History className="w-4 h-4 mr-2" />
                          历史记录
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/pricing" className="flex items-center cursor-pointer">
                          <Icons.Sparkles className="w-4 h-4 mr-2" />
                          升级套餐
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={async () => {
                          await logout();
                          setTimeout(() => {
                            window.location.href = '/email-login';
                          }, 0);
                        }}
                      >
                        <Icons.LogOut className="w-4 h-4 mr-2" />
                        退出登录
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            )}
            {loading ? (
              <div className="w-6 h-6 md:w-8 md:h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            ) : isAuthenticated ? (
              /* 桌面端用户菜单 */
              <div className="hidden md:block">
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
                      onClick={async () => {
                        await logout();
                        setTimeout(() => {
                          window.location.href = '/email-login';
                        }, 0);
                      }}
                    >
                      <Icons.LogOut className="w-4 h-4 mr-2" />
                      退出登录
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button asChild size="sm" className="md:size-default">
                <a href="/email-login">登录</a>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-10 md:py-20 text-center relative overflow-hidden">

        
        {/* WeChat Browser Guide */}
        {isInWeChatBrowser && <WeChatBrowserGuide />}
        
        <div className="animate-fade-in-up">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold mb-4 md:mb-8 bg-gradient-to-r from-purple-600 via-blue-600 to-pink-600 bg-clip-text text-transparent leading-tight">
            您的AI商业顾问
          </h2>
          <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-muted-foreground max-w-3xl mx-auto mb-6 md:mb-12 leading-relaxed px-2">
            将全球顶级咨询公司的方法论，与前沿AI大模型相结合。提供麦肯锡级别的战略规划、品牌营销、增长策略、融资规划等全流程解决方案。
          </p>
          
          {/* 智能搜索框 - 移至Hero区域 */}
          {!agentsLoading && agents && (
            <div className="max-w-2xl mx-auto px-2">
              <SmartAssistantSearch 
                smartAssistantId={agents.find(a => a.name === '智能AI助手')?.id || 0}
              />
            </div>
          )}
        </div>
      </section>

      {/* 场景化引导胶囊 */}
      <section className="container pb-8">
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto">
          {SCENARIO_CHIPS.map((chip) => (
            <button
              key={chip.id}
              onClick={() => handleScenarioClick(chip.targetCategory)}
              className="px-5 py-2.5 rounded-full bg-white/5 border border-purple-500/30 text-sm font-medium text-gray-200 hover:bg-purple-500/20 hover:border-purple-400/60 hover:text-white hover:scale-105 transition-all duration-300 backdrop-blur-sm"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </section>

      {/* Agents by Category */}
      <section className="container pb-20">
        {agentsLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8 max-w-6xl mx-auto">
            {AGENT_CATEGORIES.map((category, index) => {
              const CategoryIcon = (Icons as any)[category.icon] || Icons.Folder;
              const categoryAgents = getAgentsByCategory(category.agentNames);
              const isOpen = openCategories[category.id];

              return (
                <Collapsible
                  key={category.id}
                  open={isOpen}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <Card id={`category-${category.id}`} className="border-2 overflow-hidden scroll-mt-20">
                    <CollapsibleTrigger className="w-full">
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`w-14 h-14 rounded-xl ${category.colors.iconBg} flex items-center justify-center shadow-lg`}>
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
                        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${category.id === 'investment' ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                          {categoryAgents.map((agent) => {
                            const IconComponent = (Icons as any)[agent.icon] || Icons.Sparkles;
                            return (
                              <Card
                                key={agent.id}
                                className={`group card-hover-enhanced cursor-pointer border-2 ${category.colors.cardBorder} glass-effect hover:glow-border`}
                              >
                                <Link 
                                  href={`/agent/${agent.id}`}
                                  onClick={() => trackAgent(AgentEvents.AGENT_CLICK, agent.id, agent.name)}
                                >
                                  <CardHeader>
                                    <div className="flex items-start gap-3">
                                      <div className={`w-12 h-12 rounded-xl ${category.colors.iconBg} flex items-center justify-center flex-shrink-0 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-md`}>
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

      {/* Customer Cases Section */}
      <section className="py-16 bg-gradient-to-br from-slate-900/30 to-blue-900/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold">客户案例</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Case 1 - 融资场景 */}
            <Card className="glass-effect hover:shadow-diffuse transition-smooth border-purple-500/30">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center mb-3">
                  <Icons.TrendingUp className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">融资场景</CardTitle>
                <CardDescription className="text-xs">科技创业公司</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">使用场景</p>
                  <p className="text-sm">融资前商业梳理与 BP 构建</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">解决问题</p>
                  <p className="text-sm">商业逻辑不清晰，投资人反馈分散，BP 反复修改</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">关键结果</p>
                  <div className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-1">60%+</div>
                  <p className="text-xs text-muted-foreground">融资成功率提升</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• BP 结构清晰度显著提升</li>
                    <li>• 投资沟通效率明显提高</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Case 2 - 战略决策 */}
            <Card className="glass-effect hover:shadow-diffuse transition-smooth border-blue-500/30">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center mb-3">
                  <Icons.Target className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">战略决策</CardTitle>
                <CardDescription className="text-xs">制造业企业（年营收数亿元）</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">使用场景</p>
                  <p className="text-sm">中长期战略方向与业务取舍</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">解决问题</p>
                  <p className="text-sm">多业务线并行，资源分散，战略判断难以统一</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">关键结果</p>
                  <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent mb-1">50%+</div>
                  <p className="text-xs text-muted-foreground">决策周期缩短</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• 明确核心战略方向</li>
                    <li>• 识别低效业务与优先级</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Case 3 - 增长与市场 */}
            <Card className="glass-effect hover:shadow-diffuse transition-smooth border-green-500/30">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-600 to-emerald-600 flex items-center justify-center mb-3">
                  <Icons.BarChart className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">增长与市场</CardTitle>
                <CardDescription className="text-xs">新消费品牌</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">使用场景</p>
                  <p className="text-sm">市场进入与增长策略制定</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">解决问题</p>
                  <p className="text-sm">市场判断依赖经验，增长路径不清晰</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">关键结果</p>
                  <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-1">45%+</div>
                  <p className="text-xs text-muted-foreground">试错成本降低</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• 明确目标市场与核心用户</li>
                    <li>• 形成可执行的增长路径</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Case 4 - 一人公司 */}
            <Card className="glass-effect hover:shadow-diffuse transition-smooth border-orange-500/30">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center mb-3">
                  <Icons.User className="w-6 h-6 text-white" />
                </div>
                <CardTitle className="text-lg">一人公司</CardTitle>
                <CardDescription className="text-xs">自由职业创业者</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">使用场景</p>
                  <p className="text-sm">商业模式与个人业务设计</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">解决问题</p>
                  <p className="text-sm">缺乏系统商业视角，决策高度受限</p>
                </div>
                <div className="pt-3 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">关键结果</p>
                  <div className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent mb-1">300%</div>
                  <p className="text-xs text-muted-foreground">年度收入提升</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• 商业模式更清晰</li>
                    <li>• 决策信心明显提升</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Expert Consultation Section */}
      <section className="container pb-16">
        <Card className="border-2 border-purple-500/30 glass-effect max-w-3xl mx-auto">
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
      <footer className="border-t py-8 glass-effect">
        <div className="container text-center text-sm text-muted-foreground space-y-3">
          <div className="flex justify-center gap-6">
            <a 
              href="/about" 
              className="hover:text-foreground transition-colors"
            >
              关于我们
            </a>
            <a 
              href="/support" 
              className="hover:text-foreground transition-colors"
            >
              联系客服
            </a>
            <a 
              href="/pricing" 
              className="hover:text-foreground transition-colors"
            >
              价格套餐
            </a>
          </div>
          <div>© 2025 泽思 Zenith AI - 专业AI商业咨询平台</div>
          <div className="flex justify-center items-center gap-4 flex-wrap">
            <a 
              href="https://beian.miit.gov.cn/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              沪ICP备2024048847号
            </a>
            <a 
              href="https://beian.mps.gov.cn/#/query/webSearch?code=31011502404980" 
              target="_blank" 
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <img src="/police-badge.png" alt="公安备案" className="w-4 h-4" />
              沪公网安备31011502404980号
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
