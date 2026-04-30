import { AlipaySdk } from 'alipay-sdk';
import { ENV } from './env';

let _alipaySdk: AlipaySdk | null = null;

function getAlipaySdk(): AlipaySdk {
  if (_alipaySdk) return _alipaySdk;
  if (!ENV.alipayAppId || !ENV.alipayPrivateKey) {
    throw new Error('支付宝未配置：请在环境变量中设置 ALIPAY_APP_ID 和 ALIPAY_PRIVATE_KEY');
  }
  _alipaySdk = new AlipaySdk({
    appId: ENV.alipayAppId,
    privateKey: ENV.alipayPrivateKey,
    alipayPublicKey: ENV.alipayPublicKey,
    gateway: ENV.alipayGateway || 'https://openapi.alipay.com/gateway.do',
    charset: 'utf-8',
    signType: 'RSA2',
  });
  return _alipaySdk;
}

/**
 * 创建支付宝电脑网站支付订单
 * @param params 支付参数
 * @returns 支付页面 HTML
 */
export async function createAlipayPagePayment(params: {
  outTradeNo: string; // 商户订单号
  totalAmount: string; // 订单金额(元)
  subject: string; // 订单标题
  body?: string; // 订单描述
  returnUrl?: string; // 同步回调地址
  notifyUrl?: string; // 异步回调地址
}) {
  try {
    const result = await getAlipaySdk().pageExec('alipay.trade.page.pay', {
      bizContent: {
        out_trade_no: params.outTradeNo,
        total_amount: params.totalAmount,
        subject: params.subject,
        body: params.body,
        product_code: 'FAST_INSTANT_TRADE_PAY',
      },
      returnUrl: params.returnUrl,
      notifyUrl: params.notifyUrl,
    });
    return result;
  } catch (error) {
    console.error('[Alipay] Create page payment error:', error);
    throw error;
  }
}

/**
 * 创建支付宝扫码支付订单
 * @param params 支付参数
 * @returns 二维码链接
 */
export async function createAlipayQrCodePayment(params: {
  outTradeNo: string; // 商户订单号
  totalAmount: string; // 订单金额(元)
  subject: string; // 订单标题
  body?: string; // 订单描述
  notifyUrl?: string; // 异步回调地址
}) {
  try {
    const result = await getAlipaySdk().exec('alipay.trade.precreate', {
      bizContent: {
        out_trade_no: params.outTradeNo,
        total_amount: params.totalAmount,
        subject: params.subject,
        body: params.body,
      },
      notifyUrl: params.notifyUrl,
    });
    
    console.log('[Alipay] API response:', JSON.stringify(result, null, 2));
    
    if (result.code === '10000' && result.qrCode) {
      return result.qrCode;
    }
    
    const errorMsg = `创建支付订单失败: ${result.subMsg || result.msg || '未知错误'} (code: ${result.code || 'N/A'})`;
    console.error('[Alipay] API error:', errorMsg);
    throw new Error(errorMsg);
  } catch (error) {
    console.error('[Alipay] Create QR code payment error:', error);
    if (error instanceof Error) {
      console.error('[Alipay] Error message:', error.message);
      console.error('[Alipay] Error stack:', error.stack);
    }
    throw error;
  }
}

/**
 * 验证支付宝回调签名
 * @param params 回调参数
 * @returns 是否验证通过
 */
export function verifyAlipayCallback(params: Record<string, any>): boolean {
  try {
    // 打印关键调试信息（不含完整sign以保护安全）
    console.log('[Alipay] Verify params keys:', Object.keys(params));
    console.log('[Alipay] sign_type:', params.sign_type);
    console.log('[Alipay] sign length:', params.sign?.length);
    const sdk = getAlipaySdk();
    console.log('[Alipay] alipayPublicKey configured:', !!sdk['config']?.alipayPublicKey);
    console.log('[Alipay] alipayPublicKey prefix:', sdk['config']?.alipayPublicKey?.substring(0, 30));

    const result = sdk.checkNotifySign(params);
    console.log('[Alipay] checkNotifySign result:', result);
    return result;
  } catch (error) {
    console.error('[Alipay] Verify callback error:', error);
    return false;
  }
}

/**
 * 查询支付订单状态
 * @param outTradeNo 商户订单号
 * @returns 订单信息
 */
export async function queryAlipayOrder(outTradeNo: string) {
  try {
    const result = await getAlipaySdk().exec('alipay.trade.query', {
      bizContent: {
        out_trade_no: outTradeNo,
      },
    });
    
    if (result.code === '10000') {
      return {
        tradeNo: result.tradeNo,
        outTradeNo: result.outTradeNo,
        tradeStatus: result.tradeStatus,
        totalAmount: result.totalAmount,
        buyerPayAmount: result.buyerPayAmount,
      };
    }
    
    throw new Error(`查询订单失败: ${result.subMsg || result.msg}`);
  } catch (error) {
    console.error('[Alipay] Query order error:', error);
    throw error;
  }
}
