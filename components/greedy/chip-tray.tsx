"use client";

import clsx from "clsx";
import { useRef } from "react";
import { formatInteger } from "@/lib/format";
import type { ChipValue } from "@/types/greedy";

const CHIP_TONES = [
  "green",
  "blue",
  "red",
  "pink",
  "violet",
  "gold",
  "orange",
  "cyan",
] as const;

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
        const tone = CHIP_TONES[index % CHIP_TONES.length];
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
              `machine-chip--${tone}`,
              active && "machine-chip--active",
            )}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            aria-label={`${formatInteger(chip.amount)} coin chip${chipDisabled && !disabled ? ", unavailable for this bet" : ""}`}
          >
            <span>{formatInteger(chip.amount)}</span>
          </button>
        );
      })}
    </div>
  );
}
