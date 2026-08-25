"use client";

import { RotateCcw } from "lucide-react";
import { formatCompactAmount, formatInteger } from "@/lib/format";
import type { ChipValue } from "@/types/greedy";

const CHIP_TONES = ["green", "blue", "red", "pink", "violet", "gold"] as const;

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
          return (
            <button
              key={chip.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={`${formatInteger(chip.amount)} coin chip`}
              className={`l77-chip l77-chip--${CHIP_TONES[index % CHIP_TONES.length]}${active ? " is-active" : ""}`}
              disabled={unavailable}
              onClick={() => onChange(chip.amount)}
            >
              <span>{formatCompactAmount(chip.amount)}</span>
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
