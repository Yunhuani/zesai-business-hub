/**
 * 详细诊断支付宝验签问题
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { createSign, createVerify } from 'crypto';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const privateKey = process.env.ALIPAY_PRIVATE_KEY!;
const publicKey = process.env.ALIPAY_PUBLIC_KEY!;

console.log('=== 私钥诊断 ===');
console.log('私钥长度:', privateKey?.length);
console.log('私钥前30字符:', privateKey?.substring(0, 30));
console.log('私钥后30字符:', privateKey?.slice(-30));
console.log('是否含BEGIN头:', privateKey?.includes('BEGIN'));
console.log('是否含换行符:', privateKey?.includes('\n'));

// 判断私钥类型
const isPKCS8 = privateKey?.includes('BEGIN PRIVATE KEY') || (!privateKey?.includes('BEGIN') && privateKey?.startsWith('MIIEv') === false && privateKey?.startsWith('MIIE') === false);
const isPKCS1 = privateKey?.includes('BEGIN RSA PRIVATE KEY') || privateKey?.startsWith('MIIEv') || privateKey?.startsWith('MIIE');
console.log('私钥类型判断 - PKCS8:', isPKCS8, '| PKCS1:', isPKCS1);

// 尝试不同格式的私钥
const testStr = 'hello world test string';

function trySign(keyStr: string, keyType: string): string | null {
  try {
    const sign = createSign('RSA-SHA256').update(testStr).sign(keyStr, 'base64');
    console.log(`✅ ${keyType} 签名成功，长度: ${sign.length}`);
    return sign;
  } catch (e: any) {
    console.log(`❌ ${keyType} 签名失败: ${e.message}`);
    return null;
  }
}

function tryVerify(keyStr: string, sign: string, keyType: string): boolean {
  try {
    const result = createVerify('RSA-SHA256').update(testStr).verify(keyStr, sign, 'base64');
    console.log(`${result ? '✅' : '❌'} ${keyType} 验签结果: ${result}`);
    return result;
  } catch (e: any) {
    console.log(`❌ ${keyType} 验签失败: ${e.message}`);
    return false;
  }
}

console.log('\n=== 测试私钥签名 ===');

// 格式1: PKCS1 带头尾
const pkcs1Key = `-----BEGIN RSA PRIVATE KEY-----\n${privateKey}\n-----END RSA PRIVATE KEY-----`;
const sign1 = trySign(pkcs1Key, 'PKCS1带头尾');

// 格式2: PKCS8 带头尾
const pkcs8Key = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
const sign2 = trySign(pkcs8Key, 'PKCS8带头尾');

// 格式3: 直接使用（如果已有头尾）
const sign3 = trySign(privateKey, '原始私钥');

console.log('\n=== 测试公钥验签 ===');
const pubKeyFormatted = `-----BEGIN PUBLIC KEY-----\n${publicKey}\n-----END PUBLIC KEY-----`;

const signs = [
  { sign: sign1, name: 'PKCS1签名' },
  { sign: sign2, name: 'PKCS8签名' },
  { sign: sign3, name: '原始签名' },
].filter(s => s.sign !== null);

for (const { sign, name } of signs) {
  tryVerify(pubKeyFormatted, sign!, name);
}

console.log('\n=== 测试alipay-sdk验签 ===');
import('alipay-sdk').then(({ AlipaySdk }) => {
  // 测试SDK用不同私钥格式
  const configs = [
    { privateKey: pkcs1Key, label: 'PKCS1带头尾' },
    { privateKey: pkcs8Key, label: 'PKCS8带头尾' },
    { privateKey, label: '原始私钥' },
  ];
  
  for (const cfg of configs) {
    try {
      const sdk = new AlipaySdk({
        appId: process.env.ALIPAY_APP_ID!,
        privateKey: cfg.privateKey,
        alipayPublicKey: publicKey,
        signType: 'RSA2',
      });
      
      // 构造测试notify参数，用SDK签名
      const params: Record<string, string> = {
        app_id: process.env.ALIPAY_APP_ID!,
        out_trade_no: 'TEST123',
        trade_status: 'TRADE_SUCCESS',
        sign_type: 'RSA2',
      };
      
      // 手动生成签名
      const sortedStr = Object.keys(params).sort().map(k => `${k}=${params[k]}`).join('&');
      const sign = createSign('RSA-SHA256').update(sortedStr, 'utf8').sign(cfg.privateKey, 'base64');
      
      const notifyParams = { ...params, sign };
      const result = sdk.checkNotifySign(notifyParams);
      console.log(`${result ? '✅' : '❌'} SDK checkNotifySign [${cfg.label}]: ${result}`);
    } catch (e: any) {
      console.log(`❌ SDK [${cfg.label}] 错误: ${e.message}`);
    }
  }
});
