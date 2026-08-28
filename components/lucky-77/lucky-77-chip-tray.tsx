"use client";

import clsx from "clsx";
import { RotateCcw } from "lucide-react";
import type { CSSProperties } from "react";
import { CASINO_CHIP_THEMES } from "@/lib/chip-themes";
import { formatInteger } from "@/lib/format";
import type { ChipValue } from "@/types/greedy";

function compactChipAmount(amount: string): string {
  try {
    const value = BigInt(amount);
    if (value >= 1_000_000n && value % 1_000_000n === 0n) return `${value / 1_000_000n}M`;
    if (value >= 1_000n && value % 1_000n === 0n) return `${value / 1_000n}K`;
  } catch {
    return amount;
  }
  return formatInteger(amount);
}

export function Lucky77ChipTray({
  chips,
  selected,
  disabled,
  disabledAmounts,
  walletBalance,
  repeatDisabled,
  onChange,
  onRepeat,
}: {
  chips: ChipValue[];
  selected: string;
  disabled: boolean;
  disabledAmounts: ReadonlySet<string>;
  walletBalance: bigint;
  repeatDisabled: boolean;
  onChange: (amount: string) => void;
  onRepeat: () => void;
}) {
  return (
    <section className="l77-controls safe-bottom" aria-label="Bet controls">
      <div className="l77-chip-row" role="radiogroup" aria-label="Choose coin value">
        {chips.map((chip, index) => {
          const active = chip.amount === selected;
          const unavailable = disabled || disabledAmounts.has(chip.amount);
          const theme = CASINO_CHIP_THEMES[index % CASINO_CHIP_THEMES.length]!;

          return (
            <button
              key={chip.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${formatInteger(chip.amount)} coin chip`}
              className={clsx("l77-chip", active && "is-active")}
              style={
                {
                  "--chip-rim": theme.rim,
                  "--chip-core": theme.core,
                  "--chip-ink": theme.ink,
                } as CSSProperties
              }
              disabled={unavailable}
              onClick={() => onChange(chip.amount)}
            >
              <span className="l77-chip__ring" aria-hidden="true" />
              <span className="l77-chip__face">{compactChipAmount(chip.amount)}</span>
            </button>
          );
        })}

        <button
          type="button"
          className="l77-repeat"
          disabled={repeatDisabled}
          onClick={onRepeat}
        >
          <RotateCcw aria-hidden="true" />
          Repeat
        </button>
      </div>

      <div className="l77-wallet" aria-label={`${formatInteger(walletBalance)} coins available`}>
        <span aria-hidden="true">◆</span>
        <strong>{formatInteger(walletBalance)}</strong>
      </div>
    </section>
  );
}
