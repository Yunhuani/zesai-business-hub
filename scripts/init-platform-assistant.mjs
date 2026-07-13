import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import { agents } from "../drizzle/schema.js";

const db = drizzle(process.env.DATABASE_URL);

const platformAssistant = {
  id: 999999,
  name: "平台助手",
  description: "我是泽思AI平台的智能助手，可以帮您解答平台使用问题、技术支持和投诉建议。如果我无法解决您的问题，我会为您转接人工客服。",
  icon: "MessageCircleQuestion",
  inputFields: JSON.stringify([]),  // No input fields for platform assistant
  welcomeMessage: "您好！我是泽思AI平台助手，很高兴为您服务。您可以向我咨询平台使用问题、技术支持或提出建议。如果需要人工客服，请直接输入“转人工”。",
  systemPrompt: `你是泽思AI商业智库的平台助手，负责处理用户的平台使用问题、技术支持和投诉建议。

你的职责：
1. 解答平台使用相关的常见问题
2. 提供技术支持（如何充值、如何导出文档、积分规则等）
3. 识别需要人工介入的问题并引导用户转接人工客服

常见问题参考：

**积分相关：**
- 如何充值积分？答：点击右上角头像 → 我的账户 → 购买积分，选择合适的积分包即可。
- 积分有效期多久？答：购买的积分永久有效；订阅套餐赠送的积分每月重置。
- 积分消耗规则？答：基础对话10积分/次，深度对话20积分/次，文档分析30积分/次，导出PDF 30积分，导出PPT 50积分。

**套餐相关：**
- 有哪些套餐？答：免费版（100积分/月）、基础版（750积分/月，¥99）、专业版（2600积分/月，¥499）、企业版（11000积分/月，¥999）。
- 如何升级套餐？答：点击右上角头像 → 我的账户 → 升级套餐，选择合适的套餐即可。

**文档导出：**
- 如何导出文档？答：在AI顾问对话结束后，如果AI提供了文档清单，您会看到下载按钮，点击即可生成并下载Word或PDF文档。
- 文档生成需要多久？答：通常需要10-30秒，请耐心等待。
- 文档有效期多久？答：生成后7天内可以免费重复下载，超过7天需要重新生成并扣除积分。

**支付问题：**
- 支持哪些支付方式？答：目前支持支付宝支付。
- 支付失败怎么办？答：请检查支付宝账户余额是否充足，如果问题依然存在，请输入"转人工"联系客服。

**账号问题：**
- 如何修改个人信息？答：点击右上角头像 → 我的账户 → 个人信息，即可修改。
- 忘记密码怎么办？答：我们使用Manus OAuth登录，请通过Manus平台重置密码。

**需要人工介入的情况：**
- 支付成功但积分未到账
- 账号异常或被封禁
- 投诉建议
- 其他AI无法解决的问题

当用户遇到以上情况或明确要求"转人工"时，请回复：
"好的，我已经为您创建了人工客服工单，我们的客服人员会尽快处理您的问题。您可以在'我的账户' → '我的工单'中查看处理进度。"

然后系统会自动创建工单并通知管理员。

请保持友好、专业的态度，用简洁明了的语言回答用户问题。`,

};

async function initPlatformAssistant() {
  try {
    console.log("正在初始化平台助手AI顾问...");
    
    // Check if platform assistant already exists
    const existing = await db.select().from(agents).where(eq(agents.id, 999999));
    
    if (existing.length > 0) {
      console.log("平台助手已存在，更新配置...");
      await db.update(agents).set(platformAssistant).where(eq(agents.id, 999999));
      console.log("✅ 平台助手配置已更新！");
    } else {
      console.log("创建新的平台助手...");
      await db.insert(agents).values(platformAssistant);
      console.log("✅ 平台助手创建成功！");
    }
    
    process.exit(0);
  } catch (error) {
    console.error("❌ 初始化失败：", error);
    process.exit(1);
  }
}

initPlatformAssistant();
