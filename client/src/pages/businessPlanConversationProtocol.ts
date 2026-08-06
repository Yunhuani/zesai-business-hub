export function resolveBusinessPlanSingleOption(
  reply: string,
  options: readonly string[]
): string | null {
  const trimmed = reply.trim();
  const letterIndex = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".indexOf(trimmed.toUpperCase());

  if (letterIndex >= 0 && letterIndex < options.length) return options[letterIndex];
  return options.includes(trimmed) ? trimmed : null;
}
