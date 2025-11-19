import { describe, it, expect } from 'vitest';
import { getWechatAuthUrl } from '../wechat';

describe('WeChat Official Account Integration', () => {
  it('should have valid WeChat AppID configured', () => {
    const appId = process.env.WECHAT_APP_ID;
    expect(appId).toBeDefined();
    expect(appId).toBeTruthy();
    expect(appId).toMatch(/^wx[a-z0-9]{16}$/);
    console.log('✅ WeChat AppID format valid:', appId);
  });

  it('should have valid WeChat AppSecret configured', () => {
    const appSecret = process.env.WECHAT_APP_SECRET;
    expect(appSecret).toBeDefined();
    expect(appSecret).toBeTruthy();
    expect(appSecret).toHaveLength(32);
    console.log('✅ WeChat AppSecret length valid:', appSecret?.length);
  });

  it('should generate valid OAuth authorization URL for Official Account', () => {
    const redirectUri = 'https://www.zhesiai.com/wechat-callback';
    const authUrl = getWechatAuthUrl(redirectUri, 'TEST_STATE');
    
    expect(authUrl).toContain('https://open.weixin.qq.com/connect/oauth2/authorize');
    expect(authUrl).toContain(`appid=${process.env.WECHAT_APP_ID}`);
    expect(authUrl).toContain('response_type=code');
    expect(authUrl).toContain('scope=snsapi_userinfo');
    expect(authUrl).toContain('state=TEST_STATE');
    expect(authUrl).toContain(encodeURIComponent(redirectUri));
    
    console.log('✅ Generated auth URL:', authUrl);
  });

  it('should use Official Account OAuth endpoint (not Open Platform)', () => {
    const redirectUri = 'https://www.zhesiai.com/wechat-callback';
    const authUrl = getWechatAuthUrl(redirectUri);
    
    // 公众号使用 oauth2/authorize,不是开放平台的 qrconnect
    expect(authUrl).toContain('/oauth2/authorize');
    expect(authUrl).not.toContain('/qrconnect');
    
    // 公众号使用 snsapi_userinfo,不是开放平台的 snsapi_login
    expect(authUrl).toContain('scope=snsapi_userinfo');
    expect(authUrl).not.toContain('scope=snsapi_login');
    
    console.log('✅ Using Official Account OAuth (not Open Platform)');
  });
});
