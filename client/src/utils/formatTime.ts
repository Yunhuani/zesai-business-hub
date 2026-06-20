/**
 * 将UTC时间字符串转换为北京时间显示
 * 数据库存储的是UTC时间字符串，格式如 "2026-01-09 07:20:00"
 * 需要正确解析并转换为北京时间（+8小时）
 */
export function formatToBeijingTime(utcTimeString: string): string {
  // 将空格替换为T，并添加Z表示UTC时间
  // "2026-01-09 07:20:00" -> "2026-01-09T07:20:00Z"
  const isoString = utcTimeString.replace(' ', 'T') + 'Z';
  const utcDate = new Date(isoString);
  
  // 检查日期是否有效
  if (isNaN(utcDate.getTime())) {
    return utcTimeString; // 如果解析失败，返回原始字符串
  }
  
  return utcDate.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/**
 * 简短格式的北京时间（用于下拉菜单等）
 */
export function formatToBeijingTimeShort(utcTimeString: string): string {
  const isoString = utcTimeString.replace(' ', 'T') + 'Z';
  const utcDate = new Date(isoString);
  
  if (isNaN(utcDate.getTime())) {
    return utcTimeString;
  }
  
  return utcDate.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}
