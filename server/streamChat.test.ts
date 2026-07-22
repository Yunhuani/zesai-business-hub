import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const mocks = vi.hoisted(() => ({
  createMessage: vi.fn(),
  deductCredits: vi.fn(),
  invokeLLMStream: vi.fn(),
  classifyRecommendation: vi.fn(),
}));

vi.mock("./_core/sdk", () => ({
  sdk: {
    authenticateRequest: vi.fn(async () => ({ id: 7 })),
  },
}));

vi.mock("jsonwebtoken", () => ({
  default: { verify: vi.fn() },
}));

vi.mock("./_core/env", () => ({
  ENV: { jwtSecret: "test-secret" },
}));

vi.mock("./db", () => ({
  getUserByOpenId: vi.fn(),
  createMessage: mocks.createMessage,
  getConversationMessages: vi.fn(async () => []),
  getConversationById: vi.fn(async () => ({
    id: 12,
    userId: 7,
    agentId: 3,
  })),
  getAgentByIdFull: vi.fn(async () => ({
    id: 3,
    name: "泽思AI顾问",
    systemPrompt: "Be helpful",
    inputFields: "[]",
  })),
}));

vi.mock("./creditsManager", () => ({
  checkCredits: vi.fn(async () => true),
  deductCreditsWithIdempotencyKey: mocks.deductCredits,
  checkAndResetCredits: vi.fn(async () => undefined),
  getUserCredits: vi.fn(),
}));

vi.mock("./pricingConfig", () => ({
  getActionCredits: vi.fn(async () => 10),
}));

vi.mock("../shared/promptRules", () => ({
  getGlobalPromptRules: vi.fn(() => "Global rules"),
}));

vi.mock("./_core/knowledge", () => ({
  searchKnowledge: vi.fn(async () => []),
  buildRAGPrompt: vi.fn(),
  saveMessageKnowledgeRefs: vi.fn(),
}));

vi.mock("./_core/llm", () => ({
  invokeLLMStream: mocks.invokeLLMStream,
}));

vi.mock("./advisorRecommendation", () => ({
  classifyAdvisorRecommendation: mocks.classifyRecommendation,
}));

type ReadResult = {
  done: boolean;
  value?: Uint8Array;
  beforeReturn?: () => void;
};

function makeRequest() {
  const req = new EventEmitter() as EventEmitter & Request;
  req.headers = {};
  req.body = {
    conversationId: 12,
    content: "Hello",
    requestId: "req-1",
  };
  return req;
}

function makeResponse() {
  const writes: string[] = [];
  const res = {
    headersSent: false,
    setHeader: vi.fn(),
    write: vi.fn((value: string) => {
      writes.push(value);
      return true;
    }),
    end: vi.fn(),
    status: vi.fn(function (this: Response) {
      return this;
    }),
    json: vi.fn(),
  } as unknown as Response;

  return { res, writes };
}

function makeStream(reads: Array<ReadResult | Error>) {
  let index = 0;
  return {
    getReader: () => ({
      read: vi.fn(async () => {
        const next = reads[index++];
        if (next instanceof Error) throw next;
        next.beforeReturn?.();
        return { done: next.done, value: next.value };
      }),
    }),
  };
}

const encode = (value: string) => new TextEncoder().encode(value);

describe("handleStreamChat delivery billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createMessage.mockResolvedValue({ id: 101 });
    mocks.deductCredits.mockResolvedValue({ success: true, charged: true });
    mocks.classifyRecommendation.mockResolvedValue({
      key: "nbg_growth_diagnosis",
      reason: "适合系统定位增长瓶颈。",
    });
  });

  it("saves the assistant response and charges after a completed non-empty stream", async () => {
    const req = makeRequest();
    const { res } = makeResponse();
    mocks.invokeLLMStream.mockResolvedValue(makeStream([
      {
        done: false,
        value: encode(
          'data: {"choices":[{"delta":{"content":"Hello back"}}]}\n\ndata: [DONE]\n\n'
        ),
      },
      {
        done: true,
        beforeReturn: () => req.emit("close"),
      },
    ]));

    const { handleStreamChat } = await import("./streamChat");
    await handleStreamChat(req, res);

    expect(mocks.createMessage).toHaveBeenCalledTimes(2);
    expect(mocks.createMessage).toHaveBeenLastCalledWith({
      conversationId: 12,
      role: "assistant",
      content: "Hello back",
      recommendationMetadata: {
        key: "nbg_growth_diagnosis",
        reason: "适合系统定位增长瓶颈。",
      },
    });
    expect(mocks.deductCredits).toHaveBeenCalledTimes(1);
    expect(mocks.classifyRecommendation).toHaveBeenCalledTimes(1);
    const llmCall = mocks.invokeLLMStream.mock.calls[0][0];
    expect(llmCall.messages[0].content).not.toContain("Global rules");
    expect(llmCall.messages[0].content).toContain("禁止输出 JSON");
  });

  it("emits typed delta, recommendation, and done events", async () => {
    const req = makeRequest();
    const { res, writes } = makeResponse();
    mocks.invokeLLMStream.mockResolvedValue(makeStream([
      {
        done: false,
        value: encode('data: {"choices":[{"delta":{"content":"Hello'),
      },
      {
        done: false,
        value: encode(' back"}}]}\n\ndata: [DONE]\n\n'),
      },
      { done: true },
    ]));

    const { handleStreamChat } = await import("./streamChat");
    await handleStreamChat(req, res);

    const output = writes.join("");
    expect(output).toContain('"type":"message.delta"');
    expect(output).toContain('"type":"recommendation"');
    expect(output).toContain('"type":"done"');
    expect(output).not.toContain("data: [DONE]");
  });

  it("does not save an assistant response or charge when the model stream fails", async () => {
    const req = makeRequest();
    const { res, writes } = makeResponse();
    mocks.invokeLLMStream.mockResolvedValue(makeStream([
      {
        done: false,
        value: encode(
          'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'
        ),
      },
      new Error("model stream failed"),
    ]));

    const { handleStreamChat } = await import("./streamChat");
    await handleStreamChat(req, res);

    expect(mocks.createMessage).toHaveBeenCalledTimes(1);
    expect(mocks.deductCredits).not.toHaveBeenCalled();
    expect(writes.join("")).toContain("未完成");
    expect(writes.join("")).toContain("未扣费");
  });

  it("does not save an assistant response or charge when the client disconnects mid-stream", async () => {
    const req = makeRequest();
    const { res, writes } = makeResponse();
    mocks.invokeLLMStream.mockResolvedValue(makeStream([
      {
        done: false,
        value: encode(
          'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n'
        ),
      },
      {
        done: true,
        beforeReturn: () => req.emit("close"),
      },
    ]));

    const { handleStreamChat } = await import("./streamChat");
    await handleStreamChat(req, res);

    expect(mocks.createMessage).toHaveBeenCalledTimes(1);
    expect(mocks.deductCredits).not.toHaveBeenCalled();
    expect(writes.join("")).toContain("未完成");
    expect(writes.join("")).toContain("未扣费");
  });

  it("does not save an assistant response or charge for an empty completed stream", async () => {
    const req = makeRequest();
    const { res, writes } = makeResponse();
    mocks.invokeLLMStream.mockResolvedValue(makeStream([
      { done: false, value: encode("data: [DONE]\n\n") },
      { done: true },
    ]));

    const { handleStreamChat } = await import("./streamChat");
    await handleStreamChat(req, res);

    expect(mocks.createMessage).toHaveBeenCalledTimes(1);
    expect(mocks.deductCredits).not.toHaveBeenCalled();
    expect(writes.join("")).toContain("未完成");
    expect(writes.join("")).toContain("未扣费");
  });
});
