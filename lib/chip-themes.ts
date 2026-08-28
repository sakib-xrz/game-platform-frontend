export type ChipTheme = {
  rim: string;
  core: string;
  ink: string;
};

/**
 * Standard multi-color coin palette matching the betting tray denominations in order:
 * 10 (Cyan), 50 (Blue), 100 (Red), 500 (Pink), 1K (Violet), 5K (Gold), 10K (Orange), 50K (Green)
 */
export const CASINO_CHIP_THEMES: readonly ChipTheme[] = [
  { rim: "#22c1dc", core: "#c1f6ff", ink: "#085768" }, // 10 / cyan (aqua)
  { rim: "#38a5ea", core: "#c9ecff", ink: "#0a3c66" }, // 50 / sky blue
  { rim: "#f05151", core: "#ffd3d3", ink: "#711313" }, // 100 / coral red
  { rim: "#e354ba", core: "#ffd6f3", ink: "#681352" }, // 500 / pink
  { rim: "#8a5cf6", core: "#e6dcff", ink: "#341675" }, // 1K / violet
  { rim: "#eeb028", core: "#fff3cc", ink: "#664205" }, // 5K / gold
  { rim: "#f27024", core: "#ffe0cb", ink: "#6c2605" }, // 10K / orange
  { rim: "#27c458", core: "#c6f9d5", ink: "#0b5821" }, // 50K / emerald green
] as const;

/**
 * Determine a deterministic coin theme for a bet amount.
 * Matches by value or falls back to an index-based rotation.
 */
export function getChipThemeForAmount(
  amount: string | number | bigint | null | undefined,
  fallbackIndex = 0,
): ChipTheme {
  if (amount !== null && amount !== undefined && amount !== "") {
    try {
      const val = BigInt(amount);
      if (val <= 10n) return CASINO_CHIP_THEMES[0]!;
      if (val <= 50n) return CASINO_CHIP_THEMES[1]!;
      if (val <= 100n) return CASINO_CHIP_THEMES[2]!;
      if (val <= 500n) return CASINO_CHIP_THEMES[3]!;
      if (val <= 1_000n) return CASINO_CHIP_THEMES[4]!;
      if (val <= 5_000n) return CASINO_CHIP_THEMES[5]!;
      if (val <= 10_000n) return CASINO_CHIP_THEMES[6]!;
      return CASINO_CHIP_THEMES[7]!;
    } catch {
      // fallback to index
    }
  }
  const idx = Math.abs(fallbackIndex) % CASINO_CHIP_THEMES.length;
  return CASINO_CHIP_THEMES[idx]!;
}
