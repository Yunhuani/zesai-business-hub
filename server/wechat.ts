import axios from "axios";

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";

export interface WechatUserInfo {
  openid: string;
  nickname: string;
  headimgurl: string;
  unionid?: string;
}

/**
 * Generate WeChat OAuth authorization URL
 */
export function getWechatAuthUrl(redirectUri: string, state: string = "STATE"): string {
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  return `https://open.weixin.qq.com/connect/qrconnect?appid=${WECHAT_APP_ID}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=snsapi_login&state=${state}#wechat_redirect`;
}

/**
 * Exchange authorization code for access token
 */
export async function getWechatAccessToken(code: string): Promise<{
  access_token: string;
  openid: string;
  unionid?: string;
}> {
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;
  
  const response = await axios.get(url);
  
  if (response.data.errcode) {
    throw new Error(`WeChat API Error: ${response.data.errmsg}`);
  }
  
  return {
    access_token: response.data.access_token,
    openid: response.data.openid,
    unionid: response.data.unionid,
  };
}

/**
 * Get WeChat user info using access token
 */
export async function getWechatUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}`;
  
  const response = await axios.get(url);
  
  if (response.data.errcode) {
    throw new Error(`WeChat API Error: ${response.data.errmsg}`);
  }
  
  return {
    openid: response.data.openid,
    nickname: response.data.nickname,
    headimgurl: response.data.headimgurl,
    unionid: response.data.unionid,
  };
}
