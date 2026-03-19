import { AlipaySdk } from 'alipay-sdk';
import { createSign, createVerify, createPrivateKey, createPublicKey } from 'crypto';
import * as dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '.env') });

const sdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID!,
  privateKey: process.env.ALIPAY_PRIVATE_KEY!,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY!,
  signType: 'RSA2',
});

const config = (sdk as any).config;

console.log('=== SDK内部格式化后的密钥 ===');
console.log('privateKey头:', config.privateKey.substring(0, 50));
console.log('alipayPublicKey头:', config.alipayPublicKey.substring(0, 50));

// 用SDK内部的私钥签名
const testStr = 'app_id=2021006111681131&out_trade_no=TEST123&trade_status=TRADE_SUCCESS';
try {
  const sign = createSign('RSA-SHA256').update(testStr, 'utf8').sign(config.privateKey, 'base64');
  console.log('签名成功, sign长度:', sign.length);

  // 用SDK内部的公钥验签
  const result = createVerify('RSA-SHA256').update(testStr, 'utf8').verify(config.alipayPublicKey, sign, 'base64');
  console.log('SDK公钥验签结果:', result);

  // 从SDK内部私钥提取对应公钥
  const keyObj = createPrivateKey(config.privateKey);
  const derivedPub = createPublicKey(keyObj).export({ type: 'spki', format: 'pem' }) as string;
  console.log('\n私钥对应的公钥:', derivedPub.substring(27, 77) + '...');
  console.log('SDK存储的公钥: ', config.alipayPublicKey.substring(27, 77) + '...');
  console.log('两者是否相同:', derivedPub.trim() === config.alipayPublicKey.trim());

  // 用私钥对应公钥验签
  const result2 = createVerify('RSA-SHA256').update(testStr, 'utf8').verify(derivedPub, sign, 'base64');
  console.log('用私钥对应公钥验签:', result2);

  // 关键：模拟支付宝notify验签
  console.log('\n=== 模拟checkNotifySign ===');
  const params: Record<string, string> = {
    app_id: process.env.ALIPAY_APP_ID!,
    out_trade_no: 'TEST123',
    trade_status: 'TRADE_SUCCESS',
    sign_type: 'RSA2',
  };
  // 用SDK私钥签名（模拟支付宝用应用公钥对应的私钥签名）
  // 但实际上支付宝是用"支付宝私钥"签名的，我们用"支付宝公钥"验签
  // 所以这里的测试逻辑有误——我们不应该用应用私钥签名来测试
  // 正确理解：支付宝notify是支付宝用支付宝自己的私钥签名的
  // 我们用ALIPAY_PUBLIC_KEY（支付宝公钥）来验签
  // ALIPAY_PRIVATE_KEY是我们的应用私钥，与支付宝公钥无关
  console.log('\n关键发现：ALIPAY_PUBLIC_KEY 是支付宝的公钥，不是应用公钥！');
  console.log('ALIPAY_PRIVATE_KEY 是应用私钥，用于签名请求给支付宝');
  console.log('ALIPAY_PUBLIC_KEY 是支付宝公钥，用于验证支付宝发来的notify');
  console.log('这两个密钥本来就不是一对！它们属于不同的密钥对！');
  console.log('应用私钥 ↔ 应用公钥（上传到支付宝）');
  console.log('支付宝私钥 ↔ 支付宝公钥（存在ALIPAY_PUBLIC_KEY）');
  console.log('\n所以之前的"公私钥不匹配"诊断是错误的！');
  console.log('它们本来就不应该匹配！');
  
  // 真正的问题：checkNotifySign验签失败，说明支付宝发来的签名用ALIPAY_PUBLIC_KEY无法验证
  // 可能原因：
  // 1. ALIPAY_PUBLIC_KEY不是当前应用对应的支付宝公钥
  // 2. notify数据在传输过程中被篡改
  // 3. SDK的checkNotifySign有bug
  
  // 测试SDK的checkNotifySign逻辑
  console.log('\n=== 测试SDK rsaCheck ===');
  // 用支付宝公钥签名（模拟支付宝用自己的私钥签名 - 但我们没有支付宝私钥）
  // 所以无法在本地完全模拟
  console.log('无法在本地模拟支付宝签名（没有支付宝私钥）');
  console.log('需要查看实际的notify日志来判断');
  
} catch (e: any) {
  console.error('错误:', e.message);
}
