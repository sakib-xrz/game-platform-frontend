const STORAGE_KEY = "greedy.dev.player_user_id";
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
    return normalizeUserId(window.sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return "";
  }
}

/** True in local development builds — never show the switcher in production. */
export function isDevPlayerIdentityEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * Resolve order: `?user=` → sessionStorage → NEXT_PUBLIC_DEV_USER_ID → empty.
 * Identity is set once when the WebView opens (home URL with ?user=).
 * After that, sessionStorage keeps it for every game page in this tab.
 */
export function getPlayerUserId(): string {
  const fromQuery = readQueryUserId();
  if (fromQuery) {
    writeStoredUserId(fromQuery);
    // Drop ?user= from the visible URL after capturing identity (home + games).
    if (typeof window !== "undefined") {
      try {
        const url = new URL(window.location.href);
        if (url.searchParams.has("user")) {
          url.searchParams.delete("user");
          const next = `${url.pathname}${url.search}${url.hash}`;
          window.history.replaceState(window.history.state, "", next);
        }
      } catch {
        // Ignore URL cleanup failures.
      }
    }
    return fromQuery;
  }

  const fromStorage = readStoredUserId();
  if (fromStorage) return fromStorage;

  return ENV_USER_ID;
}

function writeStoredUserId(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (userId) {
      window.sessionStorage.setItem(STORAGE_KEY, userId);
    } else {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore quota / private-mode failures; identity still works for this request via return value.
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
