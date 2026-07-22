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

import { invokeLLM } from "./_core/llm";

describe("LLM thinking configuration", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("passes explicit non-thinking mode to the provider payload", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ choices: [] }), { status: 200 })
    );

    await invokeLLM({
      messages: [{ role: "user", content: "classify" }],
      responseFormat: { type: "json_object" },
      thinking: { type: "disabled" },
    });

    const request = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      response_format: { type: "json_object" },
      thinking: { type: "disabled" },
    });
  });
});
