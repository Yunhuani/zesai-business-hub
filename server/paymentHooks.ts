/**
 * 支付流程钩子 - 处理订单支付后的佣金创建
 */

import { getReferralByReferee, createCommission, getCommissionRate } from "./referralDb";

/**
 * 在订单支付成功时调用
 * 检查购买用户是否被推荐，如果是则创建佣金记录
 */
export async function handleOrderPaid(
  userId: number,
  orderId: string,
  orderAmount: number // 金额，单位：元
) {
  try {
    // 获取该用户的推荐关系
    const referral = await getReferralByReferee(userId);

    if (referral && referral.status === "completed") {
      // 获取佣金比例
      const commissionRate = await getCommissionRate();

      // 计算佣金金额
      const commissionAmount = orderAmount * commissionRate;

      // 创建佣金记录
      await createCommission({
        referrerId: referral.referrerId,
        refereeId: userId,
        orderId,
        orderAmount,
        commissionAmount,
        commissionRate,
      });

      console.log(
        `[Commission] Created: referrer=${referral.referrerId}, referee=${userId}, order=${orderId}, amount=${commissionAmount}`
      );
    }
  } catch (error) {
    console.error("[Commission] Error handling order paid:", error);
    // 不中断支付流程
  }
}

/**
 * 在订单退款时调用
 * 取消相关的佣金记录
 */
export async function handleOrderRefunded(orderId: string) {
  try {
    const { cancelCommission } = await import("./referralDb");
    await cancelCommission(orderId);

    console.log(`[Commission] Cancelled: order=${orderId}`);
  } catch (error) {
    console.error("[Commission] Error handling order refunded:", error);
    // 不中断退款流程
  }
}
