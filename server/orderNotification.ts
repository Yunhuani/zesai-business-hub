import { sendEmail } from "./_core/email";

/**
 * 订单信息接口
 */
export interface OrderInfo {
  orderNo: string;
  userName: string;
  userEmail: string;
  productName: string;
  amount: number;
  paymentMethod: "alipay" | "wechat";
  paidAt: Date;
}

/**
 * 发送订单通知邮件给管理员
 */
export async function notifyAdminNewOrder(orderInfo: OrderInfo): Promise<void> {
  const adminEmail = "cs@zesiai.com";

  // 格式化金额
  const formattedAmount = (orderInfo.amount / 100).toFixed(2);

  // 格式化时间（北京时间）
  const paidAtBJ = new Date(orderInfo.paidAt.getTime() + 8 * 60 * 60 * 1000);
  const formattedTime = paidAtBJ.toISOString().replace("T", " ").substring(0, 19);

  // 支付方式中文
  const paymentMethodText = orderInfo.paymentMethod === "alipay" ? "支付宝" : "微信支付";

  // 构建HTML邮件内容
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 10px 10px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      background: #f9fafb;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .order-info {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .info-row {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .info-label {
      font-weight: 600;
      color: #6b7280;
      width: 120px;
      flex-shrink: 0;
    }
    .info-value {
      color: #111827;
      flex: 1;
    }
    .amount {
      font-size: 28px;
      font-weight: bold;
      color: #10b981;
      text-align: center;
      margin: 20px 0;
    }
    .footer {
      background: #f9fafb;
      padding: 20px;
      border: 1px solid #e5e7eb;
      border-top: none;
      border-radius: 0 0 10px 10px;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
    .highlight {
      color: #667eea;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🎉 新订单通知</h1>
  </div>
  
  <div class="content">
    <div class="order-info">
      <div class="info-row">
        <div class="info-label">订单号：</div>
        <div class="info-value">${orderInfo.orderNo}</div>
      </div>
      <div class="info-row">
        <div class="info-label">用户姓名：</div>
        <div class="info-value">${orderInfo.userName || "未提供"}</div>
      </div>
      <div class="info-row">
        <div class="info-label">用户邮箱：</div>
        <div class="info-value">${orderInfo.userEmail}</div>
      </div>
      <div class="info-row">
        <div class="info-label">购买商品：</div>
        <div class="info-value"><span class="highlight">${orderInfo.productName}</span></div>
      </div>
      <div class="info-row">
        <div class="info-label">支付方式：</div>
        <div class="info-value">${paymentMethodText}</div>
      </div>
      <div class="info-row">
        <div class="info-label">支付时间：</div>
        <div class="info-value">${formattedTime} (北京时间)</div>
      </div>
    </div>

    <div class="amount">
      ¥ ${formattedAmount}
    </div>

    <p style="text-align: center; color: #6b7280; margin-top: 20px;">
      请登录管理后台查看详细订单信息
    </p>
  </div>

  <div class="footer">
    <p>泽思 Zenith AI - 专业AI商业咨询平台</p>
    <p style="margin-top: 10px;">
      <a href="https://www.zesiai.com/admin/orders" style="color: #667eea; text-decoration: none;">
        查看订单管理后台 →
      </a>
    </p>
  </div>
</body>
</html>
  `;

  try {
    await sendEmail({
      to: adminEmail,
      subject: `【新订单】${orderInfo.userName || orderInfo.userEmail} 购买了 ${orderInfo.productName}`,
      html: htmlContent,
    });
    console.log(`[OrderNotification] 订单通知邮件已发送: ${orderInfo.orderNo}`);
  } catch (error) {
    console.error(`[OrderNotification] 发送订单通知邮件失败:`, error);
    // 不抛出错误，避免影响支付流程
  }
}
