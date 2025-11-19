import { AlipaySdk } from 'alipay-sdk';

const alipaySdk = new AlipaySdk({
  appId: process.env.ALIPAY_APP_ID,
  privateKey: process.env.ALIPAY_PRIVATE_KEY,
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY,
  gateway: 'https://openapi.alipay.com/gateway.do',
  charset: 'utf-8',
  signType: 'RSA2',
});

console.log('Testing Alipay API...');
console.log('APPID:', process.env.ALIPAY_APP_ID);
console.log('Private Key length:', process.env.ALIPAY_PRIVATE_KEY?.length);
console.log('Public Key length:', process.env.ALIPAY_PUBLIC_KEY?.length);

try {
  const result = await alipaySdk.exec('alipay.trade.precreate', {
    bizContent: {
      out_trade_no: `TEST${Date.now()}`,
      total_amount: '0.01',
      subject: '测试订单',
      body: '这是一个测试订单',
    },
    notifyUrl: 'https://www.zhesiai.com/api/payment/alipay/notify',
  });
  
  console.log('\n=== API Response ===');
  console.log(JSON.stringify(result, null, 2));
  
  if (result.code === '10000') {
    console.log('\n✅ Success! QR Code:', result.qrCode);
  } else {
    console.log('\n❌ Failed!');
    console.log('Error Code:', result.code);
    console.log('Error Message:', result.msg);
    console.log('Sub Message:', result.subMsg);
  }
} catch (error) {
  console.error('\n❌ Exception:', error.message);
  if (error.response) {
    console.error('Response:', error.response);
  }
}
