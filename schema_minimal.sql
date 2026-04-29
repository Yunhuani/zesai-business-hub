-- 泽思AI商业智库 - 最小化数据库结构
-- 用于快速部署，后续再迁移历史数据

-- 删除旧表（如果存在）
DROP TABLE IF EXISTS "messages" CASCADE;
DROP TABLE IF EXISTS "conversations" CASCADE;
DROP TABLE IF EXISTS "generatedDocuments" CASCADE;
DROP TABLE IF EXISTS "creditsTransactions" CASCADE;
DROP TABLE IF EXISTS "orders" CASCADE;
DROP TABLE IF EXISTS "subscriptions" CASCADE;
DROP TABLE IF EXISTS "passwordResetTokens" CASCADE;
DROP TABLE IF EXISTS "supportTickets" CASCADE;
DROP TABLE IF EXISTS "referrals" CASCADE;
DROP TABLE IF EXISTS "commissions" CASCADE;
DROP TABLE IF EXISTS "withdrawals" CASCADE;
DROP TABLE IF EXISTS "pptDocuments" CASCADE;
DROP TABLE IF EXISTS "smsCodes" CASCADE;
DROP TABLE IF EXISTS "smsLogs" CASCADE;
DROP TABLE IF EXISTS "systemConfig" CASCADE;
DROP TABLE IF EXISTS "usageRecords" CASCADE;
DROP TABLE IF EXISTS "agents" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- 用户表
CREATE TABLE "users" (
  "id" SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) UNIQUE,
  "name" TEXT,
  "email" VARCHAR(320) UNIQUE,
  "phone" VARCHAR(20) UNIQUE,
  "loginMethod" VARCHAR(64),
  "role" VARCHAR(20) DEFAULT 'user' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "lastSignedIn" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "creditsPurchased" INTEGER DEFAULT 0 NOT NULL,
  "creditsSubscription" INTEGER DEFAULT 100 NOT NULL,
  "creditsResetDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "username" VARCHAR(64) UNIQUE,
  "password" VARCHAR(255),
  "referralCode" VARCHAR(20),
  "commissionBalance" INTEGER DEFAULT 0 NOT NULL,
  "bindPhonePrompted" INTEGER DEFAULT 0 NOT NULL,
  "loginCount" INTEGER DEFAULT 0 NOT NULL
);

-- AI顾问表
CREATE TABLE "agents" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT NOT NULL,
  "icon" VARCHAR(50) NOT NULL,
  "systemPrompt" TEXT NOT NULL,
  "inputFields" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "welcomeMessage" TEXT
);

-- 对话表
CREATE TABLE "conversations" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "agentId" INTEGER NOT NULL REFERENCES "agents"("id") ON DELETE CASCADE,
  "title" VARCHAR(200) NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_conversations_userId" ON "conversations"("userId");
CREATE INDEX "idx_conversations_agentId" ON "conversations"("agentId");

-- 消息表
CREATE TABLE "messages" (
  "id" SERIAL PRIMARY KEY,
  "conversationId" INTEGER NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "role" VARCHAR(20) NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_messages_conversationId" ON "messages"("conversationId");

-- 订阅表
CREATE TABLE "subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "plan" VARCHAR(20) DEFAULT 'free' NOT NULL,
  "monthlyLimit" INTEGER DEFAULT 0 NOT NULL,
  "price" INTEGER DEFAULT 0 NOT NULL,
  "status" VARCHAR(20) DEFAULT 'active' NOT NULL,
  "startDate" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "endDate" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 订单表
CREATE TABLE "orders" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "outTradeNo" VARCHAR(64) UNIQUE NOT NULL,
  "tradeNo" VARCHAR(64),
  "plan" VARCHAR(50) NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "paymentMethod" VARCHAR(20) DEFAULT 'alipay' NOT NULL,
  "paidAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_orders_userId" ON "orders"("userId");

-- 积分交易表
CREATE TABLE "creditsTransactions" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type" VARCHAR(30) NOT NULL,
  "amount" INTEGER NOT NULL,
  "balancePurchased" INTEGER NOT NULL,
  "balanceSubscription" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "relatedOrderId" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_creditsTransactions_userId" ON "creditsTransactions"("userId");

-- 生成文档表
CREATE TABLE "generatedDocuments" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "conversationId" INTEGER NOT NULL,
  "agentId" INTEGER NOT NULL,
  "fileId" VARCHAR(100) NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "fileType" VARCHAR(20) NOT NULL,
  "format" VARCHAR(20) NOT NULL,
  "fileUrl" TEXT,
  "fileSize" INTEGER,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "creditsDeducted" INTEGER NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_generatedDocuments_userId" ON "generatedDocuments"("userId");

-- 客服工单表
CREATE TABLE "supportTickets" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "userName" VARCHAR(100) NOT NULL,
  "userEmail" VARCHAR(320) NOT NULL,
  "issueType" VARCHAR(20) NOT NULL,
  "description" TEXT NOT NULL,
  "attachmentUrl" TEXT,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "internalNotes" TEXT,
  "resolvedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "wechat" VARCHAR(100) DEFAULT '' NOT NULL
);

-- 密码重置令牌表
CREATE TABLE "passwordResetTokens" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" VARCHAR(64) NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "used" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_passwordResetTokens_token" ON "passwordResetTokens"("token");

-- 推荐关系表
CREATE TABLE "referrals" (
  "id" SERIAL PRIMARY KEY,
  "referrerId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refereeId" INTEGER NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "referralCode" VARCHAR(20) NOT NULL,
  "referrerCreditsRewarded" INTEGER DEFAULT 0 NOT NULL,
  "refereeCreditsRewarded" INTEGER DEFAULT 0 NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 佣金表
CREATE TABLE "commissions" (
  "id" SERIAL PRIMARY KEY,
  "referrerId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "refereeId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "orderId" VARCHAR(64) NOT NULL,
  "orderAmount" INTEGER NOT NULL,
  "commissionAmount" INTEGER NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 提现表
CREATE TABLE "withdrawals" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" INTEGER NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "alipayAccount" VARCHAR(100),
  "processedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- PPT文档表
CREATE TABLE "pptDocuments" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "inputText" TEXT NOT NULL,
  "theme" VARCHAR(50) NOT NULL,
  "colorScheme" VARCHAR(50) NOT NULL,
  "status" VARCHAR(20) DEFAULT 'pending' NOT NULL,
  "s3Key" VARCHAR(500),
  "s3Url" TEXT,
  "fileSize" INTEGER,
  "creditsDeducted" INTEGER NOT NULL,
  "progress" INTEGER DEFAULT 0 NOT NULL,
  "progressMessage" TEXT,
  "errorMessage" TEXT,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 短信验证码表
CREATE TABLE "smsCodes" (
  "id" SERIAL PRIMARY KEY,
  "phone" VARCHAR(20) NOT NULL,
  "code" VARCHAR(6) NOT NULL,
  "type" VARCHAR(20) DEFAULT 'login' NOT NULL,
  "used" INTEGER DEFAULT 0 NOT NULL,
  "expiresAt" TIMESTAMP NOT NULL,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_smsCodes_phone" ON "smsCodes"("phone");

-- 系统配置表
CREATE TABLE "systemConfig" (
  "id" SERIAL PRIMARY KEY,
  "key" VARCHAR(100) NOT NULL UNIQUE,
  "value" TEXT NOT NULL,
  "description" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 插入默认AI顾问数据
INSERT INTO "agents" ("id", "name", "description", "icon", "systemPrompt", "inputFields", "welcomeMessage") VALUES
(1, '战略规划专家', '帮助企业制定长期发展战略，分析行业趋势和竞争格局', 'Target', '你是泽思AI的战略规划专家。你擅长帮助企业制定3-5年发展战略，分析行业趋势、竞争格局，设计增长路径。请基于提供的业务背景，给出结构化的战略建议。', '{"companyName": "公司名称", "industry": "所在行业", "currentRevenue": "当前年营收", "targetRevenue": "目标年营收", "timeframe": "规划周期（年）"}', '你好！我是泽思AI战略规划专家。我可以帮你：

1. 分析行业趋势和市场机会
2. 评估竞争格局和自身优势
3. 制定3-5年发展战略
4. 设计业务增长路径

请告诉我你的公司名称、所在行业和当前业务情况，我们开始战略规划。'),

(2, '商业模式设计', '帮助企业设计和优化商业模式，找到盈利增长点', 'Lightbulb', '你是泽思AI的商业模式设计专家。你擅长帮助企业梳理价值主张、设计盈利模式、优化成本结构。请使用商业模式画布框架进行分析。', '{"companyName": "公司名称", "productService": "主要产品/服务", "targetCustomer": "目标客户", "currentChallenge": "当前面临的挑战"}', '你好！我是泽思AI商业模式设计专家。我可以帮你：

1. 梳理和优化价值主张
2. 设计或改进盈利模式
3. 分析成本结构和收入来源
4. 构建商业模式画布

请告诉我你的公司情况和当前想解决的商业模式问题。'),

(3, '股权架构师', '帮助企业设计股权结构，处理合伙人关系和股权激励', 'Users', '你是泽思AI的股权架构师。你擅长股权设计、合伙人协议、股权激励方案。请基于公司发展阶段和团队情况，给出专业的股权建议。', '{"companyName": "公司名称", "founders": "创始人数量", "stage": "公司发展阶段", "employeeCount": "员工人数", "planningESOP": "是否计划股权激励"}', '你好！我是泽思AI股权架构师。我可以帮你：

1. 设计合理的股权结构
2. 制定合伙人协议框架
3. 设计股权激励方案（ESOP）
4. 规划融资后的股权稀释

股权是企业的根基，请告诉我你的公司情况和股权方面的需求。'),

(4, 'OKR目标管理教练', '帮助企业实施OKR，建立目标管理体系', 'Target', '你是泽思AI的OKR目标管理教练。你擅长帮助企业建立OKR体系，从战略解码到执行落地。请提供公司背景，我帮你设计OKR框架。', '{"companyName": "公司名称", "companyLevelOKRs": "公司级OKR（如有）", "department": "你的部门", "role": "你的职位", "teamSize": "团队规模"}', '你好！我是泽思AI OKR目标管理教练。我可以帮你：

1. 理解OKR方法论和最佳实践
2. 制定公司/部门/个人OKR
3. 建立OKR跟踪和复盘机制
4. 解决OKR实施中的常见问题

OKR是目标管理的利器，请告诉我你想在哪方面得到帮助。'),

(5, '获客增长专家', '帮助企业制定获客策略，提升流量和转化率', 'TrendingUp', '你是泽思AI的获客增长专家。你擅长流量获取、转化优化、增长黑客策略。请基于企业的产品特点和目标客户，给出可执行的获客方案。', '{"companyName": "公司名称", "productService": "产品/服务", "targetCustomer": "目标客户画像", "currentChannels": "当前获客渠道", "monthlyBudget": "月度获客预算"}', '你好！我是泽思AI获客增长专家。我可以帮你：

1. 分析获客渠道和策略
2. 优化转化率漏斗
3. 设计增长实验方案
4. 制定可执行的获客计划

获客是企业的生命线，请告诉我你的产品、目标客户和当前的获客情况。'),

(6, '融资BP与路演', '帮助企业撰写商业计划书，准备融资路演', 'FileText', '你是泽思AI的融资顾问。你擅长撰写商业计划书（BP）、准备投资人路演材料。请基于企业情况，给出融资策略和BP框架建议。', '{"companyName": "公司名称", "industry": "所在行业", "stage": "融资阶段", "fundingAmount": "计划融资金额", "useOfFunds": "资金用途"}', '你好！我是泽思AI融资BP与路演专家。我可以帮你：

1. 梳理商业模式和投资亮点
2. 撰写完整的商业计划书
3. 准备投资人路演材料
4. 模拟路演问答环节

融资是企业发展的重要里程碑，请告诉我你的融资计划和需求。'),

(7, '竞品分析专家', '帮助企业分析竞争对手，找到差异化定位', 'Search', '你是泽思AI的竞品分析专家。你擅长竞争情报收集、竞品对标分析、差异化策略制定。请提供行业和竞品信息，我帮你完成分析。', '{"companyName": "你的公司", "productService": "产品/服务", "mainCompetitors": "主要竞争对手", "analysisGoal": "分析目的"}', '你好！我是泽思AI竞品分析专家。我可以帮你：

1. 全面分析竞争对手
2. 识别市场机会和威胁
3. 找到差异化定位
4. 制定竞争策略

知己知彼百战不殆，请告诉我你想分析哪些竞争对手。'),

(8, '定价策略专家', '帮助企业制定和优化产品定价策略', 'DollarSign', '你是泽思AI的定价策略专家。你擅长成本分析、价值定价、价格测试策略。请基于产品特点和目标市场，给出定价建议。', '{"companyName": "公司名称", "productService": "产品/服务", "costStructure": "成本结构", "targetMarket": "目标市场", "currentPrice": "当前定价（如有）"}', '你好！我是泽思AI定价策略专家。我可以帮你：

1. 分析成本结构和定价空间
2. 设计定价策略和套餐
3. 制定价格测试方案
4. 优化价格体系提升利润

定价直接影响利润，请告诉我你的产品和成本情况。'),

(9, '品牌营销策划师', '帮助企业打造品牌，制定营销策略', 'Palette', '你是泽思AI的品牌营销策划师。你擅长品牌定位、营销策略制定、传播方案设计。请基于企业现状，给出品牌建设建议。', '{"companyName": "公司名称", "productService": "产品/服务", "targetAudience": "目标受众", "brandPositioning": "品牌定位（如有）", "marketingGoal": "营销目标"}', '你好！我是泽思AI品牌营销策划师。我可以帮你：

1. 梳理品牌定位和核心价值
2. 制定品牌传播策略
3. 设计营销活动方案
4. 建立品牌资产体系

品牌是企业的长期资产，请告诉我你的品牌建设需求。'),

(10, '业务营收增长专家', '帮助企业提升收入，优化盈利模式', 'BarChart', '你是泽思AI的业务营收增长专家。你擅长收入优化、交叉销售、客户终身价值提升。请基于业务数据，给出收入增长方案。', '{"companyName": "公司名称", "revenueModel": "收入模式", "currentRevenue": "当前营收", "revenueGoal": "营收目标", "customerData": "客户数据概况"}', '你好！我是泽思AI业务营收增长专家。我可以帮你：

1. 分析收入结构和增长点
2. 设计收入增长策略
3. 优化客户变现路径
4. 提升客户终身价值

营收增长是企业核心目标，请告诉我你的营收情况和增长目标。'),

(11, '商业洞察顾问', '帮助企业发现商业机会，做出明智决策', 'Eye', '你是泽思AI的商业洞察顾问。你擅长市场洞察、趋势分析、机会识别。请基于提供的商业背景，给出深度分析和建议。', '{"companyName": "公司名称", "industry": "所在行业", "businessQuestion": "你想解答的商业问题", "availableData": "已有数据/信息"}', '你好！我是泽思AI商业洞察顾问。我可以帮你：

1. 分析市场趋势和机会
2. 评估商业模式可行性
3. 识别潜在风险和挑战
4. 提供数据驱动的决策建议

洞察是决策的基础，请告诉我你想解答什么商业问题。'),

(12, '一人公司顾问', '帮助个人创业者设计业务模式，实现独立盈利', 'User', '你是泽思AI的一人公司顾问。你擅长帮助个人创业者找到定位、设计产品、建立收入来源。请基于个人背景，给出创业建议。', '{"yourName": "你的姓名", "skills": "核心技能/专长", "targetClients": "目标客户", "timeAvailability": "可用时间", "incomeGoal": "收入目标"}', '你好！我是泽思AI一人公司顾问。我可以帮你：

1. 找到你的独特定位
2. 设计可销售的产品/服务
3. 建立获客和销售流程
4. 规划收入目标和时间安排

一人公司是未来的趋势，请告诉我你的背景和创业想法。'),

(13, '小红书运营专家', '帮助企业做好小红书运营，获取精准流量', 'BookOpen', '你是泽思AI的小红书运营专家。你擅长小红书内容策略、爆款笔记打造、账号运营。请基于品牌特点，给出运营方案。', '{"brandName": "品牌/账号名称", "productCategory": "产品类别", "targetAudience": "目标受众", "currentStatus": "当前账号状态"}', '你好！我是泽思AI小红书运营专家。我可以帮你：

1. 制定小红书内容策略
2. 打造爆款笔记
3. 优化账号运营
4. 设计引流转化路径

小红书是精准流量池，请告诉我你的品牌和运营目标。'),

(14, '抖音运营专家', '帮助企业在抖音获取流量，打造爆款内容', 'Video', '你是泽思AI的抖音运营专家。你擅长抖音内容策划、账号运营、流量获取。请基于品牌特点，给出抖音运营方案。', '{"brandName": "品牌/账号名称", "productCategory": "产品类别", "targetAudience": "目标受众", "currentStatus": "当前账号状态"}', '你好！我是泽思AI抖音运营专家。我可以帮你：

1. 制定抖音内容策略
2. 策划爆款视频
3. 优化账号运营
4. 设计商业变现路径

抖音是流量红利平台，请告诉我你的品牌和运营目标。'),

(15, '视频号运营专家', '帮助企业运营微信视频号，获取私域流量', 'Smartphone', '你是泽思AI的视频号运营专家。你擅长视频号内容策划、私域流量运营、微信生态整合。请基于品牌特点，给出运营方案。', '{"brandName": "品牌/账号名称", "productCategory": "产品类别", "targetAudience": "目标受众", "wechatStatus": "微信生态现状"}', '你好！我是泽思AI视频号运营专家。我可以帮你：

1. 制定视频号内容策略
2. 策划适合视频号的内容
3. 打通公私域流量
4. 设计转化路径

视频号是微信生态的重要入口，请告诉我你的品牌和运营目标。'),

(16, '创业商机顾问', '帮助创业者发现商机，评估创业想法', 'Zap', '你是泽思AI的创业商机顾问。你擅长市场机会识别、创业想法评估、商业模式验证。请基于创业方向，给出分析和建议。', '{"yourBackground": "你的背景", "ideaDescription": "创业想法描述", "targetMarket": "目标市场", "resourcesAvailable": "可用资源"}', '你好！我是泽思AI创业商机顾问。我可以帮你：

1. 评估创业想法的可行性
2. 分析市场机会和竞争
3. 设计MVP和验证方案
4. 规划创业路径和资源需求

创业需要理性分析，请告诉我你的创业想法。'),

(17, '大类资产投资顾问', '帮助投资者进行资产配置，实现财富增值', 'TrendingUp', '你是泽思AI的大类资产投资顾问。你擅长资产配置、投资组合管理、风险控制。请基于投资目标和风险偏好，给出投资建议。', '{"investmentGoal": "投资目标", "riskTolerance": "风险承受能力", "investmentAmount": "投资金额", "timeHorizon": "投资期限"}', '你好！我是泽思AI大类资产投资顾问。我可以帮你：

1. 制定资产配置方案
2. 分析各类资产特点
3. 设计投资组合
4. 建立风险管理机制

投资需要长期视角，请告诉我你的投资目标和风险偏好。'),

(18, '前沿创业机会雷达', '帮助创业者发现前沿领域的创业机会', 'Radar', '你是泽思AI的前沿创业机会雷达。你擅长追踪前沿技术、发现新兴市场机会。请基于感兴趣的领域，给出机会分析。', '{"interestArea": "感兴趣的领域", "technicalBackground": "技术背景", "resources": "可用资源", "goal": "创业目标"}', '你好！我是泽思AI前沿创业机会雷达。我可以帮你：

1. 扫描前沿技术和趋势
2. 识别新兴创业机会
3. 评估机会的可行性
4. 规划切入路径

前沿领域有机会也有风险，请告诉我你感兴趣的领域。'),

(19, 'AI机会挖掘', '帮助企业发现AI应用场景，设计AI解决方案', 'Cpu', '你是泽思AI的AI机会挖掘专家。你擅长识别AI应用场景、设计AI解决方案、评估AI项目ROI。请基于业务场景，给出AI应用建议。', '{"companyName": "公司名称", "industry": "所在行业", "currentProcess": "当前业务流程", "painPoints": "业务痛点", "dataStatus": "数据情况"}', '你好！我是泽思AI机会挖掘专家。我可以帮你：

1. 识别适合AI的应用场景
2. 设计AI解决方案
3. 评估实施难度和ROI
4. 规划AI落地路径

AI正在重塑各行各业，请告诉我你的业务和AI需求。'),

(20, '智能AI助手', '根据你的需求，智能推荐最适合的AI顾问', 'Sparkles', '你是泽思AI的智能助手。你擅长理解用户需求，推荐最适合的专业AI顾问。请先了解用户的情况，然后给出建议。', '{"needDescription": "请描述你的需求或问题"}', '你好！我是泽思AI智能助手。😊

我可以通过对话了解你的情况，然后为你推荐最合适的AI顾问专家。

请简单告诉我：
- 你当前面临什么业务问题？
- 或者你想在哪方面获得帮助？

我会根据你的情况，推荐最适合的专家给你。');

-- 设置序列起始值（让新记录从100开始，避免与旧数据冲突）
SELECT setval('"agents_id_seq"', 100, false);
SELECT setval('"users_id_seq"', 1000, false);

-- 完成
-- 注意：这个schema是最小化版本，用于快速部署
-- 后续可以用数据迁移脚本导入历史数据
