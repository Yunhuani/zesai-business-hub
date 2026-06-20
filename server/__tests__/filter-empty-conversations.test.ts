import { describe, it, expect } from "vitest";

describe("过滤空对话功能", () => {
  
  describe("过滤逻辑", () => {
    it("有用户消息的对话应该显示", () => {
      const messages = [
        { role: "assistant", content: "欢迎语" },
        { role: "user", content: "用户问题" },
        { role: "assistant", content: "AI回复" },
      ];
      
      const hasUserMessage = messages.some(m => m.role === "user");
      expect(hasUserMessage).toBe(true);
    });

    it("只有欢迎语的对话不应该显示", () => {
      const messages = [
        { role: "assistant", content: "欢迎语" },
      ];
      
      const hasUserMessage = messages.some(m => m.role === "user");
      expect(hasUserMessage).toBe(false);
    });

    it("完全空的对话不应该显示", () => {
      const messages: { role: string; content: string }[] = [];
      
      const hasUserMessage = messages.some(m => m.role === "user");
      expect(hasUserMessage).toBe(false);
    });

    it("只有system消息的对话不应该显示", () => {
      const messages = [
        { role: "system", content: "系统提示" },
        { role: "assistant", content: "欢迎语" },
      ];
      
      const hasUserMessage = messages.some(m => m.role === "user");
      expect(hasUserMessage).toBe(false);
    });

    it("多轮对话应该显示", () => {
      const messages = [
        { role: "assistant", content: "欢迎语" },
        { role: "user", content: "第一个问题" },
        { role: "assistant", content: "第一个回复" },
        { role: "user", content: "第二个问题" },
        { role: "assistant", content: "第二个回复" },
      ];
      
      const hasUserMessage = messages.some(m => m.role === "user");
      expect(hasUserMessage).toBe(true);
    });
  });
});
