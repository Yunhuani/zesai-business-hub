# Sentry错误监控配置指南

## 为什么需要Sentry？

Sentry是一个实时错误监控平台，可以帮助你：
- **实时发现问题**：客户遇到错误时立即收到邮件通知
- **快速定位bug**：完整的错误堆栈、用户操作路径、环境信息
- **避免重复投诉**：主动发现问题，而不是等客户投诉
- **提升用户体验**：快速修复问题，减少客户流失

## 配置步骤（10分钟）

### 步骤1：注册Sentry账号

1. 访问 https://sentry.io
2. 点击"Start Free"注册免费账号
3. 选择"React"作为前端项目类型
4. 选择"Node.js"作为后端项目类型

### 步骤2：创建项目并获取DSN

#### 前端项目（React）
1. 在Sentry控制台创建新项目
2. 选择平台：**React**
3. 项目名称：`zesai-frontend`
4. 复制DSN（类似：`https://xxxxx@o123456.ingest.sentry.io/7654321`）

#### 后端项目（Node.js）
1. 在Sentry控制台创建另一个项目
2. 选择平台：**Node.js**
3. 项目名称：`zesai-backend`
4. 复制DSN

### 步骤3：配置环境变量

在Manus管理UI的**Settings → Secrets**面板添加以下环境变量：

#### 前端环境变量
```
VITE_SENTRY_DSN=你的前端DSN
VITE_SENTRY_ENVIRONMENT=production
```

#### 后端环境变量
```
SENTRY_DSN=你的后端DSN
SENTRY_ENVIRONMENT=production
```

### 步骤4：重启服务器

1. 保存checkpoint
2. 发布到生产环境
3. 或在开发环境运行 `pnpm dev`

### 步骤5：验证配置

#### 测试前端错误监控
1. 在浏览器控制台执行：
```javascript
throw new Error("Test Sentry Frontend");
```
2. 检查Sentry控制台是否收到错误

#### 测试后端错误监控
1. 访问一个不存在的API端点
2. 检查Sentry控制台是否收到错误

## 使用说明

### 自动错误捕获

Sentry已经配置为自动捕获：
- 所有未处理的JavaScript错误
- 所有未处理的Promise rejection
- 所有后端异常
- React组件错误

**你不需要做任何事情，错误会自动上报！**

### 手动捕获错误

如果需要手动捕获特定错误：

#### 前端
```typescript
import { captureError, captureMessage } from "@/lib/sentry";

try {
  // 你的代码
} catch (error) {
  captureError(error as Error, {
    context: "支付流程",
    userId: user.id,
  });
}

// 记录重要信息
captureMessage("用户完成支付", "info");
```

#### 后端
```typescript
import { captureError, captureMessage } from "./server/_core/sentry";

try {
  // 你的代码
} catch (error) {
  captureError(error as Error, {
    context: "订单处理",
    orderId: order.id,
  });
}
```

### 设置用户上下文

当用户登录后，设置用户信息可以帮助你知道是哪个用户遇到了问题：

#### 前端（在useAuth中）
```typescript
import { setSentryUser, clearSentryUser } from "@/lib/sentry";

// 登录后
if (user) {
  setSentryUser({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}

// 退出登录后
clearSentryUser();
```

#### 后端（在context.ts中）
```typescript
import { setSentryUser } from "./sentry";

if (user) {
  setSentryUser({
    id: user.id,
    email: user.email,
    name: user.name,
  });
}
```

## Sentry控制台使用

### 查看错误

1. 登录 https://sentry.io
2. 选择项目（zesai-frontend 或 zesai-backend）
3. 查看"Issues"列表

### 错误详情包含

- **错误堆栈**：完整的代码调用链
- **用户信息**：谁遇到了这个错误
- **设备信息**：浏览器、操作系统、屏幕分辨率
- **面包屑**：用户操作路径（点击了什么按钮）
- **环境信息**：生产环境还是开发环境

### 邮件通知

Sentry会在以下情况发送邮件：
- 新错误首次出现
- 已修复的错误再次出现
- 错误频率突然增加

你可以在Sentry控制台的**Settings → Alerts**配置通知规则。

## 常见问题

### Q: Sentry会影响网站性能吗？
A: 不会。Sentry采用异步上报，对性能影响可忽略不计（< 1ms）。

### Q: Sentry会泄露用户隐私吗？
A: 不会。我们已经配置了：
- 隐藏所有密码、token等敏感字段
- 会话重放时遮盖所有文本内容
- 不记录Cookie和Authorization header

### Q: 免费版有什么限制？
A: 免费版每月可以记录5000个错误事件，对于中小型项目完全够用。

### Q: 如何关闭Sentry？
A: 删除环境变量 `VITE_SENTRY_DSN` 和 `SENTRY_DSN` 即可。

### Q: 开发环境也会上报错误吗？
A: 会，但会标记为"development"环境，方便区分。你可以在Sentry控制台过滤环境。

## 最佳实践

### 1. 定期查看错误报告
- 每天早上查看一次Sentry控制台
- 优先修复影响用户最多的错误

### 2. 标记已修复的错误
- 修复bug后，在Sentry中标记为"Resolved"
- 如果错误再次出现，会收到通知

### 3. 设置告警规则
- 关键页面错误立即通知
- 错误频率超过阈值时通知

### 4. 添加上下文信息
- 在关键操作中添加面包屑
- 捕获错误时附带业务上下文

### 5. 定期清理旧错误
- 归档已解决的错误
- 忽略无法修复的第三方错误

## 示例：完整的错误处理流程

```typescript
// 前端：支付流程
import { captureError, addBreadcrumb } from "@/lib/sentry";

async function handlePayment(planId: string) {
  try {
    addBreadcrumb("开始支付流程", "payment", { planId });
    
    const order = await trpc.payment.createOrder.mutate({ planId });
    
    addBreadcrumb("订单创建成功", "payment", { orderId: order.orderId });
    
    window.location.href = order.paymentUrl;
  } catch (error) {
    captureError(error as Error, {
      context: "支付流程",
      planId,
      userId: user?.id,
    });
    
    toast.error("支付失败，请稍后重试");
  }
}
```

## 总结

配置Sentry只需要10分钟，但可以：
- 节省数小时的bug排查时间
- 避免客户投诉后才发现问题
- 提升整体产品质量

**强烈建议立即配置！**
