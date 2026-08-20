"use client";

import clsx from "clsx";
import { forwardRef, useRef } from "react";
import { formatInteger } from "@/lib/format";
import type { ChipValue } from "@/types/teen-patti";

/**
 * Casino chip palette rotates by chip index so the tray reads as a stack
 * of denominations instead of a row of identical buttons.
 */
const CHIP_THEMES = [
  { rim: "#21bfe3", core: "#a9eeff", ink: "#075375" },
  { rim: "#43a844", core: "#caefad", ink: "#1a581f" },
  { rim: "#3c8de6", core: "#c5e5ff", ink: "#0f2f5e" },
  { rim: "#7d51e0", core: "#e2d3ff", ink: "#2d1863" },
  { rim: "#f2a03c", core: "#ffe7c1", ink: "#5b330a" },
  { rim: "#df744b", core: "#ffd8b7", ink: "#6a2f18" },
];

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

export const TeenPattiChipTray = forwardRef<HTMLDivElement, {
  chips: ChipValue[];
  selected: string;
  onChange: (amount: string, sourceEl: HTMLButtonElement) => void;
  disabled: boolean;
  disabledAmounts?: ReadonlySet<string>;
}>(function TeenPattiChipTray({ chips, selected, onChange, disabled, disabledAmounts }, ref) {
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

    const target = chipButtons.current[nextIndex];
    if (!target || nextIndex < 0 || disabledAmounts?.has(chips[nextIndex].amount)) return;
    onChange(chips[nextIndex].amount, target);
    target.focus();
  }

  return (
    <div
      ref={ref}
      className={clsx("tp-chip-tray", disabled && "tp-chip-tray--disabled")}
      role="radiogroup"
      aria-label="Choose coin value"
    >
      {chips.map((chip, index) => {
        const active = chip.amount === selected;
        const chipDisabled = disabled || Boolean(disabledAmounts?.has(chip.amount));
        const theme = CHIP_THEMES[index % CHIP_THEMES.length];
        return (
          <button
            type="button"
            key={chip.id}
            ref={(element) => {
              chipButtons.current[index] = element;
            }}
            onClick={(event) => onChange(chip.amount, event.currentTarget)}
            onKeyDown={(event) => {
              if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) {
                event.preventDefault();
                selectByKeyboard(index, event.key);
              }
            }}
            disabled={chipDisabled}
            className={clsx("tp-chip", active && "tp-chip--active")}
            data-chip-amount={chip.amount}
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
            <span className="tp-chip__ring" aria-hidden="true" />
            <span className="tp-chip__face">{compactChipAmount(chip.amount)}</span>
          </button>
        );
      })}
    </div>
  );
});
