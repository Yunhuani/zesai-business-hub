import axios from "axios";
import { sanitizeForLog } from "./lib/logSanitizer";

const WECHAT_APP_ID = process.env.WECHAT_APP_ID || "";
const WECHAT_APP_SECRET = process.env.WECHAT_APP_SECRET || "";

export interface WechatUserInfo {
  openid: string;
  nickname: string;
  headimgurl: string;
  unionid?: string;
}

/**
 * Generate WeChat OAuth authorization URL for Official Account (公众号网页授权)
 * 使用 snsapi_userinfo 作用域,可以获取用户基本信息
 */
export function getWechatAuthUrl(redirectUri: string, state: string = "STATE"): string {
  const encodedRedirectUri = encodeURIComponent(redirectUri);
  // 公众号网页授权使用 oauth2/authorize 接口,scope 为 snsapi_userinfo
  return `https://open.weixin.qq.com/connect/oauth2/authorize?appid=${WECHAT_APP_ID}&redirect_uri=${encodedRedirectUri}&response_type=code&scope=snsapi_userinfo&state=${state}#wechat_redirect`;
}

/**
 * Exchange authorization code for access token (公众号)
 */
export async function getWechatAccessToken(code: string): Promise<{
  access_token: string;
  openid: string;
  unionid?: string;
}> {
  const url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}&code=${code}&grant_type=authorization_code`;
  
  console.log('[WeChat] Requesting access token...');
  const response = await axios.get(url);
  
  console.log('[WeChat] Access token response:', sanitizeForLog(response.data));
  
  if (response.data.errcode) {
    throw new Error(`WeChat API Error: ${response.data.errmsg} (code: ${response.data.errcode})`);
  }
  
  return {
    access_token: response.data.access_token,
    openid: response.data.openid,
    unionid: response.data.unionid,
  };
}

/**
 * Get WeChat user info using access token (公众号)
 */
export async function getWechatUserInfo(accessToken: string, openid: string): Promise<WechatUserInfo> {
  const url = `https://api.weixin.qq.com/sns/userinfo?access_token=${accessToken}&openid=${openid}&lang=zh_CN`;
  
  console.log('[WeChat] Requesting user info...');
  const response = await axios.get(url);
  
  console.log('[WeChat] User info response:', sanitizeForLog(response.data));
  
  if (response.data.errcode) {
    throw new Error(`WeChat API Error: ${response.data.errmsg} (code: ${response.data.errcode})`);
  }
  
  return {
    openid: response.data.openid,
    nickname: response.data.nickname,
    headimgurl: response.data.headimgurl,
    unionid: response.data.unionid,
  };
}
