const LOGIN_RETURN_KEY = "zesai-login-return-path";

export function rememberLoginReturnPath(
  path: string,
  storage: Storage = localStorage
) {
  if (path.startsWith("/") && !path.startsWith("//")) {
    storage.setItem(LOGIN_RETURN_KEY, path);
  }
}

export function consumeLoginReturnPath(
  storage: Storage = localStorage
): string {
  const path = storage.getItem(LOGIN_RETURN_KEY);
  storage.removeItem(LOGIN_RETURN_KEY);
  return path?.startsWith("/") && !path.startsWith("//") ? path : "/";
}
