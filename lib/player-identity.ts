const SESSION_KEY = "greedy.player_user_id";
const LOCAL_KEY = "greedy.player_user_id";
const TOKEN_KEY = "greedy.player_token";
const APP_KEY = "greedy.player_app";
const USER_PROFILE_KEY = "greedy.player_profile";

const ENV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID?.trim() || "";

export type PlayerProfile = {
  userId: string;
  externalUserId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  walletMode?: 'local' | 'seamless';
  appKey?: string;
};

function normalizeString(value: string | null | undefined, max = 512): string {
  return value?.trim().slice(0, max) || "";
}

/** Read `?user=` from a Server Component `searchParams` value. */
export function userIdFromSearchParam(value: string | string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return normalizeString(raw, 128);
}

function parseJwtClaims(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[1]) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    return JSON.parse(decodeURIComponent(escape(window.atob(base64))));
  } catch {
    return null;
  }
}

export function getPlayerToken(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      normalizeString(window.sessionStorage.getItem(TOKEN_KEY), 2048) ||
      normalizeString(window.localStorage.getItem(TOKEN_KEY), 2048)
    );
  } catch {
    return "";
  }
}

export function getPlayerApp(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      normalizeString(window.sessionStorage.getItem(APP_KEY), 128) ||
      normalizeString(window.localStorage.getItem(APP_KEY), 128)
    );
  } catch {
    return "";
  }
}

export function getPlayerProfile(): PlayerProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(USER_PROFILE_KEY) || window.localStorage.getItem(USER_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  if (typeof window === "undefined") return;
  try {
    const serialized = JSON.stringify(profile);
    window.sessionStorage.setItem(USER_PROFILE_KEY, serialized);
    window.localStorage.setItem(USER_PROFILE_KEY, serialized);
  } catch {
    // Ignore
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
    // Ignore
  }
}

function readStoredUserId(): string {
  if (typeof window === "undefined") return "";
  try {
    return (
      normalizeString(window.sessionStorage.getItem(SESSION_KEY)) ||
      normalizeString(window.localStorage.getItem(LOCAL_KEY)) ||
      normalizeString(window.sessionStorage.getItem("greedy.dev.player_user_id"))
    );
  } catch {
    return "";
  }
}

/**
 * Capture ?token=, ?app=, or ?user= into storage as soon as the WebView opens.
 */
export function capturePlayerIdentity(): string {
  if (typeof window === "undefined") return ENV_USER_ID;

  try {
    const searchParams = new URLSearchParams(window.location.search);
    const fromToken = searchParams.get("token");
    const fromApp = searchParams.get("app");
    const fromUser = searchParams.get("user");

    let needsUrlCleanup = false;

    if (fromToken) {
      const cleanToken = fromToken.trim();
      window.sessionStorage.setItem(TOKEN_KEY, cleanToken);
      window.localStorage.setItem(TOKEN_KEY, cleanToken);

      const claims = parseJwtClaims(cleanToken);
      if (claims?.sub) {
        writeStoredUserId(claims.sub);
        savePlayerProfile({
          userId: claims.sub,
          externalUserId: claims.sub,
          displayName: claims.username,
          avatarUrl: claims.avatarUrl,
          appKey: fromApp || claims.app,
        });
      }
      needsUrlCleanup = true;
    }

    if (fromApp) {
      const cleanApp = fromApp.trim();
      window.sessionStorage.setItem(APP_KEY, cleanApp);
      window.localStorage.setItem(APP_KEY, cleanApp);
      needsUrlCleanup = true;
    }

    if (fromUser && !fromToken) {
      const cleanUser = normalizeString(fromUser);
      writeStoredUserId(cleanUser);
      needsUrlCleanup = true;
    }

    if (needsUrlCleanup) {
      const url = new URL(window.location.href);
      url.searchParams.delete("user");
      // Keep token/app in URL if needed or clean up cleanly
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    }
  } catch {
    // Ignore
  }

  return readStoredUserId() || ENV_USER_ID;
}

export function getPlayerUserId(): string {
  return capturePlayerIdentity();
}

export function withPlayerQuery(href: string, userId = getPlayerUserId()): string {
  if (!href) return href;
  const token = getPlayerToken();
  const app = getPlayerApp();

  try {
    const url = new URL(href, typeof window !== "undefined" ? window.location.origin : "http://local");
    if (token) url.searchParams.set("token", token);
    if (app) url.searchParams.set("app", app);
    if (userId && !token) url.searchParams.set("user", userId);
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}
