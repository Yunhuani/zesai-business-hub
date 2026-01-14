import { describe, it, expect } from "vitest";

describe("Security Fixes", () => {
  describe("Agent systemPrompt protection", () => {
    it("getAllAgents should not return systemPrompt field", async () => {
      const { getAllAgents } = await import("../db");
      const agents = await getAllAgents();
      
      if (agents.length > 0) {
        const agent = agents[0];
        // 验证返回的字段中不包含 systemPrompt
        expect(agent).not.toHaveProperty("systemPrompt");
        // 验证返回了必要的公开字段
        expect(agent).toHaveProperty("id");
        expect(agent).toHaveProperty("name");
        expect(agent).toHaveProperty("description");
        expect(agent).toHaveProperty("icon");
        expect(agent).toHaveProperty("welcomeMessage");
        expect(agent).toHaveProperty("inputFields");
      }
    });

    it("getAgentById should not return systemPrompt field", async () => {
      const { getAgentById, getAllAgents } = await import("../db");
      const agents = await getAllAgents();
      
      if (agents.length > 0) {
        const agent = await getAgentById(agents[0].id);
        expect(agent).not.toBeUndefined();
        // 验证返回的字段中不包含 systemPrompt
        expect(agent).not.toHaveProperty("systemPrompt");
        // 验证返回了必要的公开字段
        expect(agent).toHaveProperty("id");
        expect(agent).toHaveProperty("name");
        expect(agent).toHaveProperty("description");
      }
    });

    it("getAgentByIdFull should return systemPrompt field for internal use", async () => {
      const { getAgentByIdFull, getAllAgents } = await import("../db");
      const agents = await getAllAgents();
      
      if (agents.length > 0) {
        const agent = await getAgentByIdFull(agents[0].id);
        expect(agent).not.toBeUndefined();
        // 内部函数应该返回完整数据包括 systemPrompt
        expect(agent).toHaveProperty("systemPrompt");
      }
    });
  });

  describe("Conversation access control", () => {
    it("getConversationById returns conversation with userId for authorization check", async () => {
      const { getConversationById, getUserConversations } = await import("../db");
      
      // 使用一个已知存在的用户ID来获取对话
      const conversations = await getUserConversations(1);
      
      if (conversations.length > 0) {
        const conversation = await getConversationById(conversations[0].id);
        expect(conversation).not.toBeUndefined();
        // 验证返回了 userId 字段用于权限校验
        expect(conversation).toHaveProperty("userId");
      }
    });
  });
});
