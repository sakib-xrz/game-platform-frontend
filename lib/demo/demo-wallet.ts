import type { Wallet } from "@/types/greedy";

const STORAGE_KEY = "game-platform.demo.wallet";
export const DEMO_WALLET_START = 100_000n;
const DEMO_USER_ID = "demo-player";

export const DEMO_PLAYER = {
  user_id: DEMO_USER_ID,
  display_name: "You",
  avatar_url: null,
} as const;

export function readDemoBalance(): bigint {
  if (typeof window === "undefined") return DEMO_WALLET_START;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return DEMO_WALLET_START;
    const value = BigInt(raw);
    return value < 0n ? 0n : value;
  } catch {
    return DEMO_WALLET_START;
  }
}

export function writeDemoBalance(next: bigint): bigint {
  const balance = next < 0n ? 0n : next;
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, balance.toString());
    } catch {
      // Private mode can reject storage. The in-memory balance still updates.
    }
  }
  return balance;
}

export function createDemoWallet(balance: bigint, version = 1): Wallet {
  const now = new Date().toISOString();
  return {
    id: "demo-wallet",
    user_id: DEMO_USER_ID,
    currency_id: "demo-coin",
    balance: balance.toString(),
    version,
    created_at: now,
    updated_at: now,
    currency: {
      id: "demo-coin",
      code: "COIN",
      name: "Coin",
      symbol: "●",
      is_active: true,
    },
  };
}
