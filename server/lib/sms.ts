// 阿里云短信服务
import * as DysmsapiModule from '@alicloud/dysmsapi20170525';
import { Config } from '@alicloud/openapi-client';
import { logger } from './logger';
import { maskPhone } from './logSanitizer';

// 处理ESM/CJS兼容性问题
const Dysmsapi = (DysmsapiModule.default as any)?.default || DysmsapiModule.default;
const { SendSmsRequest } = DysmsapiModule;

/**
 * 发送短信验证码
 * @param phone 手机号
 * @param code 验证码
 * @param type 验证码类型
 * @returns 发送结果
 */
export async function sendSmsCode(
  phone: string,
  code: string,
  type: 'login' | 'register' | 'bind' = 'login'
): Promise<{ success: boolean; message: string }> {
  const signName = process.env.ALIYUN_SMS_SIGN_NAME;
  const templateCode = process.env.ALIYUN_SMS_TEMPLATE_CODE;
  const accessKeyId = process.env.ALIYUN_SMS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.ALIYUN_SMS_ACCESS_KEY_SECRET;

  if (!signName || !templateCode || !accessKeyId || !accessKeySecret) {
    logger.error('SMS', 'Missing SMS configuration');
    return { success: false, message: '短信服务配置错误' };
  }

  try {
    const config = new Config({
      accessKeyId,
      accessKeySecret,
    });
    config.endpoint = 'dysmsapi.aliyuncs.com';
    
    const client = new Dysmsapi(config);
    
    const sendSmsRequest = new SendSmsRequest({
      phoneNumbers: phone,
      signName: signName,
      templateCode: templateCode,
      templateParam: JSON.stringify({ code }),
    });

    logger.info('SMS', `Sending SMS to ${maskPhone(phone)} (type: ${type})`);
    
    const response = await client.sendSms(sendSmsRequest);
    
    if (response.body.code === 'OK') {
      logger.info('SMS', `Successfully sent code to ${maskPhone(phone)}`);
      return { success: true, message: '验证码已发送' };
    } else {
      logger.error('SMS', `Failed to send: ${response.body.code} - ${response.body.message}`);
      return { success: false, message: response.body.message || '发送失败' };
    }
  } catch (error: any) {
    logger.error('SMS', `Error sending SMS to ${maskPhone(phone)}`, error);
    return { success: false, message: '短信发送失败，请稍后重试' };
  }
}

/**
 * 生成6位数字验证码
 */
export function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * 验证手机号格式
 */
export function isValidPhone(phone: string): boolean {
  return /^1[3-9]\d{9}$/.test(phone);
}
