const toBigIntSafe = (value: string | number | bigint | null | undefined): bigint => {
  if (value === null || value === undefined || value === "") return 0n;
  try {
    return BigInt(value);
  } catch {
    return 0n;
  }
};

const trimTrailingZeros = (whole: bigint, frac: bigint, digits: number): string => {
  if (frac <= 0n) return whole.toString();
  const padded = frac.toString().padStart(digits, "0").replace(/0+$/, "");
  return padded ? `${whole}.${padded}` : whole.toString();
};

const formatCompactAbs = (abs: bigint): string => {
  if (abs >= 1_000_000_000n) {
    const whole = abs / 1_000_000_000n;
    const frac = (abs % 1_000_000_000n) / 10_000_000n;
    return `${trimTrailingZeros(whole, frac, 2)}B`;
  }
  if (abs >= 1_000_000n) {
    const whole = abs / 1_000_000n;
    const frac = (abs % 1_000_000n) / 10_000n;
    return `${trimTrailingZeros(whole, frac, 2)}M`;
  }
  return abs.toLocaleString("en-US");
};

/** Compact earnings for list rows: `520,000` or `1.2M`. */
export function formatLeaderboardEarnings(
  value: string | number | bigint | null | undefined,
): string {
  const amount = toBigIntSafe(value);
  const sign = amount < 0n ? "-" : "";
  const abs = amount < 0n ? -amount : amount;
  return `${sign}${formatCompactAbs(abs)}`;
}

/** Podium profit label: `+1.45M Coins` / `-12,500 Coins`. */
export function formatLeaderboardProfit(
  value: string | number | bigint | null | undefined,
): string {
  const amount = toBigIntSafe(value);
  const abs = amount < 0n ? -amount : amount;
  const compact = formatCompactAbs(abs);
  if (amount > 0n) return `+${compact} Coins`;
  if (amount < 0n) return `-${compact} Coins`;
  return `0 Coins`;
}

export function formatLeaderboardWins(winCount: number): string {
  const safe = Number.isFinite(winCount) ? Math.max(0, Math.floor(winCount)) : 0;
  return `${safe.toLocaleString("en-US")} ${safe === 1 ? "Win" : "Wins"}`;
}

export function formatResetCountdown(remainingMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}
