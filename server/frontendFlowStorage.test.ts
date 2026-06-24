import { describe, expect, it } from "vitest";
import {
  clearDiagnosisDraft,
  loadDiagnosisDraft,
  saveDiagnosisDraft,
} from "../client/src/lib/diagnosisDraft";
import {
  consumeLoginReturnPath,
  rememberLoginReturnPath,
} from "../client/src/lib/loginReturn";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: key => values.get(key) ?? null,
    key: index => [...values.keys()][index] ?? null,
    removeItem: key => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("diagnosis flow storage", () => {
  it("persists and clears the questionnaire draft", () => {
    const storage = createStorage();
    const draft = {
      stepIndex: 2,
      answers: { companyName: "示例公司" },
      customValues: { industry: "机器人" },
    };

    saveDiagnosisDraft(draft, storage);
    expect(loadDiagnosisDraft(storage)).toEqual(draft);
    clearDiagnosisDraft(storage);
    expect(loadDiagnosisDraft(storage)).toBeNull();
  });

  it("consumes a safe login return path once", () => {
    const storage = createStorage();
    rememberLoginReturnPath("/diagnosis", storage);
    expect(consumeLoginReturnPath(storage)).toBe("/diagnosis");
    expect(consumeLoginReturnPath(storage)).toBe("/");
  });
});
