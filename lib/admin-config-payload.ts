import type { CreateAdminConfigInput } from "@/types/admin";

function nullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function numericString(value: string | number) {
  return String(value).trim();
}

export function sanitizeAdminConfigPayload(input: CreateAdminConfigInput): CreateAdminConfigInput {
  return {
    ...input,
    notes: input.notes?.trim() || undefined,
    min_bet: numericString(input.min_bet),
    max_single_bet: numericString(input.max_single_bet),
    max_round_bet: numericString(input.max_round_bet),
    options: input.options.map((option) => ({
      ...option,
      asset_id: nullableString(option.asset_id ?? undefined),
      image_url: nullableString(option.image_url ?? undefined),
      payout_numerator: numericString(option.payout_numerator),
      payout_denominator: numericString(option.payout_denominator),
      probability_weight: numericString(option.probability_weight),
    })),
    chip_values: input.chip_values.map((chip) => ({
      ...chip,
      amount: numericString(chip.amount),
    })),
  };
}
