# 泽思AI商业智库 - 迁移方案

## 项目概述

将现有网站从 Manus 平台迁移到独立部署架构，确保业务连续性、数据安全和自主可控。

**当前状态**：
- 网站：www.zesiai.com（正在运营）
- 部署：AWS ECS（Manus配置）
- 数据库：TiDB Serverless
- AI API：Manus内置API
- 代码：功能完整，架构良好

**目标状态**：
- 部署：Vercel（前端）+ Railway（后端）
- 数据库：PostgreSQL（Neon）
- AI API：独立Claude/Gemini API Key
- 管理：完全自主控制

---

## 一、关键问题诊断

### 1.1 必须立即解决的依赖

| 依赖项 | 当前状态 | 风险等级 | 解决方案 |
|--------|----------|----------|----------|
| Manus API | 核心AI调用 | 🔴 高 | 替换为Claude/Gemini直连 |
| TiDB数据库 | 全部业务数据 | 🔴 高 | 迁移到PostgreSQL |
| AWS ECS部署 | 生产环境 | 🟡 中 | 迁移到Vercel+Railway |
| 支付宝回调 | 支付系统核心 | 🟢 低 | 仅需更新回调URL |

### 1.2 代码架构评估

**优势（保留）**：
- React 19 + TypeScript + Vite，现代技术栈
- tRPC端到端类型安全
- Drizzle ORM便于数据库迁移
- 模块化设计，职责清晰

**需要改造**：
- AI调用层：从Manus API改为直连Claude/Gemini
- 数据库层：MySQL方言改为PostgreSQL方言
- 部署配置：从ECS改为Serverless

---

## 二、目标架构设计

### 2.1 部署架构

```
用户
  ↓ HTTPS
Vercel（前端静态托管）
  ↓ API请求
Railway（后端Node.js服务）
  ↓ 数据库连接
Neon PostgreSQL（托管数据库）
  ↓ AI调用
Anthropic/Google API
```

### 2.2 技术选型理由

| 组件 | 选择 | 理由 |
|------|------|------|
| 前端托管 | Vercel | 与React/Vite深度集成，自动部署，全球CDN |
| 后端托管 | Railway | 一键部署Docker容器，自动扩缩容，比AWS简单 |
| 数据库 | Neon | 托管PostgreSQL，自动备份，按量付费 |
| AI模型 | Claude 3.5 Sonnet | 商业咨询场景表现最佳，API稳定 |
| 备选模型 | Gemini Pro | 成本更低，作为备选 |

### 2.3 成本估算

**月度运营成本**：
- Vercel Pro：$20
- Railway：$25-50（根据流量）
- Neon PostgreSQL：$25（1GB RAM）
- Claude API：¥500-2000（按使用量）
- Sentry监控：$26
- **总计**：约¥800-2500/月

---

## 三、迁移步骤详解

### Phase 1：准备工作（3天）

#### Day 1：申请必要账号和Key

1. **Anthropic API Key**
   - 访问：https://console.anthropic.com
   - 注册账号，绑定信用卡
   - 创建API Key，设置限额（建议$100/月上限）
   - 测试：`curl https://api.anthropic.com/v1/messages -H "x-api-key: YOUR_KEY"`

2. **GitHub仓库**
   - 当前代码已clone到本地
   - 创建新的private repository
   - 推送清理后的代码

3. **Vercel账号**
   - 使用GitHub账号登录：https://vercel.com
   - 绑定信用卡（开始免费，后期按需升级）

4. **Railway账号**
   - 使用GitHub账号登录：https://railway.app
   - 绑定信用卡

5. **Neon数据库**
   - 使用GitHub账号登录：https://neon.tech
   - 创建PostgreSQL项目
   - 记录连接字符串

#### Day 2：本地环境改造

1. **AI调用层改造**
   - 修改 `server/_core/llm.ts`
   - 从Manus API改为Anthropic API
   - 保持接口兼容，最小改动

2. **数据库Schema转换**
   - 将MySQL方言改为PostgreSQL方言
   - Drizzle ORM支持自动转换
   - 主要变化：
     - `mysqlTable` → `pgTable`
     - `mysqlEnum` → `pgEnum`
     - `int` → `integer`
     - `timestamp` → `timestamp`

3. **环境变量配置**
   ```env
   # AI配置
   ANTHROPIC_API_KEY=sk-xxx
   ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

   # 数据库配置
   DATABASE_URL=postgresql://user:pass@host/db

   # 其他配置保持不变
   JWT_SECRET=xxx
   ALIPAY_APP_ID=xxx
   ...
   ```

#### Day 3：本地测试

1. **数据库迁移测试**
   - 导出TiDB数据为SQL
   - 导入PostgreSQL
   - 验证数据完整性

2. **AI调用测试**
   - 测试Agent对话功能
   - 验证流式输出
   - 测试文档生成功能

3. **支付功能测试**
   - 支付宝沙箱测试
   - 验证回调处理

---

### Phase 2：新环境部署（2天）

#### Day 4：后端部署（Railway）

1. **创建Railway项目**
   - 导入GitHub仓库
   - 选择Node.js环境
   - 配置环境变量

2. **数据库连接**
   - 在Railway添加Neon数据库
   - 运行数据库迁移
   - 验证连接

3. **域名配置**
   - Railway自动生成域名：`zesai-api.up.railway.app`
   - 配置自定义域名（可选）：`api.zesiai.com`
   - 更新支付宝回调URL

#### Day 5：前端部署（Vercel）

1. **创建Vercel项目**
   - 导入GitHub仓库
   - 选择Vite框架
   - 配置构建命令：`cd client && npm run build`
   - 配置输出目录：`client/dist`

2. **API代理配置**
   - 在Vercel配置API路由代理到Railway后端
   - 或使用CORS直接连接

3. **域名配置**
   - 绑定域名：`www.zesiai.com`
   - 配置DNS解析
   - 启用HTTPS

---

### Phase 3：数据迁移（2天）

#### Day 6：数据导出

1. **TiDB数据导出**
   ```bash
   # 使用Drizzle导出
   npx drizzle-kit export

   # 或使用MySQL客户端
   mysqldump -h tidb.xxx.com -u user -p zesai_db > backup.sql
   ```

2. **数据清洗**
   - 检查是否有损坏数据
   - 处理编码问题
   - 验证外键完整性

#### Day 7：数据导入与验证

1. **导入PostgreSQL**
   ```bash
   # 使用psql导入
   psql $DATABASE_URL < backup.sql
   ```

2. **数据验证脚本**
   - 用户数量核对
   - 订单金额核对
   - 积分余额核对
   - 对话历史抽查

---

### Phase 4：切换上线（1天）

#### Day 8：灰度切换

1. **准备回滚方案**
   - 保持旧系统运行
   - 数据库双写（可选）
   - 准备DNS回滚

2. **域名切换**
   - 将 `www.zesiai.com` DNS指向Vercel
   - 等待DNS生效（5-30分钟）
   - 监控访问日志

3. **功能验证**
   - 用户注册/登录
   - Agent对话
   - 支付宝支付
   - 文档导出
   - 管理后台

4. **监控观察**
   - 观察2-4小时
   - 检查错误日志
   - 确认无重大问题后完成切换

---

## 四、风险与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 数据迁移丢失 | 低 | 高 | 完整备份，迁移后验证，保留回滚能力 |
| AI API不稳定 | 中 | 高 | 配置Claude+Gemini双通道自动切换 |
| 支付回调失败 | 低 | 高 | 提前测试支付宝新回调URL，准备手工补单 |
| 用户登录失效 | 中 | 中 | 提前通知用户，准备密码重置流程 |
| 网站访问变慢 | 中 | 中 | Vercel全球CDN，性能应优于原AWS配置 |

---

## 五、后续优化（上线后）

### 5.1 监控告警
- Sentry错误监控（已配置）
- Uptime监控（网站可用性）
- 业务指标监控（订单、对话量）

### 5.2 备份策略
- 数据库：每日自动备份，保留30天
- 代码：Git版本控制
- 配置：环境变量导出备份

### 5.3 文档整理
- 部署文档（本文档）
- 故障处理手册
- 新功能开发指南

---

## 六、立即开始的行动

### 今天就可以做（无需停服）

1. **申请Anthropic API Key**
   - https://console.anthropic.com
   - 注册，绑定信用卡，创建Key

2. **本地测试AI调用**
   - 我帮你修改代码，使用你的Key测试
   - 验证Agent功能是否正常

3. **导出TiDB数据**
   - 获取数据库备份，用于本地测试

### 需要准备的材料

- [ ] TiDB数据库连接信息（host, user, password）
- [ ] 支付宝商户配置（确认能否修改回调URL）
- [ ] 域名管理权限（修改DNS解析）
- [ ] Anthropic API Key

---

**下一步行动**：
准备好Anthropic API Key和TiDB数据库信息后，告诉我，我立即开始本地改造和测试。
