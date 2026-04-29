export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  jwtSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",

  // AI Provider 配置（支持多厂商切换）
  // provider: "openrouter" | "moonshot" | "anthropic" | "openai"
  llmProvider: (process.env.LLM_PROVIDER ?? "openrouter") as "openrouter" | "moonshot" | "anthropic" | "openai",
  llmApiKey: process.env.LLM_API_KEY ?? "",
  llmModel: process.env.LLM_MODEL ?? "anthropic/claude-3.5-sonnet",
  llmBaseUrl: process.env.LLM_BASE_URL ?? "", // 可选，用于自定义API地址

  // 兼容旧配置（逐步淘汰）
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",

  alipayAppId: process.env.ALIPAY_APP_ID ?? "",
  alipayPrivateKey: process.env.ALIPAY_PRIVATE_KEY ?? "",
  alipayPublicKey: process.env.ALIPAY_PUBLIC_KEY ?? "",
  wechatAppId: process.env.WECHAT_APP_ID ?? "",
  wechatAppSecret: process.env.WECHAT_APP_SECRET ?? "",
  // 微信支付开关（H5支付审核期间设置为false）
  wechatPayEnabled: process.env.WECHAT_PAY_ENABLED === "true",
  // Stripe支付配置（国际用户）
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};
