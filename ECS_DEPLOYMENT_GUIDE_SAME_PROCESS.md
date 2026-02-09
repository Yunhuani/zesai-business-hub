# ECS部署指南 - 与Manus相同的架构（前后端同一Express进程）

## 问题根源

您当前的ECS部署使用Nginx反向代理分离前后端，导致Cookie传递问题：
- 前端是静态文件，后端是独立Node进程
- Nginx代理导致Cookie跨域问题
- 代码完全相同，但环境不同

## 解决方案：采用Manus的架构

**核心思想：** 前端和后端在同一个Express进程中运行，就像Manus平台一样。

### 架构对比

| 方面 | 当前ECS | Manus平台 | 改进后ECS |
|------|--------|---------|---------|
| 前端 | 静态文件 | Vite中间件 | Vite中间件 |
| 后端 | Node进程 | Express服务器 | Express服务器 |
| 反向代理 | Nginx | Manus平台层 | **无需Nginx** |
| 端口 | 3000 (后端) | 3000 | 3000 |
| 域名 | ai.zesiai.com | zesiai.com | ai.zesiai.com |
| Cookie | ❌ 跨域问题 | ✓ 同进程 | ✓ 同进程 |

---

## 部署步骤

### 第1步：编译前端

```bash
cd /home/ubuntu/zesai-business-hub
npm run build
```

这会生成 `dist/public` 文件夹，包含编译后的前端资源。

### 第2步：配置环境变量

创建或更新 `.env.production` 文件：

```bash
# 应用配置
NODE_ENV=production
PORT=3000

# 数据库
DATABASE_URL="mysql://user:password@host:port/database"

# JWT
JWT_SECRET=your_jwt_secret_here

# OAuth
OAUTH_SERVER_URL=https://api.manus.im

# 其他必要的环境变量
# ... (从Manus平台复制所有env变量)
```

### 第3步：使用PM2启动应用

#### 安装PM2（如果未安装）

```bash
npm install -g pm2
```

#### 创建PM2配置文件

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [
    {
      name: 'zesai-business-hub',
      script: './dist/server/_core/index.js',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      error_file: '/var/log/pm2/zesai-error.log',
      out_file: '/var/log/pm2/zesai-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
    },
  ],
};
```

#### 启动应用

```bash
# 使用PM2启动
pm2 start ecosystem.config.js

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs zesai-business-hub
```

### 第4步：配置Nginx（仅用于HTTPS转发，不代理业务逻辑）

由于Express应用已经在3000端口上同时提供前后端服务，Nginx只需要：
1. 处理HTTPS
2. 转发所有流量到3000端口

创建 `/etc/nginx/sites-available/ai.zesiai.com`：

```nginx
# HTTP Server: Redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name ai.zesiai.com;
    return 301 https://$host$request_uri;
}

# HTTPS Server: Simple passthrough to Express
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name ai.zesiai.com;

    # SSL配置
    ssl_certificate /etc/ssl/private/ai.zesiai.com.pem;
    ssl_certificate_key /etc/ssl/private/ai.zesiai.com.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # 安全头
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;

    # 所有流量转发到Express应用
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket支持（如果需要）
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # 超时配置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # 日志
    access_log /var/log/nginx/ai.zesiai-access.log;
    error_log /var/log/nginx/ai.zesiai-error.log;
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/ai.zesiai.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 第5步：验证部署

```bash
# 检查应用是否运行
pm2 status

# 检查端口是否监听
netstat -tlnp | grep 3000

# 测试HTTPS连接
curl -I https://ai.zesiai.com/

# 测试登录API
curl -X POST https://ai.zesiai.com/api/trpc/phoneAuth.sendCode \
  -H "Content-Type: application/json" \
  -d '{"phone":"13800138000","type":"login"}'
```

---

## 关键区别说明

### 为什么这样做能解决Cookie问题？

1. **同一进程** - 前端和后端在同一个Express进程中
2. **同一端口** - 所有请求都通过3000端口
3. **同一域名** - 浏览器认为所有请求来自同一源
4. **自动Cookie传递** - Express自动处理Cookie，无需Nginx配置

### 代码无需修改

- 前端代码保持不变（使用`credentials: "include"`）
- 后端代码保持不变（使用Authorization header）
- 两种认证方式都能工作

### 性能考虑

- **集群模式** - PM2使用`exec_mode: 'cluster'`充分利用多核CPU
- **内存管理** - 自动重启超过1GB内存的进程
- **日志管理** - 统一的日志输出

---

## 故障排查

### 问题1：应用启动失败

```bash
# 查看详细日志
pm2 logs zesai-business-hub --lines 100

# 检查环境变量
pm2 env zesai-business-hub
```

### 问题2：仍然看到Cookie错误

```bash
# 确认应用确实在运行
curl http://127.0.0.1:3000/

# 检查是否还有旧的Nginx配置干扰
sudo nginx -T | grep ai.zesiai

# 清除浏览器缓存和Cookie后重试
```

### 问题3：HTTPS证书问题

```bash
# 验证证书
openssl x509 -in /etc/ssl/private/ai.zesiai.com.pem -text -noout

# 更新证书（使用certbot）
sudo certbot renew --force-renewal
```

---

## 部署检查清单

- [ ] 运行 `npm run build` 生成dist文件夹
- [ ] 配置所有必要的环境变量
- [ ] 安装PM2
- [ ] 创建ecosystem.config.js
- [ ] 使用PM2启动应用
- [ ] 配置Nginx（仅HTTPS转发）
- [ ] 测试HTTPS连接
- [ ] 测试登录功能
- [ ] 验证Cookie正确传递
- [ ] 设置PM2开机自启

---

## 与Manus平台的完全一致性

这个部署方式与Manus平台完全相同：

✓ 前端和后端在同一Express进程  
✓ 使用相同的代码库  
✓ 无需修改任何代码  
✓ Cookie自动传递  
✓ 支持所有认证方式  

