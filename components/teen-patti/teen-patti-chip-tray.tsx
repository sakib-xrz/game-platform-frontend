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
  { rim: "#ff5d64", core: "#ffd6d7", ink: "#821b23" },
  { rim: "#3aa06b", core: "#c9edd6", ink: "#123c22" },
  { rim: "#3c8de6", core: "#d5eaff", ink: "#0f2f5e" },
  { rim: "#7d51e0", core: "#e2d3ff", ink: "#2d1863" },
  { rim: "#f2a03c", core: "#ffe7c1", ink: "#5b330a" },
  { rim: "#1f2531", core: "#e2e5ed", ink: "#0d1220" },
];

export const TeenPattiChipTray = forwardRef<HTMLDivElement, {
  chips: ChipValue[];
  selected: string;
  onChange: (amount: string, sourceEl: HTMLButtonElement) => void;
  disabled: boolean;
}>(function TeenPattiChipTray({ chips, selected, onChange, disabled }, ref) {
  const chipButtons = useRef<Array<HTMLButtonElement | null>>([]);

  function selectByKeyboard(index: number, key: string) {
    if (disabled || !chips.length) return;

    let nextIndex = index;
    if (key === "ArrowRight" || key === "ArrowDown") nextIndex = (index + 1) % chips.length;
    else if (key === "ArrowLeft" || key === "ArrowUp") nextIndex = (index - 1 + chips.length) % chips.length;
    else if (key === "Home") nextIndex = 0;
    else if (key === "End") nextIndex = chips.length - 1;
    else return;

    const target = chipButtons.current[nextIndex];
    if (!target) return;
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
            disabled={disabled}
            className={clsx("tp-chip", active && "tp-chip--active")}
            style={{
              "--chip-rim": theme.rim,
              "--chip-core": theme.core,
              "--chip-ink": theme.ink,
            } as React.CSSProperties}
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            aria-label={`${formatInteger(chip.amount)} coin chip`}
          >
            <span className="tp-chip__ring" aria-hidden="true" />
            <span className="tp-chip__face">{formatInteger(chip.amount)}</span>
          </button>
        );
      })}
    </div>
  );
});
