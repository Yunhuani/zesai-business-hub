/**
 * 告警管理模块
 * 防抖逻辑：同一类告警 10 分钟内只发一次
 */

import { sendServerChan } from "./serverchan";

const DEBOUNCE_MS = 10 * 60 * 1000; // 10 分钟

const lastAlertTime = new Map<string, number>();

export interface Alert {
  category: string; // 如 "db", "llm", "deploy"
  title: string;
  description?: string;
}

export async function fireAlert(alert: Alert): Promise<boolean> {
  const now = Date.now();
  const lastTime = lastAlertTime.get(alert.category) ?? 0;

  if (now - lastTime < DEBOUNCE_MS) {
    console.log(`[AlertManager] Debounced alert: ${alert.category}`);
    return false;
  }

  lastAlertTime.set(alert.category, now);

  const desp = alert.description
    ? `**类别**: ${alert.category}\n\n**详情**:\n${alert.description}\n\n**时间**: ${new Date().toISOString()}`
    : `**类别**: ${alert.category}\n\n**时间**: ${new Date().toISOString()}`;

  return sendServerChan({
    title: alert.title,
    desp,
  });
}

/** 仅用于测试：重置防抖状态 */
export function resetAlertDebounce(category?: string) {
  if (category) {
    lastAlertTime.delete(category);
  } else {
    lastAlertTime.clear();
  }
}
