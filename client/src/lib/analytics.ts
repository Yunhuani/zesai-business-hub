/**
 * Analytics Event Tracking Utility
 * 
 * 集成Umami Analytics进行用户行为追踪
 * 文档: https://umami.is/docs/tracker-functions
 */

// 检查Umami是否已加载
const isUmamiLoaded = () => {
  return typeof window !== 'undefined' && 'umami' in window;
};

/**
 * 追踪自定义事件
 * @param eventName 事件名称
 * @param eventData 事件数据（可选）
 */
export const trackEvent = (eventName: string, eventData?: Record<string, string | number>) => {
  if (!isUmamiLoaded()) {
    console.warn('[Analytics] Umami not loaded, skipping event:', eventName);
    return;
  }

  try {
    // @ts-ignore - umami is loaded dynamically
    window.umami.track(eventName, eventData);
    console.log('[Analytics] Event tracked:', eventName, eventData);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', eventName, error);
  }
};

/**
 * 付费转化漏斗事件
 */
export const ConversionEvents = {
  // 首页访问
  HOME_VISIT: 'home_visit',
  
  // 用户注册
  REGISTER_START: 'register_start',
  REGISTER_SUCCESS: 'register_success',
  REGISTER_FAIL: 'register_fail',
  
  // 用户登录
  LOGIN_START: 'login_start',
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAIL: 'login_fail',
  
  // 首次对话
  FIRST_CONVERSATION: 'first_conversation',
  
  // 查看套餐
  VIEW_PRICING: 'view_pricing',
  
  // 发起支付
  PAYMENT_START: 'payment_start',
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAIL: 'payment_fail',
};

/**
 * 顾问使用热度事件
 */
export const AgentEvents = {
  // 点击顾问卡片
  AGENT_CLICK: 'agent_click',
  
  // 进入顾问对话页面
  AGENT_CONVERSATION_START: 'agent_conversation_start',
  
  // 发送消息
  AGENT_MESSAGE_SEND: 'agent_message_send',
  
  // 对话结束
  AGENT_CONVERSATION_END: 'agent_conversation_end',
};

/**
 * 积分消耗事件
 */
export const CreditsEvents = {
  // 查看积分详情
  CREDITS_VIEW: 'credits_view',
  
  // 积分消耗
  CREDITS_DEDUCT: 'credits_deduct',
  
  // 积分不足提示
  CREDITS_INSUFFICIENT: 'credits_insufficient',
  
  // 积分充值
  CREDITS_RECHARGE: 'credits_recharge',
};

/**
 * 追踪转化漏斗事件
 */
export const trackConversion = (event: string, data?: Record<string, string | number>) => {
  trackEvent(event, data);
};

/**
 * 追踪顾问使用事件
 */
export const trackAgent = (event: string, agentId: number, agentName: string, data?: Record<string, string | number>) => {
  trackEvent(event, {
    agent_id: agentId,
    agent_name: agentName,
    ...data,
  });
};

/**
 * 追踪积分事件
 */
export const trackCredits = (event: string, credits: number, data?: Record<string, string | number>) => {
  trackEvent(event, {
    credits,
    ...data,
  });
};
