import { describe, expect, it } from "vitest";
import { agents } from "./agents";

describe("unified agent catalog", () => {
  it("contains the eight unique agents used by the home page and toolbox", () => {
    expect(agents).toHaveLength(8);
    expect(new Set(agents.map(agent => agent.id)).size).toBe(8);
    expect(agents.filter(agent => agent.homeCard)).toHaveLength(4);
    expect(agents.filter(agent => agent.toolboxCategory)).toHaveLength(8);
  });

  it("keeps only NBG and business plan live with their existing start paths", () => {
    expect(agents.filter(agent => agent.status === "live")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "nbg-diagnosis", startPath: "/diagnosis/conversation" }),
        expect.objectContaining({ id: "business-plan", startPath: "/business-plan/conversation" }),
      ])
    );
    expect(agents.filter(agent => agent.status === "live")).toHaveLength(2);
    expect(agents.filter(agent => agent.status === "upcoming")).toHaveLength(6);
  });
});
