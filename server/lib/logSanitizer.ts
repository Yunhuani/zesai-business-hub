const SECRET_FIELD_PATTERN =
  /(^|_|\b)(password|passwd|pwd|token|secret|api[_-]?key|authorization|cookie|session|signature|ciphertext|privatekey|private_key|databaseurl|database_url|connectionstring|connection_string)(_|$|\b)/i;
const PII_FIELD_PATTERN = /(^|_|\b)(email|openid|open_id|phone|mobile)(_|$|\b)/i;

const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
const PHONE_PATTERN = /\b1[3-9]\d{9}\b/g;
const JWT_PATTERN = /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
const DATABASE_URL_PATTERN = /\b(?:mysql|postgres(?:ql)?):\/\/[^\s'"`]+/gi;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const QUERY_SECRET_PATTERN =
  /([?&](?:access_token|token|secret|key|signature|code)=)[^&\s]+/gi;

export function sanitizeLogString(value: string): string {
  return value
    .replace(BEARER_PATTERN, "Bearer [REDACTED_TOKEN]")
    .replace(JWT_PATTERN, "[REDACTED_TOKEN]")
    .replace(DATABASE_URL_PATTERN, "[REDACTED_DATABASE_URL]")
    .replace(QUERY_SECRET_PATTERN, "$1[REDACTED]")
    .replace(EMAIL_PATTERN, "[REDACTED_EMAIL]")
    .replace(PHONE_PATTERN, "[REDACTED_PHONE]");
}

export function sanitizeForLog(value: unknown, seen = new WeakSet<object>()): unknown {
  if (typeof value === "string") {
    return sanitizeLogString(value);
  }

  if (value === null || typeof value !== "object") {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeLogString(value.message),
      stack: value.stack ? sanitizeLogString(value.stack) : undefined,
    };
  }

  if (seen.has(value)) {
    return "[Circular]";
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item => sanitizeForLog(item, seen));
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => {
      if (SECRET_FIELD_PATTERN.test(key)) {
        return [key, "[REDACTED]"];
      }
      if (PII_FIELD_PATTERN.test(key)) {
        return [key, "[REDACTED_PII]"];
      }
      return [key, sanitizeForLog(item, seen)];
    })
  );
}

export function maskEmail(email: string | null | undefined): string {
  if (!email) return "[missing]";
  const [name, domain] = email.split("@");
  if (!domain) return "[REDACTED_EMAIL]";
  return `${name.slice(0, 2)}***@${domain}`;
}

export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return "[missing]";
  return phone.replace(/^(\d{3})\d+(\d{2})$/, "$1****$2");
}
