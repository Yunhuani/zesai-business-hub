import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, TrendingUp, FileText, BarChart3, Users } from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

/**
 * 使用案例展示页面 - 展示AI顾问的真实咨询案例
 * 这是一个样式演示页面,供用户查看效果后决定是否采用
 */
export default function CaseExample() {
  const [, setLocation] = useLocation();

  // 示例数据 - 战略规划Agent的两个真实案例
  const cases = [
    {
      id: 1,
      title: "某连锁餐饮品牌3年战略规划",
      industry: "餐饮服务",
      tags: ["战略规划", "市场扩张", "数字化转型"],
      userQuestion: "我们是一家在华东地区有30家门店的连锁餐饮品牌,主营江浙菜。目前面临市场竞争加剧、客流下降的问题。希望制定未来3年的战略规划,实现业绩翻倍。",
      outputPreview: `## 战略规划概览

基于您的现状分析,我为您制定了"聚焦核心+数字化赋能"的3年战略规划:

### 战略定位
从"区域连锁餐饮"升级为"新江浙菜生活方式品牌"

### 三年目标
- **营收目标**: 从当前2亿增长至4.5亿(年复合增长率50%)
- **门店规模**: 从30家扩张至80家
- **数字化会员**: 建立50万+活跃会员体系

### 战略路径图

\`\`\`mermaid
graph LR
    A[2024年<br/>夯实基础] --> B[2025年<br/>加速扩张]
    B --> C[2026年<br/>品牌升级]
    
    A --> A1[优化供应链]
    A --> A2[数字化改造]
    A --> A3[会员体系]
    
    B --> B1[开店50家]
    B --> B2[区域下沉]
    B --> B3[外卖占比30%]
    
    C --> C1[品牌重塑]
    C --> C2[预制菜业务]
    C --> C3[加盟体系]
\`\`\`

### 关键举措

**第一年(2024):夯实基础**
1. **供应链优化**: 建立中央厨房,标准化出品,降低成本15%
2. **数字化改造**: 全面接入美团、抖音、私域小程序,线上订单占比提升至40%
3. **会员体系**: 搭建CRM系统,首年积累10万付费会员

**第二年(2025):加速扩张**
1. **门店扩张**: 新开20家门店,进入苏南、浙北市场
2. **品类创新**: 推出"轻江浙"系列,吸引年轻客群
3. **外卖发力**: 外卖业务占比提升至30%,开设外卖专营店

**第三年(2026):品牌升级**
1. **品牌重塑**: 升级VI系统,打造"新江浙菜"文化IP
2. **预制菜业务**: 推出家庭装预制菜,进入零售渠道
3. **加盟体系**: 开放加盟,快速覆盖华东市场

### 财务预测

| 年份 | 门店数 | 营收(亿) | 利润率 | 会员数(万) |
|------|--------|----------|--------|------------|
| 2024 | 40     | 2.5      | 12%    | 10         |
| 2025 | 60     | 3.5      | 14%    | 25         |
| 2026 | 80     | 4.5      | 15%    | 50         |

### 风险提示与应对

**主要风险**:
- 扩张速度过快导致管理失控
- 供应链跟不上门店增长
- 竞争对手模仿策略

**应对措施**:
- 建立标准化运营手册和督导体系
- 提前1年布局中央厨房和冷链物流
- 注册商标和菜品专利,建立品牌护城河`,
      metrics: {
        charts: 1,
        tables: 1,
        wordCount: "约1200字",
      },
    },
    {
      id: 2,
      title: "某SaaS创业公司战略转型咨询",
      industry: "企业服务",
      tags: ["战略转型", "商业模式", "融资准备"],
      userQuestion: "我们是一家做HR SaaS的创业公司,已运营2年,有200家付费客户,ARR约500万。但增长乏力,续费率只有60%。投资人要求我们明年ARR达到2000万,否则不继续投资。请帮我们制定战略转型方案。",
      outputPreview: `## 战略诊断

### 核心问题识别
通过您的描述,我识别出三大核心问题:

1. **产品问题**: 续费率60%远低于SaaS行业标准(80%+),说明产品价值不足
2. **增长问题**: ARR 500万运营2年,增长曲线过于平缓
3. **商业模式问题**: 可能陷入"功能型工具"陷阱,缺乏客户粘性

### 战略转型方向

\`\`\`mermaid
graph TD
    A[当前:HR工具] --> B[转型:HR解决方案平台]
    B --> C[短期:提升续费率至80%]
    B --> D[中期:ARR达到2000万]
    B --> E[长期:成为行业标准]
    
    C --> C1[产品深度优化]
    C --> C2[客户成功体系]
    
    D --> D1[聚焦垂直行业]
    D --> D2[大客化策略]
    
    E --> E1[生态化布局]
    E --> E2[AI能力整合]
\`\`\`

### 90天紧急行动计划

**第1个月:止血**
- 立即启动流失客户访谈(至少50家),找到续费率低的真实原因
- 暂停新客户获取,全力服务存量客户
- 成立"客户成功团队",对重点客户1对1服务

**第2个月:聚焦**
- 分析客户数据,找出续费率最高的20%客户画像
- 确定1-2个垂直行业深耕(如连锁零售、制造业)
- 砍掉使用率低于10%的功能,聚焦核心场景

**第3个月:验证**
- 针对目标行业开发深度解决方案
- 在10家标杆客户试点,验证新模式
- 续费率目标提升至75%

### 12个月增长路径

| 季度 | 关键动作 | ARR目标 | 续费率 |
|------|----------|---------|--------|
| Q1   | 止血+聚焦 | 600万   | 75%    |
| Q2   | 垂直行业突破 | 900万   | 80%    |
| Q3   | 大客化转型 | 1400万  | 82%    |
| Q4   | 规模化复制 | 2000万  | 85%    |

### 商业模式调整建议

**从"工具"到"解决方案"**:
- 不只卖软件,要卖"行业最佳实践"
- 例如:针对连锁零售,提供"千店千人的排班算法+薪酬方案+合规咨询"

**定价策略调整**:
- 当前:按人头收费(可能是低价竞争)
- 调整:按价值收费,推出行业版(定价提升2-3倍)

**客户成功体系**:
- 配置CSM团队,客户比例1:30
- 建立客户健康度评分,提前预警流失风险

### 融资建议

如果按此方案执行,建议向投资人展示:
1. **3个月后**:续费率提升至75%,证明产品价值
2. **6个月后**:垂直行业标杆案例,证明增长路径
3. **9个月后**:ARR突破1500万,证明执行力

这样可以争取到下一轮融资,而不是被动等待。`,
      metrics: {
        charts: 1,
        tables: 1,
        wordCount: "约1000字",
      },
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 */}
      <div className="border-b glass-effect sticky top-0 z-10">
        <div className="container py-4">
          <Button
            variant="ghost"
            onClick={() => setLocation("/")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            返回首页
          </Button>
        </div>
      </div>

      {/* 页面标题 */}
      <div className="container py-12">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <Badge variant="secondary" className="text-sm">
            使用案例展示
          </Badge>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
            战略规划专家 - 真实咨询案例
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            以下是我们AI战略规划专家的真实咨询案例,展示了从问题分析到战略制定的完整过程,包含可视化图表和详细的执行路径。
          </p>
        </div>
      </div>

      {/* 案例展示 */}
      <div className="container pb-20">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="case1" className="space-y-8">
            <TabsList className="grid w-full max-w-md mx-auto grid-cols-2">
              <TabsTrigger value="case1">案例一</TabsTrigger>
              <TabsTrigger value="case2">案例二</TabsTrigger>
            </TabsList>

            {cases.map((caseItem, index) => (
              <TabsContent key={caseItem.id} value={`case${index + 1}`} className="space-y-6">
                {/* 案例概览卡片 */}
                <Card className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <CardTitle className="text-2xl">{caseItem.title}</CardTitle>
                        <CardDescription className="text-base">
                          行业: {caseItem.industry}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {caseItem.tags.map((tag) => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* 用户问题 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Users className="w-4 h-4 text-purple-600" />
                        <span>用户提问</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-4 border-l-4 border-purple-600">
                        <p className="text-sm leading-relaxed">{caseItem.userQuestion}</p>
                      </div>
                    </div>

                    {/* AI输出预览 */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <FileText className="w-4 h-4 text-blue-600" />
                        <span>AI顾问输出</span>
                      </div>
                      <Card className="glass-effect">
                        <CardContent className="p-6">
                          <div className="prose prose-sm max-w-none">
                            <Streamdown>{caseItem.outputPreview}</Streamdown>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* 输出指标 */}
                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center space-y-1">
                        <BarChart3 className="w-5 h-5 mx-auto text-muted-foreground" />
                        <div className="text-2xl font-bold text-purple-600">
                          {caseItem.metrics.charts}
                        </div>
                        <div className="text-xs text-muted-foreground">可视化图表</div>
                      </div>
                      <div className="text-center space-y-1">
                        <TrendingUp className="w-5 h-5 mx-auto text-muted-foreground" />
                        <div className="text-2xl font-bold text-blue-600">
                          {caseItem.metrics.tables}
                        </div>
                        <div className="text-xs text-muted-foreground">数据表格</div>
                      </div>
                      <div className="text-center space-y-1">
                        <FileText className="w-5 h-5 mx-auto text-muted-foreground" />
                        <div className="text-2xl font-bold text-green-600">
                          {caseItem.metrics.wordCount}
                        </div>
                        <div className="text-xs text-muted-foreground">专业内容</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>

          {/* 底部CTA */}
          <Card className="mt-12 bg-gradient-to-r from-purple-600 to-blue-600 text-white border-0">
            <CardContent className="p-8 text-center space-y-4">
              <h3 className="text-2xl font-bold">立即体验专业AI商业咨询</h3>
              <p className="text-purple-100 max-w-2xl mx-auto">
                17位AI商业顾问,覆盖战略、融资、运营、营销等全方位咨询服务。
                支持图表可视化、PDF/PPT导出,让您的商业决策更专业、更高效。
              </p>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => setLocation("/")}
                className="mt-4"
              >
                开始咨询
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
