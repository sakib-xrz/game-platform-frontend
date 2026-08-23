import type { CreateTeenPattiAdminConfigInput } from "@/types/admin";

function nullableString(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function numericString(value: string | number) {
  return String(value).trim();
}

export function sanitizeTeenPattiAdminConfigPayload(
  input: CreateTeenPattiAdminConfigInput,
): CreateTeenPattiAdminConfigInput {
  return {
    ...input,
    notes: input.notes?.trim() || undefined,
    min_bet: numericString(input.min_bet),
    max_single_bet: numericString(input.max_single_bet),
    max_round_bet: numericString(input.max_round_bet),
    rake_bps: Math.round(Number(input.rake_bps)),
    options: input.options.map((option) => ({
      ...option,
      asset_id: nullableString(option.asset_id ?? undefined),
      image_url: nullableString(option.image_url ?? undefined),
    })),
    chip_values: input.chip_values.map((chip) => ({
      ...chip,
      amount: numericString(chip.amount),
    })),
  };
}
