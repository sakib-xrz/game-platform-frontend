export const formatInteger = (value: string | number | bigint | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0";
  try {
    return BigInt(value).toLocaleString("en-US");
  } catch {
    return String(value);
  }
};

/** Compact coin display for tight UI labels (e.g. POT: 10.7K). */
export const formatCompactAmount = (value: string | number | bigint | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0";
  try {
    const amount = BigInt(value);
    if (amount === 0n) return "0";
    if (amount >= 1_000_000_000n) {
      const whole = amount / 1_000_000_000n;
      const frac = (amount % 1_000_000_000n) / 100_000_000n;
      return frac > 0n ? `${whole}.${frac}B` : `${whole}B`;
    }
    if (amount >= 1_000_000n) {
      const whole = amount / 1_000_000n;
      const frac = (amount % 1_000_000n) / 100_000n;
      return frac > 0n ? `${whole}.${frac}M` : `${whole}M`;
    }
    if (amount >= 1_000n) {
      const whole = amount / 1_000n;
      const frac = (amount % 1_000n) / 100n;
      return frac > 0n ? `${whole}.${frac}K` : `${whole}K`;
    }
    return amount.toLocaleString("en-US");
  } catch {
    return String(value);
  }
};

export const addIntegerStrings = (...values: Array<string | null | undefined>): string => {
  return values.reduce<bigint>((total, value) => {
    try {
      return total + BigInt(value ?? "0");
    } catch {
      return total;
    }
  }, 0n).toString();
};

export const multiplyRational = (amount: string, numerator: string, denominator: string): string => {
  try {
    const d = BigInt(denominator);
    if (d === 0n) return "0";
    return ((BigInt(amount) * BigInt(numerator)) / d).toString();
  } catch {
    return "0";
  }
};

export const formatMultiplier = (numerator: string, denominator: string): string => {
  try {
    const n = BigInt(numerator);
    const d = BigInt(denominator);
    if (d === 0n) return "—";
    if (n % d === 0n) return `${n / d}x`;
    return `${numerator}/${denominator}x`;
  } catch {
    return "—";
  }
};
