import type { CreateAdminConfigInput } from "@/types/admin";

export type ConfigValidationFailure = { field: string; message: string };
export type ConfigValidationPreview = {
  valid: boolean;
  failures: ConfigValidationFailure[];
  total_weight: string;
  theoretical_return_percent: number;
  options: Array<{ code: string; probability_percent: number; payout_contribution_percent: number }>;
};

const positive = (value: string) => /^[1-9]\d*$/.test(value);

export function validateAdminConfig(input: CreateAdminConfigInput): ConfigValidationPreview {
  const failures: ConfigValidationFailure[] = [];
  const durationRules: Array<[keyof CreateAdminConfigInput, number, number]> = [["betting_duration_ms", 3000, 120000], ["lock_duration_ms", 250, 10000], ["drawing_duration_ms", 1000, 30000], ["result_duration_ms", 1000, 30000]];
  for (const [key, min, max] of durationRules) { const value = Number(input[key]); if (!Number.isInteger(value) || value < min || value > max) failures.push({ field: key, message: `Must be between ${min} and ${max} ms` }); }
  for (const key of ["min_bet", "max_single_bet", "max_round_bet"] as const) if (!positive(input[key])) failures.push({ field: key, message: "Must be a positive integer" });
  if (positive(input.min_bet) && positive(input.max_single_bet) && BigInt(input.min_bet) > BigInt(input.max_single_bet)) failures.push({ field: "max_single_bet", message: "Must be at least the minimum bet" });
  if (positive(input.max_single_bet) && positive(input.max_round_bet) && BigInt(input.max_single_bet) > BigInt(input.max_round_bet)) failures.push({ field: "max_round_bet", message: "Must be at least the single bet maximum" });
  if (input.options.length !== 8) failures.push({ field: "options", message: "Exactly eight options are required" });
  if (new Set(input.options.map((item) => item.code)).size !== input.options.length) failures.push({ field: "options", message: "Option codes must be unique" });
  if (new Set(input.options.map((item) => item.display_order)).size !== input.options.length) failures.push({ field: "options", message: "Option display order must be unique" });
  if (input.chip_values.length < 1 || input.chip_values.length > 12) failures.push({ field: "chip_values", message: "Use one to twelve chip values" });
  if (new Set(input.chip_values.map((item) => item.amount)).size !== input.chip_values.length) failures.push({ field: "chip_values", message: "Chip values must be unique" });
  const enabled = input.options.filter((item) => item.is_enabled && positive(item.probability_weight) && positive(item.payout_numerator) && positive(item.payout_denominator));
  if (enabled.length < 2) failures.push({ field: "options", message: "At least two valid enabled options are required" });
  const totalWeight = enabled.reduce((sum, item) => sum + BigInt(item.probability_weight), 0n);
  const options = enabled.map((item) => {
    const weight = BigInt(item.probability_weight); const numerator = BigInt(item.payout_numerator); const denominator = BigInt(item.payout_denominator);
    if (totalWeight > 0n && weight * numerator > totalWeight * denominator) failures.push({ field: `options.${item.code}.payout`, message: "Expected payout contribution exceeds the backend safety threshold" });
    const probability = totalWeight ? Number(weight * 1_000_000n / totalWeight) / 10_000 : 0;
    const contribution = denominator && totalWeight ? Number(weight * numerator * 1_000_000n / (totalWeight * denominator)) / 10_000 : 0;
    return { code: item.code, probability_percent: probability, payout_contribution_percent: contribution };
  });
  return { valid: failures.length === 0, failures, total_weight: totalWeight.toString(), theoretical_return_percent: options.reduce((sum, item) => sum + item.payout_contribution_percent, 0), options };
}
