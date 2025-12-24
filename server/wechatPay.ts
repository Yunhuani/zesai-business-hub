import Wechatpay from 'wechatpay-node-v3';
import { ENV } from './_core/env';

// 微信支付配置
const WECHAT_PAY_MCHID = process.env.WECHAT_PAY_MCHID || '';
const WECHAT_PAY_API_V3_KEY = process.env.WECHAT_PAY_API_V3_KEY || '';
const WECHAT_APP_ID = process.env.WECHAT_APP_ID || '';

if (!WECHAT_PAY_MCHID || !WECHAT_PAY_API_V3_KEY) {
  console.warn('[WechatPay] Missing required environment variables');
}

// 初始化微信支付实例
let wechatPayInstance: Wechatpay | null = null;

function getWechatPayInstance(): Wechatpay {
  if (!wechatPayInstance && WECHAT_PAY_MCHID && WECHAT_PAY_API_V3_KEY) {
    wechatPayInstance = new Wechatpay({
      appid: WECHAT_APP_ID || WECHAT_PAY_MCHID, // 如果没有AppID，使用商户号
      mchid: WECHAT_PAY_MCHID,
      publicKey: Buffer.from(''), // H5支付不需要证书
      privateKey: Buffer.from(''), // H5支付不需要证书
      key: WECHAT_PAY_API_V3_KEY,
    });
  }
  
  if (!wechatPayInstance) {
    throw new Error('WechatPay instance not initialized');
  }
  
  return wechatPayInstance;
}

/**
 * 创建微信JSAPI支付订单（微信内）
 */
export async function createWechatJsapiPayment(params: {
  outTradeNo: string; // 商户订单号
  amount: number; // 金额（分）
  description: string; // 商品描述
  openid: string; // 用户openid
}): Promise<{ prepayId: string }> {
  try {
    const pay = getWechatPayInstance();
    
    const result = await pay.transactions_jsapi({
      appid: WECHAT_APP_ID || WECHAT_PAY_MCHID,
      mchid: WECHAT_PAY_MCHID,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: `https://www.zesiai.com/api/wechat-pay/notify`,
      amount: {
        total: params.amount,
        currency: 'CNY',
      },
      payer: {
        openid: params.openid,
      },
    });
    
    if (result.status === 200 && result.data.prepay_id) {
      return { prepayId: result.data.prepay_id };
    }
    
    throw new Error('Failed to create wechat jsapi payment');
  } catch (error) {
    console.error('[WechatPay] Create JSAPI payment error:', error);
    throw error;
  }
}

/**
 * 创建微信H5支付订单（外部浏览器）
 */
export async function createWechatH5Payment(params: {
  outTradeNo: string; // 商户订单号
  amount: number; // 金额（分）
  description: string; // 商品描述
  clientIp: string; // 用户IP
}): Promise<{ h5Url: string }> {
  try {
    const pay = getWechatPayInstance();
    
    const result = await pay.transactions_h5({
      appid: WECHAT_APP_ID || WECHAT_PAY_MCHID,
      mchid: WECHAT_PAY_MCHID,
      description: params.description,
      out_trade_no: params.outTradeNo,
      notify_url: `https://www.zesiai.com/api/wechat-pay/notify`,
      amount: {
        total: params.amount,
        currency: 'CNY',
      },
      scene_info: {
        payer_client_ip: params.clientIp,
        h5_info: {
          type: 'Wap',
          app_name: '泽思AI商业智库',
        },
      },
    });
    
    if (result.status === 200 && result.data.h5_url) {
      return { h5Url: result.data.h5_url };
    }
    
    throw new Error('Failed to create wechat payment');
  } catch (error) {
    console.error('[WechatPay] Create payment error:', error);
    throw error;
  }
}

/**
 * 查询微信支付订单状态
 */
export async function queryWechatPayment(outTradeNo: string) {
  try {
    const pay = getWechatPayInstance();
    
    const result = await pay.query({
      out_trade_no: outTradeNo,
    });
    
    return result.data;
  } catch (error) {
    console.error('[WechatPay] Query payment error:', error);
    throw error;
  }
}

/**
 * 验证微信支付回调签名
 */
export async function verifyWechatPayNotify(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  serial: string
): Promise<boolean> {
  try {
    const pay = getWechatPayInstance();
    return await pay.verifySign({ timestamp, nonce, body, signature, serial });
  } catch (error) {
    console.error('[WechatPay] Verify signature error:', error);
    return false;
  }
}

/**
 * 解密微信支付回调数据
 */
export function decryptWechatPayNotify(
  ciphertext: string,
  associatedData: string,
  nonce: string
): any {
  try {
    const pay = getWechatPayInstance();
    return pay.decipher_gcm(ciphertext, associatedData, nonce, WECHAT_PAY_API_V3_KEY);
  } catch (error) {
    console.error('[WechatPay] Decrypt notify error:', error);
    throw error;
  }
}
