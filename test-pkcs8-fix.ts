/**
 * 验证 keyType: PKCS8 是否修复验签问题
 */
import { AlipaySdk } from 'alipay-sdk';
import { createSign } from 'crypto';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const privateKey = process.env.ALIPAY_PRIVATE_KEY!;
const publicKey = process.env.ALIPAY_PUBLIC_KEY!;

console.log('私钥前10字符:', privateKey.substring(0, 10), '→ PKCS8格式（应配置keyType: PKCS8）');

// 用 PKCS8 格式的私钥签名
const pkcs8Key = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
const testStr = 'app_id=2021006111681131&out_trade_no=TEST123&sign_type=RSA2&trade_status=TRADE_SUCCESS';
const sign = createSign('RSA-SHA256').update(testStr, 'utf8').sign(pkcs8Key, 'base64');

// 用公钥验签
const pubKey = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;
const { createVerify } = await import('crypto');
const verifyResult = createVerify('RSA-SHA256').update(testStr, 'utf8').verify(pubKey, sign, 'base64');
console.log('PKCS8私钥签名 + 公钥验签:', verifyResult ? '✅ 匹配！' : '❌ 不匹配');

// 测试SDK加上 keyType: 'PKCS8' 后的 checkNotifySign
const sdkWithPkcs8 = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID!,
  privateKey,
  alipayPublicKey: publicKey,
  signType: 'RSA2',
  keyType: 'PKCS8',
});

const params: Record<string, string> = {
  app_id: process.env.ALIPAY_APP_ID!,
  out_trade_no: 'TEST123',
  trade_status: 'TRADE_SUCCESS',
  sign_type: 'RSA2',
};
const sortedStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
const sdkSign = createSign('RSA-SHA256').update(sortedStr, 'utf8').sign(pkcs8Key, 'base64');

const notifyParams = { ...params, sign: sdkSign };
const sdkResult = sdkWithPkcs8.checkNotifySign(notifyParams);
console.log('SDK(keyType=PKCS8) checkNotifySign:', sdkResult ? '✅ 验签通过！' : '❌ 验签失败');

// 对比：不加 keyType 的情况
const sdkWithoutPkcs8 = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID!,
  privateKey,
  alipayPublicKey: publicKey,
  signType: 'RSA2',
  // 不加 keyType
});
const sdkResultOld = sdkWithoutPkcs8.checkNotifySign(notifyParams);
console.log('SDK(无keyType) checkNotifySign:', sdkResultOld ? '✅ 验签通过' : '❌ 验签失败（这就是bug所在）');
