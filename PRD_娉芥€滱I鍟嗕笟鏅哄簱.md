# 泽思AI商业智库 - 产品需求文档（PRD）

**版本**：v1.0  
**日期**：2025年1月11日  
**作者**：Manus AI  
**产品名称**：泽思 Zenith AI - 专业AI商业咨询平台  
**域名**：www.zesiai.com  
**备案号**：沪ICP备2024048847号

---

## 一、产品概述

泽思AI商业智库是一个基于大语言模型的专业商业咨询平台，为企业家、创业者、投资人和职场人士提供全方位的AI商业顾问服务。平台通过16个专业AI顾问覆盖战略规划、营销增长、运营管理和投资机会四大领域，结合智能文档生成、可视化导出和积分订阅体系，为用户提供McKinsey级别的专业咨询服务。

### 核心价值主张

泽思AI商业智库致力于让专业商业咨询服务触手可及。传统咨询公司动辄数十万的咨询费用让中小企业望而却步，而泽思AI通过大语言模型技术，将顶级咨询公司的方法论和专业知识封装成可随时调用的AI顾问，以极低的成本为用户提供7×24小时的专业咨询服务。用户只需描述业务挑战，AI顾问即可基于行业最佳实践提供结构化的解决方案，并生成专业的商业文档。

### 目标用户

**主要用户群体**包括创业公司创始人、中小企业管理者、投资机构分析师、企业战略规划部门、市场营销从业者和职业规划咨询师。这些用户共同的需求是快速获取专业商业建议、生成高质量商业文档，以及在决策过程中获得结构化的思维框架支持。

**次要用户群体**包括商学院学生、求职者和个人投资者，他们需要学习商业分析方法、规划职业发展路径或评估投资机会。

---

## 二、功能架构

### 2.1 核心功能模块

泽思AI商业智库的功能架构分为五大核心模块，分别是用户认证与权限管理、AI顾问对话系统、积分与订阅管理、文档生成与导出、管理后台系统。这五大模块相互协作，构成完整的商业咨询服务闭环。

#### 2.1.1 用户认证与权限管理

**邮箱密码登录系统**是平台的主要认证方式。用户通过邮箱注册账号并设置密码，系统使用bcrypt算法对密码进行加密存储，确保用户信息安全。登录成功后，系统生成JWT会话令牌并存储在HTTP-only Cookie中，有效期为7天。用户可以在多个设备上同时登录，但每个设备需要独立认证。

**角色权限体系**分为普通用户和管理员两种角色。普通用户可以访问所有AI顾问、查看对话历史、购买积分和订阅套餐。管理员除了拥有普通用户的所有权限外，还可以访问管理后台，管理用户账户、调整用户积分、查看订单记录、编辑AI顾问配置。系统通过数据库users表的role字段（enum: user/admin）进行权限控制，所有管理后台接口都使用adminProcedure中间件进行权限验证。

**会话管理机制**基于JWT令牌和数据库会话记录。用户登录后，系统在users表更新lastSignedIn字段记录最后登录时间。前端通过tRPC的auth.me接口获取当前用户信息，包括用户ID、邮箱、角色、积分余额等。用户退出登录时，系统清除Cookie中的会话令牌，但不删除数据库中的用户数据，确保用户下次登录时可以恢复所有历史记录。

#### 2.1.2 AI顾问对话系统

**16个专业AI顾问**是平台的核心资产，分为四大类别。战略与规划类包括融资BP与路演、商业模式设计、战略规划专家、竞品分析专家、定价策略专家。营销与增长类包括品牌营销策划师、获客增长专家、小红书运营专家、抖音运营专家、视频号运营专家。运营与管理类包括股权架构师、薪酬绩效专家、OKR目标管理教练。投资与机会类包括大类资产投资顾问、前沿创业机会雷达、AI机会挖掘。每个顾问都有独特的systemPrompt定义其专业领域、咨询方法论和输出格式要求。

**智能对话引擎**基于Claude 3.5 Sonnet大语言模型。系统通过全局提示词规则（shared/promptRules.ts）统一所有顾问的输出规范，包括使用中文回复、采用结构化输出、引用行业案例、提供可执行建议等。每次对话时，系统将全局规则、顾问专属systemPrompt和用户历史消息组合成完整的上下文发送给LLM。对话支持流式输出，用户可以实时看到AI的回复过程，提升交互体验。

**对话历史管理**通过conversations和messages两张数据库表实现。每次用户选择一个AI顾问时，系统优先加载该用户与该顾问的最近对话（按updatedAt降序排序），如果没有历史对话则创建新对话。用户可以点击"开始新对话"按钮主动创建新会话。所有对话消息永久保存（付费用户），免费用户的对话历史保留7天。对话标题自动从第一条用户消息中提取，方便用户在历史记录中快速识别。

**文档上传与解析**支持PDF、Word、Excel三种格式。用户上传文档后，系统先将文件上传到S3存储获取公网URL，然后根据文件类型调用相应的解析库（pdf-parse、mammoth、xlsx）提取文本内容。提取的内容作为用户消息的一部分发送给LLM，AI顾问可以基于文档内容进行分析和建议。例如，用户上传财务报表后，财务顾问可以分析企业的盈利能力和现金流状况。

**欢迎语与引导机制**为每个AI顾问设计了专属的欢迎语。当用户打开某个顾问的对话页面时，系统自动显示欢迎语作为第一条assistant消息，无需用户主动发送消息。欢迎语包含顾问的自我介绍、擅长领域和引导性问题，帮助用户快速进入咨询状态。例如，融资BP与路演顾问的欢迎语会询问用户的公司名称、行业、融资阶段等关键信息。

#### 2.1.3 积分与订阅管理

**积分体系设计**是平台的核心商业模式。积分分为两种类型：购买积分（creditsPurchased）和订阅积分（creditsSubscription）。购买积分通过充值包获得，永久有效；订阅积分通过月度套餐获得，每月重置。用户的总积分=购买积分+订阅积分。扣除积分时，系统优先扣除购买积分，购买积分不足时再扣除订阅积分。这种设计确保用户充值的积分不会因为订阅重置而浪费。

**积分消耗规则**根据操作类型设定不同的扣费标准。基础对话（10积分/次）适用于简单咨询，深度对话（20积分/次）适用于需要深度分析的场景，文档分析（30积分/次）适用于上传文档后的专业解读。导出功能包括导出PDF（30积分）、导出PPT（50积分）、导出Excel（20积分）。文档生成功能根据文档复杂度分为三档：轻度文档（100积分，如简报摘要）、中度文档（140积分，如市场分析报告）、重度文档（200积分，如完整商业计划书）。

**月度订阅套餐**分为四个等级，每个等级提供不同的月度积分额度。免费版提供100积分/月，适合体验用户；基础版¥99/月提供750积分，适合偶尔使用的个人用户；专业版¥299/月提供2600积分，适合频繁使用的专业人士；企业版¥999/月提供11000积分，适合团队或高频用户。所有付费套餐都享有对话历史永久保存、优先响应速度、可导出PDF/PPT报告等权益。订阅积分每月1号自动重置，未使用的订阅积分不会累积到下个月。

**积分充值包**为不希望订阅的用户提供按需购买的选择。入门包¥49提供500积分，超值包¥99提供1000积分，专业包¥199提供2200积分，企业包¥399提供5500积分。充值包的积分永久有效，不受订阅周期影响。用户可以同时拥有订阅积分和购买积分，系统会自动按照最优策略扣除。

**积分交易记录**通过creditsTransactions表完整记录所有积分变动。每次积分变动都会生成一条交易记录，包含交易类型（consume/purchase/subscription_grant/refund/admin_adjustment）、变动金额、变动后余额（分别记录购买积分和订阅积分余额）、操作描述、关联订单ID等信息。用户可以在"使用情况"页面查看完整的积分明细，包括每次对话消耗的积分、充值记录、订阅重置记录等。

**支付集成**使用支付宝电脑网站支付。用户选择套餐或充值包后，系统创建订单记录（orders表），生成唯一的商户订单号（outTradeNo），调用支付宝API生成支付链接。用户跳转到支付宝页面完成支付后，支付宝通过异步回调通知系统支付结果。系统验证签名后，更新订单状态为已支付，根据订单类型执行相应操作：如果是订阅套餐，则创建或更新用户订阅记录并重置订阅积分；如果是充值包，则增加用户的购买积分。所有操作都记录到creditsTransactions表，确保资金流和积分流的一致性。

#### 2.1.4 文档生成与导出

**单条消息导出**是最基础的导出功能。用户可以将AI顾问的任意一条回复导出为PDF、PPT或Excel格式。系统自动识别消息中的文件类型标注（如"（PDF）"、"（PPT）"、"（Excel）"），在消息下方显示对应的下载按钮。点击下载按钮时，系统调用相应的生成器（pdfGenerator.ts、excelGenerator.ts）将消息内容转换为格式化文档，上传到S3存储，返回下载链接。导出操作消耗相应的积分（PDF 30积分、PPT 50积分、Excel 20积分）。

**完整文档生成**是高级功能，用于生成专业的商业文档。当AI顾问在回复中提供文件清单时（使用特定的Markdown格式标注），系统自动识别并显示文档下载按钮组。用户点击下载按钮时，系统执行以下流程：首先检查用户积分是否足够（根据文档类型扣除100/140/200积分），然后调用LLM对原始内容进行扩展和完善（增加详细说明、补充案例、优化结构），接着调用文档生成器生成专业排版的Word或PDF文档，最后上传到S3并返回下载链接。生成的文档记录保存在generated_documents表，7天内重复下载不再扣费。

**McKinsey风格排版**是文档生成的核心竞争力。系统根据文档类型（重度/中度/轻度）应用不同的排版模板。重度文档（如商业计划书）采用McKinsey风格封面，包含标题、副标题、日期、紫色装饰栏，自动生成完整目录（基于标题层级），页眉显示章节标题，页脚显示页码。中度文档（如市场分析报告）采用简洁专业封面，简化目录，页眉显示文档标题。轻度文档（如简报摘要）采用极简封面，不生成目录，仅页脚显示页码。Word文档使用docx库生成，支持多级标题、段落格式、表格、列表等元素。PDF文档使用pdf-lib库生成，集成思源黑体字体解决中文显示问题，支持自定义页眉页脚和页码。

**图表可视化**支持在对话中生成和导出图表。AI顾问可以在回复中使用Mermaid语法生成流程图、时序图、甘特图等，前端使用mermaid库自动渲染。对于数据图表（柱状图、饼图、折线图），AI顾问可以输出JSON格式的图表配置，前端使用Chart.js渲染。用户可以将包含图表的消息导出为PDF，系统会自动将图表转换为图片嵌入PDF中。

#### 2.1.5 管理后台系统

**用户管理功能**允许管理员查看所有注册用户的信息，包括用户ID、邮箱、注册时间、最后登录时间、当前积分余额（购买积分和订阅积分分别显示）、订阅套餐等级。管理员可以手动调整用户积分，支持增加或减少积分，单次调整限额为±10000积分。调整积分时必须填写操作备注，系统会自动记录到creditsTransactions表，类型标记为admin_adjustment，确保所有积分变动可追溯。

**订单管理功能**提供完整的订单查询和管理界面。管理员可以查看所有支付订单，包括订单号、用户信息（邮箱）、订单类型（订阅套餐或充值包）、订单金额、支付状态、支付时间、支付宝交易号等。订单列表按创建时间降序排序，支持分页浏览。对于支付失败或异常的订单，管理员可以手动更新订单状态或为用户补发积分。

**AI顾问配置管理**允许管理员编辑所有AI顾问的配置，包括顾问名称、描述、图标、systemPrompt、输入字段配置、欢迎语等。管理员可以添加新的AI顾问或禁用不再需要的顾问。systemPrompt是顾问的核心配置，定义了顾问的专业领域、咨询方法论、输出格式要求、禁止事项等。输入字段配置（inputFields）是JSON格式，定义了用户在咨询前需要填写的信息（如公司名称、行业、目标等），系统会在对话开始前收集这些信息并传递给LLM。

**专家顾问咨询管理**处理用户提交的人工专家咨询申请。当用户在价格页面点击"联系专家顾问"按钮时，会弹出咨询表单，用户填写姓名、联系方式、公司名称、咨询需求等信息。提交后，系统通过notifyOwner()函数向项目所有者（管理员）发送通知，管理员可以在Manus平台查看通知详情，并通过用户提供的联系方式主动联系用户提供人工咨询服务。

---

## 三、技术架构

### 3.1 技术栈

**前端技术栈**基于React 19和Vite 5构建。React 19提供最新的Hooks API和并发渲染能力，Vite 5提供极速的开发体验和优化的生产构建。UI组件库使用shadcn/ui，基于Radix UI和Tailwind CSS 4，提供无障碍访问和高度可定制的组件。路由管理使用wouter，轻量级的客户端路由库。状态管理使用React Query（通过tRPC集成），提供服务端状态缓存和乐观更新能力。样式方案使用Tailwind CSS 4，支持CSS变量主题和响应式设计。

**后端技术栈**基于Node.js 22和Express 4构建。Express 4提供稳定的HTTP服务器能力，支持中间件和路由管理。API层使用tRPC 11，提供端到端类型安全的RPC调用，无需手动编写API文档。数据库ORM使用Drizzle ORM，提供类型安全的SQL查询构建器和自动迁移工具。数据库使用MySQL 8（TiDB兼容），支持事务和复杂查询。认证方案使用JWT会话令牌，存储在HTTP-only Cookie中。文件存储使用S3对象存储，支持公网访问和CDN加速。

**AI集成方案**使用Manus内置的LLM API，底层模型为Claude 3.5 Sonnet。系统通过server/_core/llm.ts封装的invokeLLM函数调用LLM，支持流式输出和结构化响应。所有AI对话都通过tRPC的chat.stream接口处理，前端使用EventSource接收流式数据。系统通过全局提示词规则（shared/promptRules.ts）和顾问专属systemPrompt组合成完整的上下文，确保AI输出符合预期格式和质量标准。

**支付集成方案**使用支付宝电脑网站支付（alipay.trade.page.pay）。系统使用alipay-sdk库处理签名和验签，支持RSA2签名算法。支付流程包括创建订单、生成支付链接、跳转支付宝页面、接收异步回调、验证签名、更新订单状态、开通用户权益等步骤。所有支付相关配置（APPID、应用私钥、支付宝公钥）通过环境变量注入，确保安全性。

### 3.2 数据库设计

**用户表（users）**是核心表，存储用户的基本信息和积分余额。主要字段包括id（主键）、openId（Manus OAuth标识，可选）、email（邮箱，唯一）、username（用户名，可选）、password（加密密码）、loginMethod（登录方式）、role（角色：user/admin）、creditsPurchased（购买积分）、creditsSubscription（订阅积分）、creditsResetDate（积分重置日期）、createdAt（注册时间）、lastSignedIn（最后登录时间）。索引包括email唯一索引、openId唯一索引。

**AI顾问表（agents）**存储所有AI顾问的配置。主要字段包括id（主键）、name（顾问名称）、description（顾问描述）、icon（图标名称）、systemPrompt（系统提示词）、inputFields（输入字段配置，JSON格式）、welcomeMessage（欢迎语）、createdAt（创建时间）、updatedAt（更新时间）。当前系统有16个AI顾问，id范围为1-16，另有一个特殊的智能AI助手（id: 180001）。

**对话表（conversations）**存储用户与AI顾问的对话会话。主要字段包括id（主键）、userId（用户ID）、agentId（顾问ID）、title（对话标题）、createdAt（创建时间）、updatedAt（更新时间）。索引包括userId索引、agentId索引、(userId, agentId, updatedAt)复合索引用于快速查询用户与特定顾问的最近对话。

**消息表（messages）**存储对话中的所有消息。主要字段包括id（主键）、conversationId（对话ID）、role（角色：user/assistant/system）、content（消息内容，TEXT类型）、createdAt（创建时间）。索引包括conversationId索引用于快速查询对话历史。消息内容支持Markdown格式，可以包含代码块、表格、列表等元素。

**订阅表（subscriptions）**存储用户的订阅信息。主要字段包括id（主键）、userId（用户ID）、plan（套餐等级：free/basic/professional/enterprise）、monthlyLimit（月度次数限制，已废弃）、price（套餐价格，单位：分）、status（状态：active/expired/cancelled）、startDate（开始日期）、endDate（结束日期）、createdAt（创建时间）、updatedAt（更新时间）。索引包括userId唯一索引，确保每个用户只有一个有效订阅。

**订单表（orders）**存储所有支付订单。主要字段包括id（主键）、userId（用户ID）、outTradeNo（商户订单号，唯一）、tradeNo（支付宝交易号）、plan（订单类型，可以是套餐ID或充值包ID）、amount（订单金额，单位：分）、status（状态：pending/paid/cancelled/refunded）、paymentMethod（支付方式：alipay/wechat）、paidAt（支付时间）、createdAt（创建时间）、updatedAt（更新时间）。索引包括outTradeNo唯一索引、userId索引。

**积分交易表（creditsTransactions）**记录所有积分变动。主要字段包括id（主键）、userId（用户ID）、type（交易类型：consume/purchase/subscription_grant/refund/admin_adjustment）、amount（变动金额，正数表示增加，负数表示扣除）、balancePurchased（变动后购买积分余额）、balanceSubscription（变动后订阅积分余额）、description（操作描述）、relatedOrderId（关联订单ID，可选）、createdAt（创建时间）。索引包括userId索引、type索引、(userId, createdAt)复合索引用于查询用户积分明细。

**文档生成记录表（generatedDocuments）**存储所有生成的文档信息。主要字段包括id（主键）、userId（用户ID）、messageId（关联消息ID）、documentType（文档类型：light/medium/heavy）、fileType（文件格式：word/pdf）、title（文档标题）、s3Key（S3存储键）、s3Url（S3下载链接）、creditsDeducted（扣除积分数）、expiresAt（过期时间，7天后）、createdAt（创建时间）。索引包括userId索引、messageId索引、(userId, messageId, documentType)复合索引用于检查重复下载。

**使用记录表（usageRecords）**已废弃，原用于记录用户每月使用次数，现已改为积分制。表结构保留但不再使用。

### 3.3 核心业务逻辑

**积分扣除优先级算法**是积分系统的核心逻辑。当用户进行消耗积分的操作时，系统执行以下步骤：（1）检查总积分是否足够（购买积分+订阅积分≥所需积分），如果不足则返回错误；（2）优先扣除购买积分，如果购买积分≥所需积分，则直接从购买积分中扣除；（3）如果购买积分不足，则先扣完购买积分（设为0），再从订阅积分中扣除剩余部分；（4）更新users表的creditsPurchased和creditsSubscription字段；（5）记录一条consume类型的交易到creditsTransactions表，包含扣除金额、变动后余额、操作描述等信息。这个算法确保用户充值的积分不会因为订阅重置而浪费。

**订阅积分重置机制**每月自动执行。系统在users表的creditsResetDate字段记录下次重置时间（默认为注册后30天）。每次用户登录或进行操作时，系统调用checkAndResetCredits函数检查是否到达重置时间。如果当前时间≥重置时间，则执行重置操作：（1）根据用户当前订阅套餐（从subscriptions表查询）获取对应的月度积分额度（PLAN_CREDITS配置）；（2）将creditsSubscription字段重置为该额度；（3）将creditsResetDate字段更新为下个月的同一天；（4）记录一条subscription_grant类型的交易到creditsTransactions表。这个机制确保订阅用户每月都能获得新的积分额度。

**支付回调处理流程**是支付系统的核心环节。当用户完成支付后，支付宝通过POST请求异步通知系统支付结果。系统执行以下验证和处理步骤：（1）使用支付宝公钥验证请求签名，防止伪造请求；（2）检查订单号（out_trade_no）是否存在于orders表；（3）检查订单状态是否为pending，防止重复处理；（4）检查订单金额是否与支付宝返回的金额一致；（5）更新订单状态为paid，记录支付宝交易号（trade_no）和支付时间（paidAt）；（6）根据订单类型执行业务逻辑：如果是订阅套餐（plan字段为basic/professional/enterprise），则调用createOrUpdateSubscription创建或更新订阅记录，并调用resetSubscriptionCredits重置订阅积分；如果是充值包（plan字段为pack_*格式），则调用addPurchasedCredits增加购买积分；（7）返回"success"字符串给支付宝，确认回调已处理。整个流程使用数据库事务保证原子性。

**文档生成与缓存策略**优化用户体验和成本控制。当用户点击文档下载按钮时，系统执行以下流程：（1）检查generated_documents表是否存在该用户、该消息、该文档类型的记录，且未过期（expiresAt > 当前时间）；（2）如果存在有效记录，直接返回S3下载链接，不扣除积分；（3）如果不存在或已过期，则检查用户积分是否足够（根据documentType扣除100/140/200积分）；（4）调用deductCredits扣除积分；（5）调用invokeLLM让AI对原始消息内容进行扩展和完善，生成更详细的文档内容；（6）调用文档生成器（generateWordDocument或generatePDF）生成格式化文档；（7）调用storagePut上传文档到S3，获取公网URL；（8）在generated_documents表插入记录，设置expiresAt为7天后；（9）返回S3下载链接给前端。这个策略确保7天内重复下载不扣费，同时避免文档永久存储占用过多空间。

**利润率保证机制**是定价策略的核心。系统通过精确计算确保所有套餐和充值包的理论利润率≥300%。计算公式为：利润率 = (售价 - 成本) / 成本 × 100%。成本包括两部分：（1）AI对话成本，单次对话成本约¥0.20（基于Claude 3.5 Sonnet的API定价和平均token消耗量）；（2）固定成本，每用户每月约¥10（包括服务器、数据库、存储、带宽等）。以基础版为例：售价¥99，提供750积分，可进行75次基础对话，成本为75×0.20+10=¥25，利润为99-25=¥74，利润率为74/25×100%=296%。系统通过test-billing-system.test.ts测试文件持续验证所有套餐的利润率，确保商业模式可持续。

---

## 四、用户体验设计

### 4.1 界面设计原则

**简洁专业**是界面设计的首要原则。平台采用浅色背景（灰白色系）和紫色主题色（品牌色），营造专业可信的氛围。所有页面都遵循一致的设计语言，使用shadcn/ui组件库提供的Card、Button、Dialog等组件，确保视觉统一性。字体使用系统默认的无衬线字体（font-sans），字号适中（基础字号16px），行距舒适（1.5倍行距），确保长时间阅读不疲劳。

**响应式布局**确保在不同设备上都有良好的体验。首页的AI顾问卡片采用网格布局，桌面端显示3列，平板端显示2列，移动端显示1列。对话页面采用全宽布局，消息内容居中显示，最大宽度768px，确保在大屏幕上阅读舒适。导航栏在移动端自动收起为汉堡菜单，保持界面简洁。

**即时反馈**提升用户的操作确定性。所有按钮点击后都有视觉反馈（颜色变化、阴影效果），加载状态使用Skeleton占位符或Spinner动画，错误提示使用Toast消息（右上角弹出），成功操作使用绿色Toast，失败操作使用红色Toast。对话输入框支持实时字数统计，超过限制时显示警告。

**无障碍访问**确保所有用户都能使用平台。所有交互元素都支持键盘导航（Tab键切换焦点，Enter键确认），焦点状态有明显的视觉提示（蓝色边框）。图片都有alt属性描述，按钮都有aria-label属性说明功能。颜色对比度符合WCAG 2.1 AA标准，确保视力障碍用户也能清晰阅读。

### 4.2 关键页面设计

**首页（Home.tsx）**是用户的第一触点。页面顶部是品牌Logo和登录按钮，中间是Hero区域展示平台的核心价值主张（"您的AI商业顾问"），下方是16个AI顾问的分类展示。顾问分为4大类（战略与规划、营销与增长、运营与管理、投资与机会），每类默认展开显示，用户可以点击折叠。每个顾问卡片包含图标、名称、描述和"开始咨询"按钮。在战略与规划和营销与增长之间插入智能AI助手搜索框，引导用户使用智能导航功能。页面底部是备案号和版权信息。

**对话页面（AgentChat.tsx）**是核心交互界面。页面顶部是顾问名称和操作按钮（开始新对话、导出PDF），中间是消息列表区域，底部是输入框和发送按钮。消息列表采用全宽布局，消息内容居中显示，用户消息靠右对齐（浅蓝色背景），AI消息靠左对齐（白色背景）。AI消息支持Markdown渲染，包括标题、列表、表格、代码块等元素。AI消息下方显示文件下载按钮（如果消息中包含文件标注）。输入框支持多行输入和文件上传，发送按钮在输入内容为空时禁用。页面首次加载时自动显示顾问的欢迎语，无需用户主动发送消息。

**价格页面（Pricing.tsx）**展示所有套餐和充值包。页面顶部是标题和说明，中间是4个套餐卡片（免费版、基础版、专业版、企业版），每个卡片包含套餐名称、价格、月度积分、功能列表和购买按钮。专业版卡片有"最受欢迎"标签。套餐卡片下方是专家顾问咨询入口，引导用户联系人工专家。页面底部是备案号和版权信息。用户点击购买按钮后跳转到支付页面，完成支付后自动开通套餐。

**使用情况页面（CreditUsage.tsx）**展示用户的积分详情和使用明细。页面顶部是积分总览卡片，显示总积分、购买积分、订阅积分、下次刷新时间。中间是订阅信息卡片，显示当前套餐、续费日期、管理按钮。下方是积分明细表格，显示所有积分交易记录，包括操作描述、日期、积分变更（正数用绿色显示，负数用红色显示）。表格支持分页浏览，默认显示最近50条记录。

**管理后台（Admin.tsx）**是管理员专用界面。页面左侧是导航菜单，包含用户管理、订单管理、AI顾问管理等功能入口。右侧是内容区域，根据选择的菜单项显示不同的管理界面。用户管理页面显示所有用户的列表，包括邮箱、注册时间、积分余额、订阅套餐，支持搜索和筛选。每个用户行有"调整积分"按钮，点击后弹出对话框，管理员可以输入调整金额（正数或负数）和操作备注，确认后立即生效。订单管理页面显示所有支付订单，包括订单号、用户邮箱、订单类型、金额、状态、支付时间，支持按状态筛选。

### 4.3 交互流程设计

**首次使用流程**引导新用户快速上手。用户访问首页后，看到16个AI顾问的分类展示，可以浏览各个顾问的描述了解其专业领域。用户点击任意顾问的"开始咨询"按钮，如果未登录则跳转到登录页面。登录页面提供邮箱密码登录和注册入口，新用户点击"注册"链接跳转到注册页面，填写邮箱、密码、确认密码后提交。注册成功后自动登录并跳转回对话页面，系统自动显示顾问的欢迎语，引导用户输入咨询需求。用户输入问题后点击发送，AI顾问开始流式输出回复，用户可以实时看到回复内容。对话结束后，用户可以点击"开始新对话"按钮开始新的咨询，或点击Logo返回首页选择其他顾问。

**积分购买流程**简化支付体验。用户在对话过程中如果积分不足，系统会弹出Toast提示"积分不足，请充值"，并提供"去充值"按钮。用户点击按钮跳转到价格页面，可以选择月度套餐或充值包。选择套餐后点击"立即购买"按钮，系统创建订单并跳转到支付页面。支付页面显示订单信息（套餐名称、金额、订单号）和支付宝二维码（或支付链接）。用户使用支付宝扫码或点击链接完成支付，支付成功后支付宝自动跳转回平台的支付结果页面。支付结果页面显示"支付成功"提示和订单详情，用户点击"返回首页"按钮回到平台。系统在后台接收支付宝的异步回调，自动开通用户的套餐或充值积分，用户刷新页面后即可看到积分余额更新。

**文档生成流程**提供专业文档输出。用户在对话中向AI顾问咨询商业问题，AI顾问在回复中提供结构化的解决方案，并在回复末尾标注可生成的文档类型（如"【可下载文件】1. 完整商业计划书（Word）- 重度文档，200积分"）。系统自动识别这个标注，在消息下方显示"下载Word文档"按钮。用户点击按钮，系统弹出确认对话框，显示"生成此文档将消耗200积分，确认下载？"。用户点击确认，系统开始生成文档，显示加载动画。生成过程包括调用LLM扩展内容、生成Word文档、上传到S3，通常需要10-30秒。生成完成后，系统自动下载文档到用户本地，并显示"文档生成成功"Toast提示。用户可以在7天内重复下载该文档，不再扣除积分。

**管理员操作流程**简化管理任务。管理员登录后，点击右上角用户菜单选择"管理后台"进入管理界面。在用户管理页面，管理员可以搜索用户邮箱找到目标用户，点击"调整积分"按钮打开对话框。对话框中输入调整金额（如+500表示增加500积分，-100表示扣除100积分）和操作备注（如"补偿支付失败订单"），点击确认按钮。系统立即执行积分调整，更新users表的creditsPurchased字段，并记录交易到creditsTransactions表。对话框关闭后，用户列表自动刷新，显示更新后的积分余额。管理员可以在订单管理页面查看该用户的支付记录，确认操作是否正确。

---

## 五、商业模式

### 5.1 收入模式

**月度订阅收入**是主要收入来源。平台提供三档付费套餐（基础版¥99/月、专业版¥299/月、企业版¥999/月），目标用户是需要频繁使用AI咨询服务的企业和个人。根据定价策略，基础版适合偶尔使用的个人用户（每月约75次对话），专业版适合频繁使用的专业人士（每月约260次对话），企业版适合团队或高频用户（每月约1100次对话）。假设平台有1000个付费用户，其中60%选择基础版，30%选择专业版，10%选择企业版，则月度订阅收入为1000×(0.6×99+0.3×299+0.1×999)=248,700元，年度订阅收入约298万元。

**积分充值收入**是补充收入来源。部分用户不希望订阅，更倾向于按需购买积分。平台提供四档充值包（入门包¥49、超值包¥99、专业包¥199、企业包¥399），满足不同用户的需求。假设平台有2000个非订阅用户，其中50%购买入门包，30%购买超值包，15%购买专业包，5%购买企业包，平均每季度购买一次，则季度充值收入为2000×(0.5×49+0.3×99+0.15×199+0.05×399)=139,650元，年度充值收入约56万元。

**专家顾问咨询收入**是高价值服务。平台在价格页面提供"联系专家顾问"入口，引导需要深度咨询的用户联系人工专家。人工专家咨询按项目收费，单个项目收费范围为5000-50000元，具体根据项目复杂度和咨询时长确定。假设平台每月成交2个专家咨询项目，平均单价20000元，则月度专家咨询收入为40000元，年度专家咨询收入约48万元。

**总收入预测**：假设平台运营一年后达到1000个订阅用户和2000个充值用户，年度总收入约为298万（订阅）+56万（充值）+48万（专家咨询）=402万元。

### 5.2 成本结构

**AI API成本**是最大的变动成本。平台使用Claude 3.5 Sonnet模型，根据Anthropic的定价，输入token约$3/百万token，输出token约$15/百万token。平均每次对话消耗约2000个输入token和1000个输出token，单次对话成本约为(2000×3+1000×15)/1000000×7=0.147元（按人民币汇率7计算）。考虑到文档生成和深度对话的额外消耗，平均单次对话成本约¥0.20。假设平台每月处理100万次对话，AI API成本约20万元/月，年度成本约240万元。

**服务器与存储成本**是固定成本。平台使用云服务器（4核8G配置）托管后端服务，月度费用约2000元。数据库使用TiDB Serverless，月度费用约1000元（包含10GB存储和1亿次查询）。S3对象存储用于文件存储，月度费用约500元（包含100GB存储和10TB流量）。CDN加速费用约500元/月。总计月度服务器与存储成本约4000元，年度成本约5万元。

**支付手续费**是交易成本。支付宝电脑网站支付的手续费率为0.6%，假设年度交易额为400万元，支付手续费约2.4万元。

**人力成本**是主要固定成本。假设团队有3人（1个产品经理+1个全栈工程师+1个运营人员），平均月薪15000元，年度人力成本约54万元。

**营销成本**用于获客。假设年度营销预算为50万元，用于搜索引擎广告、内容营销、KOL合作等渠道。

**总成本预测**：年度总成本约为240万（AI API）+5万（服务器）+2.4万（支付手续费）+54万（人力）+50万（营销）=351.4万元。

### 5.3 盈利能力分析

**毛利率**计算：毛利率=(总收入-变动成本)/总收入×100%=(402-240)/402×100%=40.3%。这个毛利率水平在SaaS行业属于中等水平，主要原因是AI API成本占比较高。随着用户规模扩大和模型成本下降，毛利率有望提升到50%以上。

**净利润**计算：净利润=总收入-总成本=402-351.4=50.6万元。净利润率约为12.6%，在初创阶段属于健康水平。随着用户规模扩大，固定成本（人力、营销）的边际成本降低，净利润率有望提升到20%以上。

**盈亏平衡点**计算：假设固定成本为111.4万元（人力54万+营销50万+服务器5万+支付手续费2.4万），变动成本率为60%（AI API成本占总收入的60%），则盈亏平衡点收入=固定成本/(1-变动成本率)=111.4/(1-0.6)=278.5万元。这意味着平台年度收入达到278.5万元时即可实现盈亏平衡，按照当前定价策略，约需要700个订阅用户+1400个充值用户。

**投资回报周期**：假设初始投资为100万元（用于产品开发、服务器采购、初期营销），第一年净利润50.6万元，第二年随着用户规模翻倍净利润达到150万元，则投资回报周期约为1.5年。

### 5.4 增长策略

**内容营销**是主要获客渠道。平台定期发布商业分析文章、行业报告、案例研究等内容，通过SEO优化吸引自然流量。内容主题包括"如何撰写融资BP"、"商业模式画布实战"、"竞品分析方法论"等，与平台的AI顾问服务紧密相关。文章末尾引导读者注册平台体验AI顾问服务。目标是每月发布10篇高质量文章，吸引5000个自然访问用户，转化率5%，即每月新增250个注册用户。

**KOL合作**扩大品牌影响力。与商业领域的知识博主、创业导师、投资人合作，邀请他们体验平台并分享使用心得。合作形式包括视频评测、直播演示、文章推荐等。目标是每月合作3-5个KOL，覆盖10万粉丝，转化率1%，即每月新增1000个注册用户。

**免费试用**降低用户决策门槛。新注册用户自动获得100积分（约10次对话），可以免费体验所有AI顾问服务。试用期间，系统通过邮件和站内消息引导用户完成关键操作（如完成第一次对话、尝试文档导出），提升用户对平台价值的认知。试用结束后，系统推送套餐购买优惠（如首月8折），促进转化。目标是免费用户到付费用户的转化率达到15%。

**企业团队套餐**拓展B端市场。针对企业客户推出团队套餐，支持多人共享积分池、统一管理账号、批量购买折扣等功能。企业套餐定价为¥1999/月（提供25000积分，约2500次对话），适合10-20人的团队使用。通过企业销售团队主动拓展客户，目标是每季度签约10个企业客户，年度企业客户收入约96万元。

**API开放平台**创造生态价值。将平台的AI顾问能力封装为API，允许第三方开发者集成到自己的产品中。API按调用次数收费，单次调用收费¥0.50（高于内部成本¥0.20，保证利润空间）。目标是吸引100个开发者接入，每月调用10万次，月度API收入5万元，年度API收入60万元。

**国际化扩展**开拓海外市场。平台的AI顾问系统支持多语言，可以快速适配英文、日文、韩文等语言市场。优先进入东南亚市场（新加坡、马来西亚、泰国），这些市场的创业生态活跃，对商业咨询服务需求旺盛，且支付习惯与中国相似。目标是第二年进入2-3个海外市场,海外用户占比达到20%。

---

## 六、风险与挑战

### 6.1 技术风险

**LLM API稳定性风险**：平台依赖第三方LLM API（Claude 3.5 Sonnet），如果API服务中断或性能下降，将直接影响用户体验。缓解措施包括：（1）集成多个LLM提供商（如OpenAI、Google Gemini）作为备选，当主要API不可用时自动切换；（2）实现本地缓存机制，对常见问题的回复进行缓存，减少API调用；（3）与LLM提供商签订SLA协议，确保服务可用性≥99.9%。

**数据安全风险**：平台存储用户的对话历史和商业敏感信息，如果发生数据泄露将严重损害用户信任。缓解措施包括：（1）所有敏感数据加密存储，使用AES-256算法；（2）实施严格的访问控制，管理员访问用户数据需要审计日志；（3）定期进行安全审计和渗透测试；（4）购买网络安全保险，降低财务损失。

**系统扩展性风险**：随着用户规模增长，系统可能面临性能瓶颈。缓解措施包括：（1）采用微服务架构，将AI对话、支付、文档生成等功能拆分为独立服务，支持水平扩展；（2）使用Redis缓存热点数据，减少数据库查询压力；（3）使用CDN加速静态资源访问；（4）实施数据库读写分离和分库分表策略。

### 6.2 商业风险

**市场竞争风险**：AI咨询领域竞争激烈，ChatGPT、Claude、文心一言等通用AI助手都可以提供商业咨询服务。平台的差异化优势在于：（1）专业化定位，16个垂直领域的AI顾问比通用助手更专业；（2）结构化输出，AI回复遵循商业咨询的标准格式和方法论；（3）文档生成能力，用户可以直接获得专业排版的商业文档；（4）积分订阅模式，比按token计费更透明和可预测。

**用户留存风险**：用户可能在试用后不再使用平台，导致付费转化率低。缓解措施包括：（1）优化首次使用体验，通过欢迎语和引导问题降低使用门槛；（2）定期推送有价值的内容（如行业报告、案例分析），保持用户活跃度；（3）实施用户分层运营，对高价值用户提供专属服务（如优先响应、专家咨询折扣）；（4）建立用户社区，鼓励用户分享使用心得和商业见解。

**定价策略风险**：如果定价过高，用户可能选择免费的通用AI助手；如果定价过低，平台可能无法覆盖成本。缓解措施包括：（1）持续监控用户使用数据，动态调整积分消耗规则和套餐价格；（2）提供灵活的定价选项（月度订阅+充值包），满足不同用户的需求；（3）定期进行用户调研，了解用户对价格的敏感度和支付意愿；（4）推出限时优惠活动，刺激用户购买决策。

### 6.3 合规风险

**内容审核风险**：AI生成的内容可能包含不当信息（如政治敏感内容、虚假信息、侵权内容），导致平台承担法律责任。缓解措施包括：（1）在全局提示词规则中明确禁止生成违法违规内容；（2）实施内容审核机制，对AI回复进行关键词过滤和敏感词检测；（3）提供用户举报功能，及时处理问题内容；（4）在用户协议中明确平台的免责条款。

**数据隐私合规风险**：平台需要遵守《个人信息保护法》等法律法规，确保用户数据的合法使用。缓解措施包括：（1）在用户注册时明确告知数据收集和使用目的，获得用户同意；（2）提供数据导出和删除功能，尊重用户的数据权利；（3）不将用户数据用于训练AI模型或出售给第三方；（4）定期进行合规审计，确保数据处理符合法律要求。

**支付合规风险**：平台涉及在线支付，需要遵守支付行业的监管要求。缓解措施包括：（1）使用持牌支付机构（支付宝）提供支付服务，避免直接处理用户资金；（2）实施反洗钱和反欺诈监控，识别异常交易行为；（3）保留完整的交易记录，配合监管部门的审计要求；（4）购买支付安全保险，降低财务风险。

---

## 七、未来规划

### 7.1 短期规划（3-6个月）

**完善核心功能**：（1）优化AI对话质量，通过用户反馈持续改进顾问的systemPrompt和全局规则；（2）增强文档生成能力，支持更多文档类型（如Excel财务模型、PPT路演材料）；（3）实现对话历史搜索功能，用户可以快速找到历史对话中的关键信息；（4）添加对话分享功能，用户可以将对话链接分享给同事或客户。

**提升用户体验**：（1）实现移动端适配，开发微信小程序或H5版本，方便用户随时随地使用；（2）优化加载速度，通过代码分割和懒加载减少首屏加载时间；（3）增加多语言支持，优先支持英文，为国际化扩展做准备；（4）实施用户反馈机制，在对话页面添加"满意度评价"功能，收集用户对AI回复质量的评价。

**拓展获客渠道**：（1）启动内容营销计划，每月发布10篇商业分析文章，吸引自然流量；（2）与3-5个商业领域KOL合作，扩大品牌影响力；（3）参加创业大赛和行业展会，直接接触目标用户；（4）推出推荐奖励计划，用户推荐新用户注册可获得积分奖励。

### 7.2 中期规划（6-12个月）

**推出企业版功能**：（1）开发团队协作功能，支持多人共享对话、评论和协作编辑；（2）实现权限管理系统，企业管理员可以分配不同成员的访问权限；（3）提供使用统计报表，企业管理员可以查看团队的使用情况和积分消耗；（4）支持私有化部署，满足大型企业的数据安全要求。

**开放API平台**：（1）将AI顾问能力封装为RESTful API，提供完整的API文档和SDK；（2）建立开发者社区，提供技术支持和最佳实践分享；（3）推出API调用套餐，按调用次数收费；（4）举办开发者大赛，鼓励第三方开发者基于API构建创新应用。

**扩展AI顾问阵容**：（1）增加行业垂直顾问，如医疗健康顾问、教育培训顾问、零售电商顾问等；（2）增加职能垂直顾问，如法律合规顾问、财务税务顾问、人力资源顾问等；（3）支持用户自定义顾问，用户可以根据自己的需求创建专属AI顾问；（4）实现顾问协作功能，多个顾问可以共同参与一个咨询项目。

### 7.3 长期规划（1-3年）

**构建商业知识图谱**：（1）从对话数据中提取商业实体（公司、产品、市场、技术等）和关系，构建知识图谱；（2）基于知识图谱提供智能推荐，当用户咨询某个话题时，自动推荐相关的案例和资料；（3）实现知识图谱可视化，用户可以探索商业实体之间的关系网络；（4）开放知识图谱API，为第三方应用提供商业数据服务。

**打造AI商业咨询生态**：（1）引入人工专家入驻平台，提供深度咨询服务，平台收取佣金；（2）建立咨询项目市场，用户可以发布咨询需求，AI顾问和人工专家竞标；（3）推出咨询成果交易市场，用户可以购买他人生成的商业文档和报告；（4）实现咨询服务标准化，将优秀的咨询案例沉淀为可复用的方法论和模板。

**实现智能决策支持**：（1）集成外部数据源（如企业工商信息、行业报告、市场数据），为AI顾问提供实时数据支持；（2）开发预测模型，基于历史数据预测市场趋势、销售业绩、投资回报等；（3）实现自动化决策，用户设定决策规则后，系统自动执行（如自动调整定价策略、自动分配营销预算）；（4）提供决策模拟功能，用户可以在虚拟环境中测试不同决策方案的效果。

---

## 八、附录

### 8.1 技术栈详细清单

**前端技术栈**：
- React 19.0.0 - UI框架
- Vite 5.4.11 - 构建工具
- TypeScript 5.7.2 - 类型系统
- Tailwind CSS 4.0.0 - 样式框架
- shadcn/ui - UI组件库
- tRPC 11.0.0 - RPC框架
- React Query 5.0.0 - 状态管理
- wouter 3.3.5 - 路由管理
- lucide-react 0.469.0 - 图标库
- sonner 1.7.1 - Toast通知
- streamdown 1.0.0 - Markdown流式渲染

**后端技术栈**：
- Node.js 22.13.0 - 运行时
- Express 4.21.2 - Web框架
- TypeScript 5.7.2 - 类型系统
- tRPC 11.0.0 - RPC框架
- Drizzle ORM 0.38.3 - 数据库ORM
- MySQL 8.0 - 关系数据库
- bcrypt 5.1.1 - 密码加密
- jsonwebtoken 9.0.2 - JWT令牌
- alipay-sdk 3.6.0 - 支付宝SDK
- docx 9.0.2 - Word文档生成
- pdf-lib 1.17.1 - PDF文档生成
- exceljs 4.4.0 - Excel文档生成

**AI集成**：
- Claude 3.5 Sonnet - 大语言模型
- Manus LLM API - API接口

**开发工具**：
- pnpm 9.15.4 - 包管理器
- tsx 4.19.2 - TypeScript执行器
- vitest 2.1.9 - 测试框架
- eslint 9.17.0 - 代码检查
- prettier 3.4.2 - 代码格式化

### 8.2 数据库表结构详细说明

**users表**（用户表）：
```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) UNIQUE,
  name TEXT,
  email VARCHAR(320) UNIQUE,
  username VARCHAR(64) UNIQUE,
  password VARCHAR(255),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
  creditsPurchased INT DEFAULT 0 NOT NULL,
  creditsSubscription INT DEFAULT 100 NOT NULL,
  creditsResetDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);
```

**agents表**（AI顾问表）：
```sql
CREATE TABLE agents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon VARCHAR(50) NOT NULL,
  systemPrompt TEXT NOT NULL,
  inputFields TEXT NOT NULL,
  welcomeMessage TEXT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
);
```

**conversations表**（对话表）：
```sql
CREATE TABLE conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  agentId INT NOT NULL,
  title VARCHAR(200) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_agentId (agentId),
  INDEX idx_userId_agentId_updatedAt (userId, agentId, updatedAt)
);
```

**messages表**（消息表）：
```sql
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId INT NOT NULL,
  role ENUM('user', 'assistant', 'system') NOT NULL,
  content TEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_conversationId (conversationId)
);
```

**subscriptions表**（订阅表）：
```sql
CREATE TABLE subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  plan ENUM('free', 'basic', 'professional', 'enterprise') DEFAULT 'free' NOT NULL,
  monthlyLimit INT DEFAULT 0 NOT NULL,
  price INT DEFAULT 0 NOT NULL,
  status ENUM('active', 'expired', 'cancelled') DEFAULT 'active' NOT NULL,
  startDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  endDate TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  UNIQUE INDEX idx_userId (userId)
);
```

**orders表**（订单表）：
```sql
CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  outTradeNo VARCHAR(64) UNIQUE NOT NULL,
  tradeNo VARCHAR(64),
  plan VARCHAR(50) NOT NULL,
  amount INT NOT NULL,
  status ENUM('pending', 'paid', 'cancelled', 'refunded') DEFAULT 'pending' NOT NULL,
  paymentMethod VARCHAR(20) DEFAULT 'alipay' NOT NULL,
  paidAt TIMESTAMP,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_userId (userId)
);
```

**creditsTransactions表**（积分交易表）：
```sql
CREATE TABLE creditsTransactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  type ENUM('consume', 'purchase', 'subscription_grant', 'refund', 'admin_adjustment') NOT NULL,
  amount INT NOT NULL,
  balancePurchased INT NOT NULL,
  balanceSubscription INT NOT NULL,
  description TEXT NOT NULL,
  relatedOrderId INT,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_type (type),
  INDEX idx_userId_createdAt (userId, createdAt)
);
```

**generatedDocuments表**（文档生成记录表）：
```sql
CREATE TABLE generatedDocuments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  messageId INT NOT NULL,
  documentType ENUM('light', 'medium', 'heavy') NOT NULL,
  fileType ENUM('word', 'pdf') NOT NULL,
  title VARCHAR(255) NOT NULL,
  s3Key VARCHAR(500) NOT NULL,
  s3Url TEXT NOT NULL,
  creditsDeducted INT NOT NULL,
  expiresAt TIMESTAMP NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX idx_userId (userId),
  INDEX idx_messageId (messageId),
  INDEX idx_userId_messageId_documentType (userId, messageId, documentType)
);
```

### 8.3 API接口文档

**认证接口**：
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/me` - 获取当前用户信息

**AI顾问接口**：
- `GET /api/agents` - 获取所有AI顾问列表
- `GET /api/agents/:id` - 获取单个AI顾问详情
- `POST /api/chat/stream` - 发送消息并接收流式回复
- `GET /api/conversations` - 获取用户的对话列表
- `GET /api/conversations/:id/messages` - 获取对话的消息历史
- `POST /api/conversations` - 创建新对话

**积分与订阅接口**：
- `GET /api/credits` - 获取用户积分详情
- `GET /api/credits/transactions` - 获取积分交易明细
- `GET /api/subscription` - 获取用户订阅信息
- `POST /api/subscription/upgrade` - 升级订阅套餐

**支付接口**：
- `POST /api/payment/create` - 创建支付订单
- `POST /api/payment/alipay/notify` - 支付宝异步回调
- `GET /api/payment/query` - 查询订单状态

**文档导出接口**：
- `POST /api/export/pdf` - 导出单条消息为PDF
- `POST /api/export/excel` - 导出单条消息为Excel
- `POST /api/documents/generate` - 生成完整文档

**管理后台接口**：
- `GET /api/admin/users` - 获取所有用户列表
- `POST /api/admin/users/:id/adjust-credits` - 调整用户积分
- `GET /api/admin/orders` - 获取所有订单列表
- `GET /api/admin/agents` - 获取所有AI顾问配置
- `PUT /api/admin/agents/:id` - 更新AI顾问配置

### 8.4 环境变量配置

**数据库配置**：
- `DATABASE_URL` - MySQL数据库连接字符串

**认证配置**：
- `JWT_SECRET` - JWT令牌签名密钥
- `OAUTH_SERVER_URL` - Manus OAuth服务器地址
- `VITE_OAUTH_PORTAL_URL` - Manus登录门户地址
- `VITE_APP_ID` - Manus应用ID
- `OWNER_OPEN_ID` - 项目所有者OpenID
- `OWNER_NAME` - 项目所有者名称

**支付配置**：
- `ALIPAY_APP_ID` - 支付宝应用ID
- `ALIPAY_PRIVATE_KEY` - 支付宝应用私钥
- `ALIPAY_PUBLIC_KEY` - 支付宝公钥

**AI配置**：
- `BUILT_IN_FORGE_API_URL` - Manus LLM API地址
- `BUILT_IN_FORGE_API_KEY` - Manus LLM API密钥
- `VITE_FRONTEND_FORGE_API_URL` - 前端LLM API地址
- `VITE_FRONTEND_FORGE_API_KEY` - 前端LLM API密钥

**邮件配置**：
- `SMTP_USER` - SMTP用户名
- `SMTP_PASS` - SMTP密码

**应用配置**：
- `VITE_APP_TITLE` - 应用标题
- `VITE_APP_LOGO` - 应用Logo地址
- `VITE_ANALYTICS_ENDPOINT` - 分析服务端点
- `VITE_ANALYTICS_WEBSITE_ID` - 分析网站ID

---

**文档结束**

本PRD文档涵盖了泽思AI商业智库的所有已实现功能、技术架构、商业模式和未来规划。文档将随着产品迭代持续更新，确保与实际系统保持一致。

**版本历史**：
- v1.0 (2025-01-11) - 初始版本，记录所有已实现功能
