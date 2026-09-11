const RETURN_KEY = "artistrysynk_auth_return";

export function sanitizeAuthReturn(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/discover";
  try {
    const parsed = new URL(value, "https://artistrysynk.app");
    if (parsed.origin !== "https://artistrysynk.app") return "/discover";
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return "/discover";
  }
}

export function rememberAuthReturn(path: string) {
  try { window.sessionStorage.setItem(RETURN_KEY, sanitizeAuthReturn(path)); } catch { /* unavailable */ }
}

export function consumeAuthReturn(fallback = "/discover") {
  try {
    const value = window.sessionStorage.getItem(RETURN_KEY);
    window.sessionStorage.removeItem(RETURN_KEY);
    return sanitizeAuthReturn(value ?? fallback);
  } catch {
    return sanitizeAuthReturn(fallback);
  }
}