import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4";
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

// ============== Provider 配置 ==============

type ProviderConfig = {
  baseUrl: string;
  getHeaders: (apiKey: string) => Record<string, string>;
  formatModel: (model: string) => string;
  supportsStreaming: boolean;
};

const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  // OpenRouter - 支持多模型聚合
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
      "HTTP-Referer": "https://zesiai.com",
      "X-Title": "泽思AI商业智库",
    }),
    formatModel: (model) => model, // OpenRouter 使用完整模型路径
    supportsStreaming: true,
  },

  // Moonshot (Kimi)
  moonshot: {
    baseUrl: "https://api.moonshot.cn/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    }),
    formatModel: (model) => model.replace("moonshot/", ""), // 移除前缀
    supportsStreaming: true,
  },

  // Anthropic 直连
  anthropic: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    getHeaders: (apiKey) => ({
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    formatModel: (model) => model.replace("anthropic/", ""),
    supportsStreaming: true,
  },

  // OpenAI 直连
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    }),
    formatModel: (model) => model.replace("openai/", ""),
    supportsStreaming: true,
  },

  // 兼容旧 Manus 配置
  manus: {
    baseUrl: ENV.forgeApiUrl
      ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
      : "https://forge.manus.im/v1/chat/completions",
    getHeaders: (apiKey) => ({
      "content-type": "application/json",
      "authorization": `Bearer ${apiKey}`,
    }),
    formatModel: () => "claude-3.5-sonnet",
    supportsStreaming: true,
  },
};

// ============== 工具函数 ==============

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }
  if (part.type === "text") return part;
  if (part.type === "image_url") return part;
  if (part.type === "file_url") return part;
  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map((part) => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");
    return { role, name, tool_call_id, content };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return { role, name, content: contentParts[0].text };
  }

  return { role, name, content: contentParts };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error("tool_choice 'required' was provided but no tools were configured");
    }
    if (tools.length > 1) {
      throw new Error("tool_choice 'required' needs a single tool or specify the tool name explicitly");
    }
    return { type: "function", function: { name: tools[0].function.name } };
  }

  if ("name" in toolChoice) {
    return { type: "function", function: { name: toolChoice.name } };
  }

  return toolChoice;
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (explicitFormat.type === "json_schema" && !explicitFormat.json_schema?.schema) {
      throw new Error("responseFormat json_schema requires a defined schema object");
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

// ============== 核心调用函数 ==============

export function getProviderConfig(): ProviderConfig {
  // 优先使用新的 LLM_PROVIDER 配置
  const provider = ENV.llmProvider;

  // 如果设置了自定义 baseUrl，使用自定义配置
  if (ENV.llmBaseUrl) {
    return {
      baseUrl: `${ENV.llmBaseUrl.replace(/\/$/, "")}/chat/completions`,
      getHeaders: (apiKey) => ({
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      }),
      formatModel: (model) => model,
      supportsStreaming: true,
    };
  }

  // 返回对应 provider 配置
  if (PROVIDER_CONFIGS[provider]) {
    return PROVIDER_CONFIGS[provider];
  }

  // 兼容旧配置（如果设置了 BUILT_IN_FORGE_API_KEY 但没有设置新的 LLM_PROVIDER）
  if (ENV.forgeApiKey && !ENV.llmApiKey) {
    return PROVIDER_CONFIGS.manus;
  }

  // 默认使用 openrouter
  return PROVIDER_CONFIGS.openrouter;
}

export function getApiKey(): string {
  // 优先使用新的 LLM_API_KEY
  if (ENV.llmApiKey) {
    return ENV.llmApiKey;
  }
  // 兼容旧的 BUILT_IN_FORGE_API_KEY
  if (ENV.forgeApiKey) {
    return ENV.forgeApiKey;
  }
  throw new Error("LLM_API_KEY is not configured. Please set LLM_API_KEY environment variable.");
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  const apiKey = getApiKey();
  const provider = getProviderConfig();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: provider.formatModel(ENV.llmModel),
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const requestedMaxTokens = params.maxTokens || params.max_tokens;
  payload.max_tokens = requestedMaxTokens || 32768;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: provider.getHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

/**
 * Stream LLM response (for real-time streaming)
 */
export async function invokeLLMStream(params: InvokeParams): Promise<ReadableStream> {
  const apiKey = getApiKey();
  const provider = getProviderConfig();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: provider.formatModel(ENV.llmModel),
    messages: messages.map(normalizeMessage),
    stream: true,
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(toolChoice || tool_choice, tools);
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  const requestedMaxTokens = params.maxTokens || params.max_tokens;
  payload.max_tokens = requestedMaxTokens || 32768;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(provider.baseUrl, {
    method: "POST",
    headers: provider.getHeaders(apiKey),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM stream failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  if (!response.body) {
    throw new Error("No response body for streaming");
  }

  return response.body;
}

// ============== 便捷函数 ==============

/**
 * 获取当前使用的模型信息（用于日志和调试）
 */
export function getCurrentModelInfo() {
  const provider = getProviderConfig();
  return {
    provider: ENV.llmProvider,
    model: ENV.llmModel,
    formattedModel: provider.formatModel(ENV.llmModel),
    baseUrl: provider.baseUrl,
  };
}

/**
 * 支持的模型列表（用于配置界面）
 */
export const SUPPORTED_MODELS = {
  openrouter: [
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet (推荐)", description: "商业咨询场景表现最佳" },
    { id: "openai/gpt-4o", name: "GPT-4o", description: "通用能力强" },
    { id: "google/gemini-pro", name: "Gemini Pro", description: "长文本处理优秀" },
    { id: "deepseek/deepseek-chat", name: "DeepSeek V3", description: "性价比高" },
    { id: "x-ai/grok-2", name: "Grok 2", description: "X平台数据优势" },
  ],
  moonshot: [
    { id: "moonshot-v1-8k", name: "Moonshot 8K", description: "基础版" },
    { id: "moonshot-v1-32k", name: "Moonshot 32K", description: "长文本版" },
    { id: "moonshot-v1-128k", name: "Moonshot 128K", description: "超长文本版" },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", description: "最新版本" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", description: "最强能力" },
    { id: "claude-3-haiku-20240307", name: "Claude 3 Haiku", description: "极速响应" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", description: "最新旗舰" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", description: "轻量版" },
    { id: "gpt-4-turbo", name: "GPT-4 Turbo", description: "稳定版" },
  ],
};
