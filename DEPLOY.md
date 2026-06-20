# 泽思AI 部署指南

## 架构
- **前端**: Vercel (静态托管 + CDN)
- **后端**: Railway (Node.js + Express API)
- **数据库**: Neon (PostgreSQL)

---

## 第一步：部署后端到 Railway

### 1. 注册 Railway
访问 https://railway.app，用 GitHub 账号登录

### 2. 创建项目
1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择 `zesai-business-hub` 仓库
4. Railway 会自动检测到 `railway.toml` 配置

### 3. 配置环境变量
在 Railway 项目 → Variables 中添加：

```
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
LLM_PROVIDER=openrouter
LLM_API_KEY=your-openrouter-api-key
LLM_MODEL=deepseek/deepseek-chat
JWT_SECRET=your-jwt-secret
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://zesiai.com
```

### 4. 部署
点击 "Deploy"，等待部署完成

部署成功后，会获得域名如：`https://zesai-api.up.railway.app`

---

## 第二步：部署前端到 Vercel

### 1. 注册 Vercel
访问 https://vercel.com，用 GitHub 账号登录

### 2. 导入项目
1. 点击 "Add New Project"
2. 导入 `zesai-business-hub` 仓库
3. Framework Preset 选择 "Vite"

### 3. 配置环境变量
在 Vercel 项目 → Settings → Environment Variables 添加：

```
VITE_API_URL=https://zesai-api.up.railway.app
```

(将 URL 替换为 Railway 实际分配的域名)

### 4. 部署
点击 "Deploy"

---

## 第三步：更新后端 CORS

在 Railway 中，将 FRONTEND_URL 更新为 Vercel 实际分配的域名（或你的自定义域名）

---

## 第四步：配置域名（可选）

### 自定义域名
1. 在 Vercel 项目 → Settings → Domains 中添加 `zesiai.com`
2. 在 DNS 服务商添加 CNAME 记录：
   - 主机记录：`@` 或 `www`
   - 记录值：Vercel 提供的域名
3. 在 Railway 中将 FRONTEND_URL 更新为 `https://zesiai.com`

---

## 故障排查

### 数据库连接失败
- 检查 DATABASE_URL 是否正确
- Neon 控制台 → Settings → Connection String 确认

### API 调用失败
- 检查 CORS 设置
- Railway 日志查看错误信息

### AI 调用失败
- 检查 OpenRouter API Key 是否有效
- 查看 Railway 日志

---

## 已完成配置清单

- [x] AI调用层改造（支持多厂商）
- [x] 数据库迁移到 PostgreSQL
- [x] 环境变量配置
- [x] Railway 部署配置
- [x] Vercel 部署配置
- [x] 健康检查端点

---

## 下一步

1. 注册 Railway 并部署后端
2. 注册 Vercel 并部署前端
3. 配置域名（如需）
4. 测试网站功能
