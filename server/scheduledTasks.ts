/**
 * 定时任务 - 处理佣金确认和其他定期操作
 */

import { confirmPendingCommissions } from "./referralDb";

/**
 * 佣金确认任务
 * 每天运行一次，确认7天前的pending佣金
 * 应该在服务启动时注册
 */
export function startCommissionConfirmationTask() {
  // 每天凌晨2点运行
  const schedule = "0 2 * * *"; // cron format

  // 立即运行一次
  runCommissionConfirmationTask();

  // 设置定时任务
  // 注意：这里使用简单的setInterval实现
  // 生产环境建议使用node-cron或其他专业定时任务库
  const dailyMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runCommissionConfirmationTask();
  }, dailyMs);

  console.log("[Scheduler] Commission confirmation task started");
}

/**
 * 运行佣金确认任务
 */
async function runCommissionConfirmationTask() {
  try {
    console.log("[Scheduler] Running commission confirmation task...");
    await confirmPendingCommissions();
    console.log("[Scheduler] Commission confirmation task completed");
  } catch (error) {
    console.error("[Scheduler] Error in commission confirmation task:", error);
  }
}

/**
 * 初始化系统配置
 * 在应用启动时调用，确保佣金比例等配置存在
 */
export async function initializeSystemConfig() {
  try {
    const { getSystemConfig, setSystemConfig } = await import("./referralDb");

    // 检查佣金比例配置
    const commissionRate = await getSystemConfig("commission_rate");
    if (!commissionRate) {
      await setSystemConfig(
        "commission_rate",
        "0.10",
        "推荐佣金比例（默认10%）"
      );
      console.log("[Config] Initialized commission_rate: 0.10");
    }
  } catch (error) {
    console.error("[Config] Error initializing system config:", error);
  }
}
