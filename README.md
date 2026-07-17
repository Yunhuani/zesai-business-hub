# Zesai Business Hub

Zesai Business Hub（泽思 AI）是一个面向商业咨询场景的全栈 AI 平台。项目将 AI 顾问对话、企业诊断与报告、用户与会话管理、积分订阅、支付及后台运营能力整合在同一个 Node.js 应用中。

## 主要能力

- AI 顾问与匿名咨询对话，支持流式响应和多模型提供商。
- 企业诊断问卷、诊断任务、完整报告及 PDF 导出。
- 用户登录、OAuth、邮箱验证、密码重置和微信相关能力。
- 会话历史、积分扣减、订阅套餐、积分包和使用记录。
- 支付宝与微信支付集成，以及订单、用户、顾问和知识库管理。
- 健康检查、Sentry、告警和运营分析等可观测性能力。

## 技术栈

- 前端：React 19、Vite 7、TypeScript、Tailwind CSS、Radix UI、TanStack Query、wouter。
- 后端：Node.js、Express、tRPC、Drizzle ORM、Zod。
- 测试与构建：Vitest、TypeScript、esbuild、Prettier。
- 数据库：默认 Drizzle 配置使用 MySQL；仓库另有 PostgreSQL schema 与迁移配置。
- 外部集成：OpenAI 兼容模型接口、S3、邮件、短信、支付宝、微信支付和 Sentry。

## 项目结构

```text
client/     React 前端、页面、组件和静态资源
server/     Express/tRPC 服务、业务逻辑、集成和测试
shared/     前后端共享类型、常量和规则
drizzle/    数据库 schema、关系定义和迁移
scripts/    数据初始化、迁移和运维脚本
docs/       部署说明及其他项目文档
dist/       构建产物（由构建命令生成）
```

## 本地开发

### 前置条件

- Node.js 20 或更高版本。
- npm。
- 一个与所选 Drizzle 配置兼容的独立开发数据库。
- 可用的 LLM 提供商 API key；如需测试邮件、支付、短信等功能，还需配置对应服务。

### 安装与启动

```bash
npm install
```

复制环境变量模板：

```powershell
Copy-Item .env.example .env
```

macOS 或 Linux：

```bash
cp .env.example .env
```

至少配置以下变量：

```dotenv
DATABASE_URL=mysql://user:password@127.0.0.1:3306/zesai_business_hub
JWT_SECRET=replace-with-a-strong-random-secret
LLM_PROVIDER=openrouter
LLM_API_KEY=replace-with-provider-api-key
LLM_MODEL=deepseek/deepseek-chat
```

不要直接沿用示例凭据，也不要让本地开发连接生产数据库。完整变量说明以 [`.env.example`](.env.example) 为准。

初始化或更新默认 MySQL schema：

```bash
npm run db:push
```

启动开发服务：

```bash
npm run dev
```

服务默认从 `http://localhost:3000` 启动；如果端口被占用，开发服务会尝试后续可用端口。基础健康检查位于 `/health`，扩展检查位于 `/api/health`。

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 以开发模式监听并启动 Express 与 Vite |
| `npm run build` | 构建前端和服务端到 `dist/` |
| `npm start` | 启动 `dist/index.js` 生产构建 |
| `npm run check` | 执行 TypeScript 类型检查 |
| `npm test` | 运行 Vitest 测试套件 |
| `npm run format` | 使用 Prettier 格式化仓库文件 |
| `npm run db:push` | 生成并执行默认 Drizzle 迁移 |

在 Windows PowerShell 因执行策略无法运行 `npm.ps1` 时，可将命令中的 `npm` 替换为 `npm.cmd`。

## 环境配置

[`.env.example`](.env.example) 是环境变量名称和用途的权威模板，主要分为：

- 运行时与前端品牌：`NODE_ENV`、`PORT`、`VITE_APP_*`。
- 数据库：`DATABASE_URL`，以及需要时使用的 SSL 设置。
- 身份认证：`JWT_SECRET`、OAuth 和管理员身份配置。
- LLM：`LLM_PROVIDER`、`LLM_API_KEY`、`LLM_MODEL`、`LLM_BASE_URL`。
- 可选集成：NBG 诊断引擎、邮件、支付宝、微信、阿里云短信和对象存储。
- 可观测性：Sentry、运营告警和分析配置。

只有启用对应功能时才需要填写可选集成。任何真实密钥都只能保存在本地或部署平台的安全变量中。

## 数据库说明

默认 [`drizzle.config.ts`](drizzle.config.ts) 使用 `drizzle/schema.ts` 和 MySQL dialect。PostgreSQL 迁移使用 [`drizzle.config.postgres.ts`](drizzle.config.postgres.ts)、`drizzle/schema-postgres.ts` 与 `drizzle/migrations/`；执行相关命令时应显式指定配置文件。

修改 schema 时应提交生成的迁移文件，并先在隔离数据库中验证。不要在未确认目标连接字符串时运行迁移或数据修复脚本。

## 构建与部署

生产构建：

```bash
npm run build
npm start
```

仓库提供 [`Dockerfile`](Dockerfile) 和 [`docker-compose.yml`](docker-compose.yml)。当前容器方案由 Express 同时提供 API 和 `dist/public` 中的前端静态文件，详见 [`docs/dockerization-step1.md`](docs/dockerization-step1.md)。

## 质量检查

提交修改前，根据改动范围运行：

```bash
npm run check
npm test
npm run build
```

部分集成测试依赖微信、Sentry、短信等环境变量。缺少外部配置时，应区分环境导致的失败与代码回归，不要将真实凭据写入测试或仓库。

## 安全提示

- 不要提交 `.env`、API key、私钥、访问令牌或生产数据库连接信息。
- 支付、认证、积分和数据库迁移属于高风险区域，应进行针对性测试和人工复核。
- 数据修复脚本必须先确认目标环境、影响范围和恢复方案。
- 本地开发和测试使用隔离数据，避免连接生产资源。

## License

[MIT](package.json)
