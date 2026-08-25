const SESSION_KEY = "greedy.player_user_id";
/** localStorage backup — some WebViews drop sessionStorage across navigations. */
const LOCAL_KEY = "greedy.player_user_id";
const ENV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID?.trim() || "";

export const DEV_PLAYER_PRESETS = [
  "user-001",
  "user-002",
  "user-003",
  "user-004",
  "user-005",
] as const;

function normalizeUserId(value: string | null | undefined): string {
  return value?.trim().slice(0, 128) || "";
}

/** Read `?user=` from a Server Component `searchParams` value. */
export function userIdFromSearchParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeUserId(raw);
}

function readQueryUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    return normalizeUserId(new URLSearchParams(window.location.search).get("user"));
  } catch {
    return "";
  }
}

function readStoredUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      normalizeUserId(window.sessionStorage.getItem(SESSION_KEY)) ||
      normalizeUserId(window.localStorage.getItem(LOCAL_KEY)) ||
      // Legacy key from earlier builds
      normalizeUserId(window.sessionStorage.getItem("greedy.dev.player_user_id"))
    );
  } catch {
    return "";
  }
}

function writeStoredUserId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.sessionStorage.setItem(SESSION_KEY, userId);
      window.localStorage.setItem(LOCAL_KEY, userId);
    } else {
      window.sessionStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(LOCAL_KEY);
    }
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function stripUserFromUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("user")) return;
    url.searchParams.delete("user");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  } catch {
    // Ignore URL cleanup failures.
  }
}

/** True in local development builds — never show the switcher in production. */
export function isDevPlayerIdentityEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Capture `?user=` into storage as soon as the WebView opens.
 * Call this on every page (layout bootstrap) before navigating to a game.
 */
export function capturePlayerIdentity(): string {
  const fromQuery = readQueryUserId();
  if (fromQuery) {
    writeStoredUserId(fromQuery);
    stripUserFromUrl();
    return fromQuery;
  }
  return readStoredUserId() || ENV_USER_ID;
}

/**
 * Resolve order: `?user=` → session/local storage → NEXT_PUBLIC_DEV_USER_ID → empty.
 */
export function getPlayerUserId(): string {
  return capturePlayerIdentity();
}

/**
 * Append `?user=` so full page / WebView navigations keep identity.
 * Do not call during render with the default user id — that reads `window` on
 * the client and hydrates differently from the server. Use `usePlayerHref`.
 */
export function withPlayerQuery(href: string, userId = getPlayerUserId()): string {
  if (!href || !userId) return href;
  try {
    const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://local");
    url.searchParams.set("user", userId);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const join = href.includes("?") ? "&" : "?";
    return `${href}${join}user=${encodeURIComponent(userId)}`;
  }
}

/** Persist the player id for this tab and sync `?user=` on the current URL. */
export function setPlayerUserId(userId: string): string {
  const next = normalizeUserId(userId);
  writeStoredUserId(next);

  if (typeof window !== "undefined") {
    try {
      const url = new URL(window.location.href);
      if (next) {
        url.searchParams.set("user", next);
      } else {
        url.searchParams.delete("user");
      }
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch {
      // Ignore URL sync failures.
    }
  }

  return next;
}

/** Env fallback only — prefer `getPlayerUserId()` for requests. */
export { ENV_USER_ID as DEV_USER_ID };
