"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

type FlyChip = {
  id: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
  amount: string;
};

/**
 * Renders a flying chip animation from the tapped chip in the tray to the
 * chosen deck. Purely decorative — bet acceptance still flows through the
 * backend confirmation.
 */
export function BetFlyLayer({ chip, onDone }: { chip: FlyChip | null; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!chip) return;
    const start = window.requestAnimationFrame(() => setVisible(true));
    const finish = window.setTimeout(() => {
      setVisible(false);
      onDone();
    }, 620);
    return () => {
      window.cancelAnimationFrame(start);
      window.clearTimeout(finish);
    };
  }, [chip, onDone]);

  if (!chip) return null;

  const dx = chip.to.x - chip.from.x;
  const dy = chip.to.y - chip.from.y;

  return (
    <span
      className={clsx("tp-bet-fly", visible && "tp-bet-fly--go")}
      style={{
        left: `${chip.from.x}px`,
        top: `${chip.from.y}px`,
        "--tp-fly-dx": `${dx}px`,
        "--tp-fly-dy": `${dy}px`,
        "--tp-fly-color": chip.color,
      } as React.CSSProperties}
      aria-hidden="true"
    >
      <span>{chip.amount}</span>
    </span>
  );
}

export type { FlyChip };
