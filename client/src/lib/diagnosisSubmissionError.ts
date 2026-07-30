export interface DiagnosisInsufficientCredits {
  required: number;
  current: number;
  missing: number;
}

export function parseDiagnosisInsufficientCredits(
  error: unknown
): DiagnosisInsufficientCredits | null {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string"
        ? error.message
        : null;
  if (!message) return null;

  try {
    const payload = JSON.parse(message) as Record<string, unknown>;
    if (
      payload.error !== "INSUFFICIENT_CREDITS" ||
      typeof payload.required !== "number" ||
      typeof payload.current !== "number" ||
      typeof payload.missing !== "number"
    ) {
      return null;
    }

    return {
      required: payload.required,
      current: payload.current,
      missing: payload.missing,
    };
  } catch {
    return null;
  }
}
