"use client";

import { useEffect, useRef, useState } from "react";

type PayoutSource = {
  optionId: string;
  betCount: number;
};

type PayoutChip = {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  delayMs: number;
  color: string;
  driftX: number;
};

const PAYOUT_COLORS = ["#62d7f2", "#7ecb67", "#668fe8", "#9a74eb", "#f2b34d"];

function centerOf(element: Element) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2,
    y: rect.top + rect.height * 0.7,
  };
}

export function TeenPattiPayoutLayer({
  celebrationKey,
  winnerOptionId,
  sources,
}: {
  celebrationKey: string | null;
  winnerOptionId: string | null;
  sources: PayoutSource[];
}) {
  const [chips, setChips] = useState<PayoutChip[]>([]);
  const playedKeyRef = useRef<string | null>(null);
  const sourcesRef = useRef(sources);

  useEffect(() => {
    sourcesRef.current = sources;
  }, [sources]);

  useEffect(() => {
    if (!celebrationKey || !winnerOptionId || playedKeyRef.current === celebrationKey) return;
    playedKeyRef.current = celebrationKey;

    const frame = window.requestAnimationFrame(() => {
      const decks = Array.from(document.querySelectorAll<HTMLElement>("[data-deck-id]"));
      const winner = decks.find((deck) => deck.dataset.deckId === winnerOptionId);
      if (!winner) return;

      const target = centerOf(winner);
      const next: PayoutChip[] = [];
      let sequence = 0;

      for (const source of sourcesRef.current) {
        if (source.betCount <= 0) continue;
        const sourceDeck = decks.find((deck) => deck.dataset.deckId === source.optionId);
        if (!sourceDeck) continue;
        const origin = centerOf(sourceDeck);
        const visibleCount = Math.min(3, Math.max(1, source.betCount));

        for (let index = 0; index < visibleCount; index += 1) {
          const spread = (index - (visibleCount - 1) / 2) * 12;
          next.push({
            id: `${celebrationKey}-${source.optionId}-${index}`,
            x: origin.x + spread,
            y: origin.y + (index % 2) * 7,
            dx: target.x - origin.x - spread,
            dy: target.y - origin.y - (index % 2) * 7,
            delayMs: sequence * 45,
            color: PAYOUT_COLORS[sequence % PAYOUT_COLORS.length],
            driftX: ((sequence % 3) - 1) * 20,
          });
          sequence += 1;
        }
      }

      setChips(next);
    });
    const clearTimer = window.setTimeout(() => setChips([]), 1_600);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(clearTimer);
    };
  }, [celebrationKey, winnerOptionId]);

  return (
    <div className="tp-payout-layer" aria-hidden="true">
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="tp-payout-chip"
          style={{
            left: chip.x,
            top: chip.y,
            "--tp-payout-dx": `${chip.dx}px`,
            "--tp-payout-dy": `${chip.dy}px`,
            "--tp-payout-drift": `${chip.driftX}px`,
            "--tp-payout-delay": `${chip.delayMs}ms`,
            "--tp-payout-color": chip.color,
          } as React.CSSProperties}
        >
          <i>◆</i>
        </span>
      ))}
    </div>
  );
}
