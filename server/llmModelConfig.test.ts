import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./_core/env", () => ({
  ENV: {
    llmProvider: "openrouter",
    llmApiKey: "test-key",
    llmModel: "deepseek-v4-flash",
    llmBaseUrl: "https://api.deepseek.com/v1",
    forgeApiKey: "",
    forgeApiUrl: "",
  },
}));

import { invokeLLM, SUPPORTED_MODELS } from "./_core/llm";

describe("LLM model configuration", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("sends deepseek-v4-flash unchanged to the configured DeepSeek endpoint", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    );

    await invokeLLM({ messages: [{ role: "user", content: "ping" }] });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" })
    );
    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: "deepseek-v4-flash",
    });
  });

  it("publishes only the new direct DeepSeek model id in the supported model catalog", () => {
    const deepSeekModels = SUPPORTED_MODELS.openrouter.filter(model =>
      model.id.includes("deepseek")
    );

    expect(deepSeekModels).toEqual([
      {
        id: "deepseek-v4-flash",
        name: "DeepSeek V4 Flash",
        description: "高性价比对话模型",
      },
    ]);
  });
});
