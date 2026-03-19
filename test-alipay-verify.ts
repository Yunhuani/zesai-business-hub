/**
 * 测试支付宝验签是否正常工作
 * 运行: npx tsx test-alipay-verify.ts
 */
import { AlipaySdk } from 'alipay-sdk';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID!,
  privateKey: process.env.ALIPAY_PRIVATE_KEY!,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
  gateway: 'https://openapi.alipay.com/gateway.do',
  charset: 'utf-8',
  signType: 'RSA2',
});

console.log('=== 支付宝配置检查 ===');
console.log('APP_ID:', process.env.ALIPAY_APP_ID);
console.log('PRIVATE_KEY 长度:', process.env.ALIPAY_PRIVATE_KEY?.length);
console.log('PUBLIC_KEY 长度:', process.env.ALIPAY_PUBLIC_KEY?.length);
console.log('PUBLIC_KEY 前100字符:', process.env.ALIPAY_PUBLIC_KEY?.substring(0, 100));
console.log('PUBLIC_KEY 后50字符:', process.env.ALIPAY_PUBLIC_KEY?.slice(-50));

// 测试：用私钥签名，再用公钥验签（自签自验）
console.log('\n=== 测试自签名验签 ===');
try {
  // 构造一个测试参数
  const testParams: Record<string, string> = {
    app_id: process.env.ALIPAY_APP_ID!,
    method: 'alipay.trade.page.pay',
    charset: 'utf-8',
    sign_type: 'RSA2',
    timestamp: '2026-03-18 10:00:00',
    version: '1.0',
    out_trade_no: 'TEST123',
    trade_status: 'TRADE_SUCCESS',
  };
  
  // 生成签名字符串
  const sortedKeys = Object.keys(testParams).sort();
  const signStr = sortedKeys.map(k => `${k}=${testParams[k]}`).join('&');
  console.log('待签名字符串:', signStr);
  
  // 用私钥签名
  const crypto = await import('crypto');
  const privateKey = process.env.ALIPAY_PRIVATE_KEY!;
  const formattedKey = privateKey.includes('BEGIN') ? privateKey : 
    `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
  
  const sign = crypto.createSign('RSA-SHA256')
    .update(signStr, 'utf8')
    .sign(formattedKey, 'base64');
  
  console.log('签名成功，sign长度:', sign.length);
  
  // 用公钥验签
  const publicKey = process.env.ALIPAY_PUBLIC_KEY!;
  const formattedPubKey = publicKey.includes('BEGIN') ? publicKey :
    `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
  
  const verify = crypto.createVerify('RSA-SHA256')
    .update(signStr, 'utf8')
    .verify(formattedPubKey, sign, 'base64');
  
  console.log('公钥验签结果:', verify);
  
  if (verify) {
    console.log('✅ 公私钥匹配正确！');
    
    // 现在测试checkNotifySign
    const notifyParams = { ...testParams, sign };
    const sdkResult = alipaySdk.checkNotifySign(notifyParams);
    console.log('SDK checkNotifySign结果:', sdkResult);
  } else {
    console.log('❌ 公私钥不匹配！ALIPAY_PUBLIC_KEY与ALIPAY_PRIVATE_KEY不是一对密钥');
    console.log('这就是notify验签失败的根本原因！');
  }
} catch (err: any) {
  console.error('测试失败:', err.message);
}
