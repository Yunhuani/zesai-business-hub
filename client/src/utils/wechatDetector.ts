/**
 * 检测是否在微信内置浏览器中
 */
export function isWeChatBrowser(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /micromessenger/.test(ua);
}

/**
 * 检测是否在移动设备上
 */
export function isMobileDevice(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(ua);
}

/**
 * 获取当前页面URL（用于复制）
 */
export function getCurrentUrl(): string {
  return window.location.href;
}
