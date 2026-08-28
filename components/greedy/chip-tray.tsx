"use client";

import clsx from "clsx";
import { useRef } from "react";
import { formatInteger } from "@/lib/format";
import type { ChipValue } from "@/types/greedy";

/**
 * Casino chip palette rotates by chip index so each coin has a distinct vivid color,
 * matching the Teen Patti circular coin design.
 */
const CHIP_THEMES = [
  { rim: "#34b759", core: "#c6f8d5", ink: "#0d5422" },
  { rim: "#258ee8", core: "#c5e5ff", ink: "#0a3a69" },
  { rim: "#e84040", core: "#ffd0d0", ink: "#681212" },
  { rim: "#d946a6", core: "#ffd2f1", ink: "#66134b" },
  { rim: "#7c4deb", core: "#e2d3ff", ink: "#2d1863" },
  { rim: "#e5a119", core: "#fff0b3", ink: "#613c04" },
  { rim: "#ea661c", core: "#ffdcbe", ink: "#632205" },
  { rim: "#12b8d6", core: "#c2f7ff", ink: "#074e5c" },
] as const;

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
        const theme = CHIP_THEMES[index % CHIP_THEMES.length];
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
