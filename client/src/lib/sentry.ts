import * as Sentry from "@sentry/react";

/**
 * Sentry错误监控配置
 * 
 * 使用说明：
 * 1. 在 https://sentry.io 注册免费账号
 * 2. 创建React项目，获取DSN
 * 3. 在Manus管理UI的Secrets面板添加：
 *    - VITE_SENTRY_DSN: 你的Sentry DSN
 *    - VITE_SENTRY_ENVIRONMENT: production（或development）
 * 
 * 功能：
 * - 自动捕获所有未处理的错误
 * - 记录用户操作路径（面包屑）
 * - 记录用户信息（已登录用户）
 * - 性能监控（可选）
 */

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  const environment = import.meta.env.VITE_SENTRY_ENVIRONMENT || "development";

  // 如果没有配置DSN，跳过初始化
  if (!dsn) {
    console.warn("[Sentry] DSN not configured, error monitoring disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment,
    
    // 集成配置
    integrations: [
      // 浏览器追踪
      Sentry.browserTracingIntegration(),
      // 重放会话（可选，帮助重现bug）
      Sentry.replayIntegration({
        maskAllText: true, // 隐藏所有文本（保护隐私）
        blockAllMedia: true, // 隐藏所有媒体
      }),
    ],

    // 性能监控采样率（0-1之间）
    // 1.0 = 100%的事务都发送，0.1 = 10%
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,

    // 会话重放采样率
    replaysSessionSampleRate: 0.1, // 10%的正常会话
    replaysOnErrorSampleRate: 1.0, // 100%的错误会话

    // 忽略特定错误
    ignoreErrors: [
      // 浏览器扩展错误
      "top.GLOBALS",
      "chrome-extension://",
      "moz-extension://",
      // 网络错误（通常不是代码问题）
      "NetworkError",
      "Network request failed",
      // 用户取消操作
      "AbortError",
      "User cancelled",
    ],

    // 在发送前处理事件
    beforeSend(event, hint) {
      // 开发环境打印到控制台
      if (environment === "development") {
        console.error("[Sentry]", event, hint);
      }

      // 过滤敏感信息
      if (event.request?.headers) {
        delete event.request.headers.Authorization;
        delete event.request.headers.Cookie;
      }

      return event;
    },
  });

  console.log("[Sentry] Error monitoring initialized");
}

/**
 * 设置用户上下文（登录后调用）
 */
export function setSentryUser(user: { id: number; email?: string | null; name?: string | null }) {
  Sentry.setUser({
    id: user.id.toString(),
    email: user.email || undefined,
    username: user.name || undefined,
  });
}

/**
 * 清除用户上下文（退出登录后调用）
 */
export function clearSentryUser() {
  Sentry.setUser(null);
}

/**
 * 手动捕获错误
 */
export function captureError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, {
    extra: context,
  });
}

/**
 * 手动记录消息
 */
export function captureMessage(message: string, level: "info" | "warning" | "error" = "info") {
  Sentry.captureMessage(message, level);
}

/**
 * 添加面包屑（用户操作记录）
 */
export function addBreadcrumb(message: string, category: string, data?: Record<string, any>) {
  Sentry.addBreadcrumb({
    message,
    category,
    data,
    level: "info",
  });
}
