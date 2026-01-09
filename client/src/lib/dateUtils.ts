/**
 * 统一的时间格式化工具
 * 全站使用北京时间 (Asia/Shanghai, UTC+8)
 */

const TIMEZONE = 'Asia/Shanghai';

/**
 * 格式化日期时间（完整格式）
 * 输出: 2026/01/09 14:30
 */
export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化日期（仅日期）
 * 输出: 2026/01/09
 */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

/**
 * 格式化短日期
 * 输出: 01/09 14:30
 */
export function formatShortDateTime(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleString('zh-CN', {
    timeZone: TIMEZONE,
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化月日
 * 输出: 1月9日
 */
export function formatMonthDay(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    timeZone: TIMEZONE,
    month: 'long',
    day: 'numeric',
  });
}

/**
 * 格式化简短月日
 * 输出: 1/9
 */
export function formatShortMonthDay(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    timeZone: TIMEZONE,
    month: 'numeric',
    day: 'numeric',
  });
}
