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

export function ClassicChipTray({
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
    if (disabled || chips.length === 0) return;

    let nextIndex = index;
    const direction =
      key === "ArrowRight" || key === "ArrowDown"
        ? 1
        : key === "ArrowLeft" || key === "ArrowUp"
          ? -1
          : 0;

    if (key === "Home") {
      nextIndex = chips.findIndex((chip) => !disabledAmounts?.has(chip.amount));
    } else if (key === "End") {
      nextIndex = chips.findLastIndex(
        (chip) => !disabledAmounts?.has(chip.amount),
      );
    } else if (direction) {
      for (let step = 1; step <= chips.length; step += 1) {
        const candidate =
          (index + direction * step + chips.length) % chips.length;
        if (!disabledAmounts?.has(chips[candidate].amount)) {
          nextIndex = candidate;
          break;
        }
      }
    } else {
      return;
    }

    if (nextIndex < 0 || disabledAmounts?.has(chips[nextIndex].amount)) return;
    onChange(chips[nextIndex].amount);
    chipButtons.current[nextIndex]?.focus();
  }

  return (
    <section className="gc-controls" aria-label="Classic betting controls">
      <div
        className="gc-chip-tray"
        role="radiogroup"
        aria-label="Choose coin value"
      >
        {chips.map((chip, index) => {
          const active = chip.amount === selected;
          const unavailable = Boolean(disabledAmounts?.has(chip.amount));
          const chipDisabled = disabled || unavailable;
          const theme = CASINO_CHIP_THEMES[index % CASINO_CHIP_THEMES.length]!;

          return (
            <button
              type="button"
              key={chip.id}
              ref={(element) => {
                chipButtons.current[index] = element;
              }}
              className={clsx(
                "gc-chip",
                active && "gc-chip--active",
              )}
              style={{
                "--chip-rim": theme.rim,
                "--chip-core": theme.core,
                "--chip-ink": theme.ink,
              } as React.CSSProperties}
              role="radio"
              aria-checked={active}
              tabIndex={active ? 0 : -1}
              disabled={chipDisabled}
              aria-label={`${formatInteger(chip.amount)} coin chip${unavailable && !disabled ? ", unavailable for this bet" : ""}`}
              onClick={() => onChange(chip.amount)}
              onKeyDown={(event) => {
                if (
                  [
                    "ArrowRight",
                    "ArrowDown",
                    "ArrowLeft",
                    "ArrowUp",
                    "Home",
                    "End",
                  ].includes(event.key)
                ) {
                  event.preventDefault();
                  selectByKeyboard(index, event.key);
                }
              }}
            >
              <span className="gc-chip__ring" aria-hidden="true" />
              <span className="gc-chip__face">{compactChipAmount(chip.amount)}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
