import * as Sentry from "@sentry/node";
import { ENV } from "./env";

/**
 * 后端Sentry错误监控配置
 * 
 * 使用说明：
 * 1. 在 https://sentry.io 注册免费账号
 * 2. 创建Node.js项目，获取DSN
 * 3. 在Manus管理UI的Secrets面板添加：
 *    - SENTRY_DSN: 你的Sentry DSN（后端）
 *    - SENTRY_ENVIRONMENT: production（或development）
 * 
 * 功能：
 * - 自动捕获所有未处理的异常
 * - 记录请求上下文
 * - 性能监控
 */

export function initSentry() {
  const dsn = process.env.SENTRY_DSN;
  const environment = process.env.SENTRY_ENVIRONMENT || "development";

  // 如果没有配置DSN，跳过初始化
  if (!dsn) {
    console.warn("[Sentry] DSN not configured, error monitoring disabled");
    return;
  }

  Sentry.init({
    dsn,
    environment,

    // 性能监控采样率
    tracesSampleRate: environment === "production" ? 0.1 : 1.0,

    // 忽略特定错误
    ignoreErrors: [
      "ECONNREFUSED",
      "ENOTFOUND",
      "ETIMEDOUT",
    ],

    // 在发送前处理事件
    beforeSend(event, hint) {
      // 开发环境打印到控制台
      if (environment === "development") {
        console.error("[Sentry]", event, hint);
      }

      // 过滤敏感信息
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }

      if (event.request?.data) {
        // 移除可能包含敏感信息的字段
        const sensitiveFields = ["password", "token", "secret", "apiKey"];
        sensitiveFields.forEach(field => {
          if (event.request?.data && typeof event.request.data === "object") {
            delete (event.request.data as any)[field];
          }
        });
      }

      return event;
    },
  });

  console.log("[Sentry] Error monitoring initialized");
}

/**
 * 设置用户上下文
 */
export function setSentryUser(user: { id: number; email?: string | null; name?: string | null }) {
  Sentry.setUser({
    id: user.id.toString(),
    email: user.email || undefined,
    username: user.name || undefined,
  });
}

/**
 * 清除用户上下文
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

// Express中间件已内置在Sentry.init中，无需手动添加
