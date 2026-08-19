"use client";

import clsx from "clsx";
import { useRef } from "react";
import { formatInteger } from "@/lib/format";
import type { ChipValue } from "@/types/greedy";

export function ChipTray({
  chips,
  selected,
  onChange,
  disabled,
}: {
  chips: ChipValue[];
  selected: string;
  onChange: (amount: string) => void;
  disabled: boolean;
}) {
  const chipButtons = useRef<Array<HTMLButtonElement | null>>([]);

  function selectByKeyboard(index: number, key: string) {
    if (disabled || !chips.length) return;

    let nextIndex = index;
    if (key === "ArrowRight" || key === "ArrowDown") nextIndex = (index + 1) % chips.length;
    else if (key === "ArrowLeft" || key === "ArrowUp") nextIndex = (index - 1 + chips.length) % chips.length;
    else if (key === "Home") nextIndex = 0;
    else if (key === "End") nextIndex = chips.length - 1;
    else return;

    onChange(chips[nextIndex].amount);
    chipButtons.current[nextIndex]?.focus();
  }

  return (
    <div className="machine-chip-strip" role="radiogroup" aria-label="Choose coin value">
      {chips.map((chip, index) => {
        const active = chip.amount === selected;
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
            disabled={disabled}
            className={clsx("machine-chip", active && "machine-chip--active")}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            aria-label={`${formatInteger(chip.amount)} coin chip`}
          >
            <span>{formatInteger(chip.amount)}</span>
          </button>
        );
      })}
    </div>
  );
}
