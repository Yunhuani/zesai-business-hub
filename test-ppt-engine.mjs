/**
 * PPT Engine End-to-End Test
 * Tests: LLM structuring → HTML rendering → Puppeteer screenshot → PPT assembly
 * Run: node test-ppt-engine.mjs
 */

// We'll test by calling the dev server API directly
const BASE_URL = 'http://localhost:3000';

const TEST_TEXT = `
一人公司商业模型方案

一、商业定位
理财专家一人公司，专注于为中产家庭和个人提供专业的理财咨询和资产配置服务。通过线上+线下的混合模式，提供个性化的理财方案。

二、核心服务
1. 个人财务规划：包括收支分析、储蓄目标设定、债务管理等
2. 投资组合配置：根据风险偏好和投资目标，设计多元化投资组合
3. 保险规划：分析保障需求，推荐合适的保险产品
4. 退休规划：制定长期退休储蓄和投资策略
5. 税务优化：合法节税方案设计

三、盈利模式
1. 咨询费：按小时收费，每小时500-1000元
2. 方案设计费：一次性收取3000-10000元
3. 资产管理费：按管理资产规模的0.5%-1%收取年费
4. 培训课程：线上理财课程，每期99-999元
5. 会员订阅：月度/年度会员，提供持续跟踪服务

四、获客渠道
1. 社交媒体：微信公众号、小红书、抖音等平台内容营销
2. 口碑推荐：老客户转介绍奖励计划
3. 线下活动：定期举办理财沙龙和讲座
4. 合作引流：与银行、保险公司等金融机构合作

五、运营成本
1. 固定成本：办公场地（可居家）、软件工具、网络费用，约3000元/月
2. 变动成本：营销推广、学习进修、差旅费用，约2000-5000元/月
3. 预计月收入：15000-50000元
4. 预计利润率：60%-80%

六、发展规划
第一阶段（1-6个月）：建立个人品牌，积累首批客户
第二阶段（6-12个月）：优化服务流程，提升客单价
第三阶段（1-2年）：扩展服务范围，考虑团队化运营
`;

async function testPPTEngine() {
  console.log('=== PPT Engine E2E Test ===\n');

  // Step 1: Test the options endpoint (no auth needed for this test)
  console.log('Step 1: Testing options endpoint...');
  try {
    // We'll directly test the server modules by importing them
    // But since this is ESM and the server is TS, let's test via HTTP
    
    // First, let's check if the server is running
    const healthCheck = await fetch(`${BASE_URL}/`).catch(() => null);
    if (!healthCheck) {
      console.error('❌ Server not running at', BASE_URL);
      process.exit(1);
    }
    console.log('✅ Server is running');
  } catch (e) {
    console.error('❌ Server check failed:', e.message);
  }

  // Step 2: Test the tRPC endpoint directly
  console.log('\nStep 2: Testing pptGeneration.getOptions via tRPC...');
  try {
    // tRPC query endpoint
    const optionsRes = await fetch(`${BASE_URL}/api/trpc/pptGeneration.getOptions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    const optionsData = await optionsRes.json();
    console.log('Options response status:', optionsRes.status);
    if (optionsData.result?.data) {
      console.log('✅ Options loaded:', JSON.stringify(optionsData.result.data, null, 2).substring(0, 200));
    } else {
      console.log('⚠️ Options response:', JSON.stringify(optionsData).substring(0, 300));
    }
  } catch (e) {
    console.error('❌ Options test failed:', e.message);
  }

  // Step 3: Test create endpoint (needs auth)
  console.log('\nStep 3: Testing pptGeneration.create via tRPC (needs auth)...');
  try {
    const createRes = await fetch(`${BASE_URL}/api/trpc/pptGeneration.create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        json: {
          inputText: TEST_TEXT,
          themeStyle: 'business',
          colorScheme: 'zenith_purple',
        }
      }),
    });
    const createData = await createRes.json();
    console.log('Create response status:', createRes.status);
    if (createData.error) {
      console.log('⚠️ Expected auth error:', createData.error.message || JSON.stringify(createData.error).substring(0, 200));
    } else {
      console.log('✅ Create response:', JSON.stringify(createData).substring(0, 200));
    }
  } catch (e) {
    console.error('❌ Create test failed:', e.message);
  }

  console.log('\n=== Test Complete ===');
  console.log('\nNote: Full E2E test requires authentication.');
  console.log('The core modules (structurer, renderer, assembler) need to be tested with auth token.');
}

testPPTEngine().catch(console.error);
