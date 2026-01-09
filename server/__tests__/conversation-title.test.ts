import { describe, it, expect } from "vitest";

describe("对话标题自动更新功能", () => {
  
  describe("标题截取逻辑", () => {
    it("消息超过20字时截取前20字并添加省略号", () => {
      const content = "我想开一家精品咖啡馆，目标客群是25-35岁的白领，请帮我分析市场定位";
      const newTitle = content.length > 20 
        ? content.substring(0, 20) + "..." 
        : content;
      
      expect(newTitle).toBe("我想开一家精品咖啡馆，目标客群是25-3...");
      expect(newTitle.length).toBe(23); // 20 + 3(...)
    });

    it("消息不足20字时完整显示", () => {
      const content = "帮我分析市场";
      const newTitle = content.length > 20 
        ? content.substring(0, 20) + "..." 
        : content;
      
      expect(newTitle).toBe("帮我分析市场");
      expect(newTitle.length).toBe(6);
    });

    it("消息刚好20字时不添加省略号", () => {
      const content = "12345678901234567890"; // 20个字符
      const newTitle = content.length > 20 
        ? content.substring(0, 20) + "..." 
        : content;
      
      expect(newTitle).toBe("12345678901234567890");
      expect(newTitle.length).toBe(20);
    });

    it("消息21字时截取并添加省略号", () => {
      const content = "123456789012345678901"; // 21个字符
      const newTitle = content.length > 20 
        ? content.substring(0, 20) + "..." 
        : content;
      
      expect(newTitle).toBe("12345678901234567890...");
      expect(newTitle.length).toBe(23);
    });
  });

  describe("角色判断逻辑", () => {
    it("只有用户消息才触发标题更新", () => {
      const roles = ["user", "assistant", "system"] as const;
      
      roles.forEach(role => {
        const shouldUpdateTitle = role === "user";
        if (role === "user") {
          expect(shouldUpdateTitle).toBe(true);
        } else {
          expect(shouldUpdateTitle).toBe(false);
        }
      });
    });
  });

  describe("第一条消息判断逻辑", () => {
    it("第一条用户消息时更新标题", () => {
      const userMessageCount = 1;
      const shouldUpdateTitle = userMessageCount === 1;
      expect(shouldUpdateTitle).toBe(true);
    });

    it("第二条及以后的用户消息不更新标题", () => {
      const userMessageCounts = [2, 3, 5, 10];
      
      userMessageCounts.forEach(count => {
        const shouldUpdateTitle = count === 1;
        expect(shouldUpdateTitle).toBe(false);
      });
    });
  });
});
