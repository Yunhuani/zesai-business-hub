import type { DiagnosisDraft } from "@shared/diagnosisDraft";

export type {
  DiagnosisDraft,
  DiagnosisDraftAnswer,
  FinanceRowAnswer,
} from "@shared/diagnosisDraft";

const DIAGNOSIS_DRAFT_KEY = "zesai-diagnosis-draft-v1";

export function loadDiagnosisDraft(
  storage: Storage = localStorage
): DiagnosisDraft | null {
  try {
    const raw = storage.getItem(DIAGNOSIS_DRAFT_KEY);
    return raw ? JSON.parse(raw) as DiagnosisDraft : null;
  } catch {
    return null;
  }
}

export function saveDiagnosisDraft(
  draft: DiagnosisDraft,
  storage: Storage = localStorage
) {
  storage.setItem(DIAGNOSIS_DRAFT_KEY, JSON.stringify(draft));
}

export function clearDiagnosisDraft(storage: Storage = localStorage) {
  storage.removeItem(DIAGNOSIS_DRAFT_KEY);
}
