import { afterEach, describe, expect, it, vi } from "vitest";
import type { DiagnosisDraft } from "../client/src/lib/diagnosisDraft";
import {
  createDiagnosisDraftSaveQueue,
  hydrateDiagnosisDraft,
  hasDiagnosisDraftContent,
} from "../client/src/lib/diagnosisDraftSync";

const localDraft: DiagnosisDraft = {
  stepIndex: 1,
  conversationUnitIndex: 2,
  answers: { "company.name": "本地公司" },
  customValues: {},
};

const serverDraft: DiagnosisDraft = {
  stepIndex: 3,
  conversationUnitIndex: 7,
  answers: { "company.name": "服务端公司" },
  customValues: { industry: "软件" },
};

describe("diagnosis draft hydration", () => {
  it("uses the server draft first and mirrors it to local storage", async () => {
    const loadServerDraft = vi.fn(async () => serverDraft);
    const saveServerDraft = vi.fn(async () => undefined);
    const saveLocalDraft = vi.fn();

    await expect(hydrateDiagnosisDraft({
      isAuthenticated: true,
      localDraft,
      loadServerDraft,
      saveServerDraft,
      saveLocalDraft,
    })).resolves.toEqual(serverDraft);

    expect(saveLocalDraft).toHaveBeenCalledWith(serverDraft);
    expect(saveServerDraft).not.toHaveBeenCalled();
  });

  it("uses a local draft and syncs it once when the server has none", async () => {
    const loadServerDraft = vi.fn(async () => null);
    const saveServerDraft = vi.fn(async () => undefined);

    await expect(hydrateDiagnosisDraft({
      isAuthenticated: true,
      localDraft,
      loadServerDraft,
      saveServerDraft,
      saveLocalDraft: vi.fn(),
    })).resolves.toEqual(localDraft);

    expect(saveServerDraft).toHaveBeenCalledTimes(1);
    expect(saveServerDraft).toHaveBeenCalledWith(localDraft);
  });

  it("does not call any server draft API for an unauthenticated user", async () => {
    const loadServerDraft = vi.fn(async () => serverDraft);
    const saveServerDraft = vi.fn(async () => undefined);

    await expect(hydrateDiagnosisDraft({
      isAuthenticated: false,
      localDraft,
      loadServerDraft,
      saveServerDraft,
      saveLocalDraft: vi.fn(),
    })).resolves.toEqual(localDraft);

    expect(loadServerDraft).not.toHaveBeenCalled();
    expect(saveServerDraft).not.toHaveBeenCalled();
  });

  it("falls back to local storage when loading the server draft fails", async () => {
    await expect(hydrateDiagnosisDraft({
      isAuthenticated: true,
      localDraft,
      loadServerDraft: vi.fn(async () => { throw new Error("offline"); }),
      saveServerDraft: vi.fn(async () => undefined),
      saveLocalDraft: vi.fn(),
    })).resolves.toEqual(localDraft);
  });
});

describe("diagnosis draft save queue", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("coalesces changes into one trailing save after 700ms", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => undefined);
    const queue = createDiagnosisDraftSaveQueue(save, 700);
    queue.setEnabled(true);

    queue.schedule(localDraft);
    await vi.advanceTimersByTimeAsync(400);
    queue.schedule(serverDraft);
    await vi.advanceTimersByTimeAsync(699);
    expect(save).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await queue.waitForPending();
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(serverDraft);
  });

  it("does not save before hydration enables synchronization", async () => {
    vi.useFakeTimers();
    const save = vi.fn(async () => undefined);
    const queue = createDiagnosisDraftSaveQueue(save, 700);

    queue.schedule(localDraft);
    await vi.advanceTimersByTimeAsync(700);
    expect(save).not.toHaveBeenCalled();

    queue.setEnabled(true);
    queue.schedule(serverDraft);
    await vi.advanceTimersByTimeAsync(700);
    await queue.waitForPending();
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("cancels a scheduled save and waits for an in-flight save before submit", async () => {
    vi.useFakeTimers();
    let releaseSave: (() => void) | undefined;
    const save = vi.fn(() => new Promise<void>(resolve => { releaseSave = resolve; }));
    const queue = createDiagnosisDraftSaveQueue(save, 700);
    queue.setEnabled(true);

    queue.schedule(localDraft);
    await vi.advanceTimersByTimeAsync(700);
    queue.schedule(serverDraft);
    queue.cancelScheduled();

    let settled = false;
    const pending = queue.waitForPending().then(() => { settled = true; });
    await Promise.resolve();
    expect(settled).toBe(false);

    releaseSave?.();
    await pending;
    expect(save).toHaveBeenCalledTimes(1);
  });

  it("does not consider an empty draft meaningful for server persistence", () => {
    expect(hasDiagnosisDraftContent({
      stepIndex: 0,
      conversationUnitIndex: 0,
      answers: {},
      customValues: {},
    })).toBe(false);
    expect(hasDiagnosisDraftContent(localDraft)).toBe(true);
  });
});
