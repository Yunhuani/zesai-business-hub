import type { DiagnosisDraft } from "./diagnosisDraft";

type HydrateDiagnosisDraftOptions = {
  isAuthenticated: boolean;
  localDraft: DiagnosisDraft | null;
  loadServerDraft: () => Promise<DiagnosisDraft | null>;
  saveServerDraft: (draft: DiagnosisDraft) => Promise<void>;
  saveLocalDraft: (draft: DiagnosisDraft) => void;
};

export function hasDiagnosisDraftContent(draft: DiagnosisDraft): boolean {
  if ((draft.conversationUnitIndex ?? 0) > 0) return true;

  const hasAnswer = Object.values(draft.answers).some(value => {
    if (typeof value === "string") return value.trim().length > 0;
    return value.length > 0;
  });
  if (hasAnswer) return true;

  return Object.values(draft.customValues).some(value => value.trim().length > 0);
}

export async function hydrateDiagnosisDraft({
  isAuthenticated,
  localDraft,
  loadServerDraft,
  saveServerDraft,
  saveLocalDraft,
}: HydrateDiagnosisDraftOptions): Promise<DiagnosisDraft | null> {
  if (!isAuthenticated) return localDraft;

  let serverDraft: DiagnosisDraft | null;
  try {
    serverDraft = await loadServerDraft();
  } catch {
    return localDraft;
  }

  if (serverDraft) {
    saveLocalDraft(serverDraft);
    return serverDraft;
  }

  if (localDraft && hasDiagnosisDraftContent(localDraft)) {
    try {
      await saveServerDraft(localDraft);
    } catch {
      // Local storage remains the durable fallback for this session.
    }
  }

  return localDraft;
}

export type DiagnosisDraftSaveQueue = {
  setEnabled: (enabled: boolean) => void;
  schedule: (draft: DiagnosisDraft) => void;
  cancelScheduled: () => void;
  waitForPending: () => Promise<void>;
};

export function createDiagnosisDraftSaveQueue(
  save: (draft: DiagnosisDraft) => Promise<void>,
  delayMs: number
): DiagnosisDraftSaveQueue {
  let enabled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queuedDraft: DiagnosisDraft | null = null;
  let pendingSave = Promise.resolve();

  const cancelScheduled = () => {
    if (timer) clearTimeout(timer);
    timer = undefined;
    queuedDraft = null;
  };

  return {
    setEnabled(nextEnabled) {
      enabled = nextEnabled;
      if (!enabled) cancelScheduled();
    },
    schedule(draft) {
      if (!enabled || !hasDiagnosisDraftContent(draft)) return;
      if (timer) clearTimeout(timer);
      queuedDraft = draft;
      timer = setTimeout(() => {
        timer = undefined;
        const nextDraft = queuedDraft;
        queuedDraft = null;
        if (!nextDraft) return;
        pendingSave = pendingSave
          .catch(() => undefined)
          .then(() => save(nextDraft))
          .catch(() => undefined);
      }, delayMs);
    },
    cancelScheduled,
    waitForPending: () => pendingSave,
  };
}
