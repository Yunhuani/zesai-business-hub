import "dotenv/config";
import { createConversation, createMessage, createOrder } from "./server/db.ts";

try {
  console.log("① 测试建对话...");
  const conv = await createConversation({ userId: 1, agentId: 1, title: "验证测试" });
  console.log("   成功,对话ID =", conv?.id);

  console.log("② 测试发消息...");
  const msg = await createMessage({ conversationId: conv.id, role: "user", content: "测试内容" });
  console.log("   成功,消息ID =", msg?.id);

  console.log("③ 测试建订单...");
  const order = await createOrder({
    userId: 1, outTradeNo: "TEST" + Date.now(),
    plan: "basic", amount: 1, paymentMethod: "alipay"
  });
  console.log("   成功,订单ID =", order?.id);

  console.log("\n✅ 三个写入功能全部正常,数据库修复验证通过。");
  process.exit(0);
} catch (e) {
  console.error("\n❌ 出错了:", e.message);
  console.error(e);
  process.exit(1);
}