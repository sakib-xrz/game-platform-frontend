export const formatInteger = (value: string | number | bigint | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0";
  try {
    return BigInt(value).toLocaleString("en-US");
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
    if (n % d === 0n) return `${n / d}×`;
    return `${numerator}/${denominator}×`;
  } catch {
    return "—";
  }
};
