/**
 * 对话流程钩子 - 处理首次对话时的推荐人奖励
 */

import { getReferralByReferee, completeReferral, addCredits } from "./referralDb";

/**
 * 在用户首次发送消息时调用
 * 检查是否有推荐关系，如果有则发放推荐人奖励
 */
export async function handleFirstMessage(userId: number) {
  try {
    // 获取该用户的推荐关系
    const referral = await getReferralByReferee(userId);

    if (referral && referral.status === "pending") {
      // 发放推荐人奖励（200积分）
      await addCredits(referral.referrerId, 200, "推荐用户完成首次对话");

      // 更新推荐状态为已完成
      await completeReferral(referral.id);

      console.log(
        `[Referral] Completed referral: referrer=${referral.referrerId}, referee=${userId}`
      );
    }
  } catch (error) {
    console.error("[Referral] Error handling first message:", error);
    // 不中断消息流程
  }
}

/**
 * 在创建新对话时调用
 * 用于追踪用户是否已完成首次对话
 */
export async function handleNewConversation(userId: number) {
  // 可以在这里添加额外的逻辑
  // 例如：记录用户的首次对话时间
}
