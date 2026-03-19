/**
 * 测试notify路由的完整流程
 * 1. 检查notify路由是否可达
 * 2. 检查body parser是否正确解析form数据
 * 3. 检查tRPC middleware是否拦截了notify请求
 */
import * as dotenv from 'dotenv';
import { resolve } from 'path';
dotenv.config({ path: resolve(process.cwd(), '.env') });

async function testNotifyRoute() {
  const baseUrl = 'http://localhost:3000';
  
  // 测试1: 发送form-urlencoded POST到notify路由
  console.log('=== 测试1: 发送form-urlencoded POST ===');
  try {
    const params = new URLSearchParams({
      app_id: '2021006111681131',
      out_trade_no: 'ZS_TEST_123',
      trade_status: 'TRADE_SUCCESS',
      trade_no: '2026031900001',
      sign_type: 'RSA2',
      sign: 'fake_sign_for_testing',
      total_amount: '99.00',
      charset: 'utf-8',
    });
    
    const resp = await fetch(`${baseUrl}/api/payment/alipay/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    
    console.log('状态码:', resp.status);
    console.log('响应头:', Object.fromEntries(resp.headers.entries()));
    const text = await resp.text();
    console.log('响应体:', text);
    
    // 如果返回400且包含"Invalid signature"，说明路由可达、body解析正确、只是签名验证失败
    if (resp.status === 400 && text === 'fail') {
      console.log('\n结论: 路由可达，body解析正确，签名验证失败（预期行为，因为签名是假的）');
    } else if (resp.status === 404) {
      console.log('\n结论: 路由不存在！这是问题所在');
    } else {
      console.log('\n结论: 意外响应，需要进一步调查');
    }
  } catch (e: any) {
    console.error('请求失败:', e.message);
  }
  
  // 测试2: 发送JSON POST到notify路由（模拟tRPC可能的拦截）
  console.log('\n=== 测试2: 发送JSON POST ===');
  try {
    const resp = await fetch(`${baseUrl}/api/payment/alipay/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        app_id: '2021006111681131',
        out_trade_no: 'ZS_TEST_123',
        trade_status: 'TRADE_SUCCESS',
      }),
    });
    
    console.log('状态码:', resp.status);
    const text = await resp.text();
    console.log('响应体:', text);
  } catch (e: any) {
    console.error('请求失败:', e.message);
  }
  
  // 测试3: 检查生产环境的notify URL是否可达
  console.log('\n=== 测试3: 检查生产环境notify URL ===');
  try {
    const resp = await fetch('https://www.zesiai.com/api/payment/alipay/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'app_id=test&sign=test&sign_type=RSA2',
    });
    console.log('生产环境状态码:', resp.status);
    const text = await resp.text();
    console.log('生产环境响应:', text.substring(0, 200));
  } catch (e: any) {
    console.error('生产环境请求失败:', e.message);
  }
}

testNotifyRoute();
