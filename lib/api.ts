import type { BetRequest, BetResponse, GreedySnapshot } from "@/types/greedy";
import type {
  BetRequest as TeenPattiBetRequest,
  BetResponse as TeenPattiBetResponse,
  TeenPattiSnapshot,
} from "@/types/teen-patti";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api/v1").replace(/\/$/, "");
const DEV_USER_ID = process.env.NEXT_PUBLIC_DEV_USER_ID?.trim();
const BET_REQUEST_TIMEOUT_MS = 12_000;

type ApiEnvelope<T> = {
  statusCode?: number;
  success: boolean;
  message?: string | null;
  data: T;
  errors?: string[];
  timestamp?: string;
};

export class ApiError extends Error {
  status: number;
  details?: string[];

  constructor(message: string, status: number, details?: string[]) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

function playerHeaders(): HeadersInit {
  return DEV_USER_ID ? { "X-User-Id": DEV_USER_ID } : {};
}

async function request<T>(path: string, init: RequestInit = {}, timeoutMs = 8_000): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...playerHeaders(),
        ...init.headers,
      },
      signal: controller.signal,
    });

    let body: ApiEnvelope<T> | { message?: string; errors?: string[] } | null = null;
    try {
      body = (await response.json()) as ApiEnvelope<T>;
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message = body?.message || `Request failed (${response.status})`;
      throw new ApiError(message, response.status, body?.errors);
    }

    if (!body || !("data" in body)) {
      throw new ApiError("Backend returned an invalid response", response.status);
    }

    return body.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted || (error instanceof DOMException && error.name === "AbortError")) {
      throw new ApiError("Request timed out. Check your connection and try again.", 408);
    }
    throw new ApiError(error instanceof Error ? error.message : "Network request failed", 0);
  } finally {
    window.clearTimeout(timeout);
  }
}

export const greedyApi = {
  getSnapshot: () => request<GreedySnapshot>("/games/greedy/snapshot"),

  placeBet: (payload: BetRequest) =>
    request<BetResponse>("/games/greedy/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, BET_REQUEST_TIMEOUT_MS),
};

export const teenPattiApi = {
  getSnapshot: () => request<TeenPattiSnapshot>("/games/teen-patti/snapshot"),

  placeBet: (payload: TeenPattiBetRequest) =>
    request<TeenPattiBetResponse>("/games/teen-patti/bets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }, BET_REQUEST_TIMEOUT_MS),
};

export { API_BASE_URL, DEV_USER_ID };
