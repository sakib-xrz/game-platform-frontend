"use client";

import clsx from "clsx";
import { useRef } from "react";
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

export function ChipTray({
  chips,
  selected,
  onChange,
  disabled,
  disabledAmounts,
}: {
  chips: ChipValue[];
  selected: string;
  onChange: (amount: string) => void;
  disabled: boolean;
  disabledAmounts?: ReadonlySet<string>;
}) {
  const chipButtons = useRef<Array<HTMLButtonElement | null>>([]);

  function selectByKeyboard(index: number, key: string) {
    if (disabled || !chips.length) return;

    let nextIndex = index;
    const direction = key === "ArrowRight" || key === "ArrowDown"
      ? 1
      : key === "ArrowLeft" || key === "ArrowUp"
        ? -1
        : 0;
    if (key === "Home") {
      nextIndex = chips.findIndex((chip) => !disabledAmounts?.has(chip.amount));
    } else if (key === "End") {
      nextIndex = chips.findLastIndex((chip) => !disabledAmounts?.has(chip.amount));
    } else if (direction) {
      for (let step = 1; step <= chips.length; step += 1) {
        const candidate = (index + direction * step + chips.length) % chips.length;
        if (!disabledAmounts?.has(chips[candidate].amount)) {
          nextIndex = candidate;
          break;
        }
      }
    } else return;

    if (nextIndex < 0 || disabledAmounts?.has(chips[nextIndex].amount)) return;
    onChange(chips[nextIndex].amount);
    chipButtons.current[nextIndex]?.focus();
  }

  return (
    <div className="machine-chip-strip" role="radiogroup" aria-label="Choose coin value">
      {chips.map((chip, index) => {
        const active = chip.amount === selected;
        const chipDisabled = disabled || Boolean(disabledAmounts?.has(chip.amount));
        const theme = CASINO_CHIP_THEMES[index % CASINO_CHIP_THEMES.length]!;
        return (
          <button
            type="button"
            key={chip.id}
            ref={(element) => {
              chipButtons.current[index] = element;
            }}
            onClick={() => onChange(chip.amount)}
            onKeyDown={(event) => {
              if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                selectByKeyboard(index, event.key);
              }
            }}
            disabled={chipDisabled}
            className={clsx(
              "machine-chip",
              active && "machine-chip--active",
            )}
            style={{
              "--chip-rim": theme.rim,
              "--chip-core": theme.core,
              "--chip-ink": theme.ink,
            } as React.CSSProperties}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            aria-label={`${formatInteger(chip.amount)} coin chip${chipDisabled && !disabled ? ", unavailable for this bet" : ""}`}
          >
            <span className="machine-chip__ring" aria-hidden="true" />
            <span className="machine-chip__face">{compactChipAmount(chip.amount)}</span>
          </button>
        );
      })}
    </div>
  );
}
