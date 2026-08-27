"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCountdown } from "@/hooks/use-countdown";
import { Lucky77Symbol } from "@/lib/lucky-77-art";
import {
  LUCKY_77_SLOT_DEGREES,
  lucky77IdleRotation,
  lucky77SpinRotation,
} from "@/lib/lucky-77-spin";
import type { PublicOption, SnapshotRound } from "@/types/greedy";

const FALLBACK_SLOT_MAP = [
  "APPLE",
  "WATERMELON",
  "APPLE",
  "WATERMELON",
  "SEVENTY_SEVEN",
  "APPLE",
  "WATERMELON",
  "APPLE",
  "WATERMELON",
];

function pointAt(radius: number, angleDegrees: number) {
  const radians = (angleDegrees * Math.PI) / 180;
  return {
    x: 50 + radius * Math.cos(radians),
    y: 50 + radius * Math.sin(radians),
  };
}

function sectorPath(index: number) {
  const start = -110 + index * 40;
  const end = start + 40;
  const from = pointAt(47, start);
  const to = pointAt(47, end);
  return `M 50 50 L ${from.x} ${from.y} A 47 47 0 0 1 ${to.x} ${to.y} Z`;
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Lucky77Wheel({
  round,
  serverOffsetMs,
  slotMap,
  options,
  onSectorCross,
}: {
  round: SnapshotRound | null;
  serverOffsetMs: number;
  slotMap?: string[];
  options: PublicOption[];
  /** Fires when the pointer crosses into a new sector during a draw. */
  onSectorCross?: (sectorIndex: number) => void;
}) {
  const slots = slotMap?.length === 9 ? slotMap : FALLBACK_SLOT_MAP;
  const optionByCode = useMemo(
    () => new Map(options.map((option) => [option.code, option])),
    [options],
  );
  const bettingMs = useCountdown(
    round?.status === "betting_open" ? round.betting_ends_at : null,
    serverOffsetMs,
  );
  const drawingMs = useCountdown(
    round?.status === "drawing" ? round.result_reveal_at : null,
    serverOffsetMs,
  );

  const stopIndex =
    typeof round?.winning_slot_index === "number"
      ? round.winning_slot_index
      : typeof round?.result?.winning_slot_index === "number"
        ? round.result.winning_slot_index
        : null;
  const isDrawing = round?.status === "drawing";
  const resultVisible = Boolean(round?.result);
  const isLanded =
    resultVisible ||
    round?.status === "result_revealed" ||
    round?.status === "settling" ||
    round?.status === "settled" ||
    round?.status === "closed";

  const wheelRef = useRef<HTMLDivElement | null>(null);
  const rotationRef = useRef(0);
  const drawFromRef = useRef(0);
  const drawRoundIdRef = useRef<string | null>(null);
  const idleBaseRef = useRef(0);
  const idleStartedAtRef = useRef(0);
  const sectorRef = useRef(-1);
  const reducedMotionRef = useRef(false);
  const onSectorCrossRef = useRef(onSectorCross);
  const highlightRef = useRef<number | null>(null);
  const [highlightIndex, setHighlightIndex] = useState<number | null>(null);

  onSectorCrossRef.current = onSectorCross;

  const setHighlight = (next: number | null) => {
    if (highlightRef.current === next) return;
    highlightRef.current = next;
    setHighlightIndex(next);
  };

  useEffect(() => {
    reducedMotionRef.current = prefersReducedMotion();
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => {
      reducedMotionRef.current = media.matches;
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    let frame = 0;
    const roundId = round?.id ?? null;

    const applyTransform = (degrees: number) => {
      rotationRef.current = degrees;
      const node = wheelRef.current;
      if (node) {
        node.style.transform = `rotate(${degrees}deg)`;
      }
    };

    const tick = () => {
      const now = Date.now();
      const reduced = reducedMotionRef.current;

      if (isDrawing && typeof stopIndex === "number" && round) {
        if (drawRoundIdRef.current !== roundId) {
          drawRoundIdRef.current = roundId;
          drawFromRef.current = rotationRef.current;
          sectorRef.current = -1;
        }

        const spin = lucky77SpinRotation({
          phase: "drawing",
          drawingStartedAt: round.drawing_started_at,
          resultRevealAt: round.result_reveal_at,
          serverOffsetMs,
          winningSlotIndex: stopIndex,
          fromRotation: drawFromRef.current,
          roundId,
          reducedMotion: reduced,
        });
        applyTransform(spin.rotation);
        setHighlight(spin.showWinnerHighlight ? stopIndex : null);

        if (
          spin.sectorIndex !== sectorRef.current &&
          sectorRef.current >= 0 &&
          spin.progress < 1
        ) {
          onSectorCrossRef.current?.(spin.sectorIndex);
        }
        sectorRef.current = spin.sectorIndex;
      } else if (isLanded && typeof stopIndex === "number") {
        const spin = lucky77SpinRotation({
          phase: "landed",
          winningSlotIndex: stopIndex,
          fromRotation: rotationRef.current,
          roundId,
          reducedMotion: reduced,
        });
        applyTransform(spin.rotation);
        setHighlight(stopIndex);
        idleBaseRef.current = spin.rotation;
        idleStartedAtRef.current = now;
        drawRoundIdRef.current = null;
      } else {
        if (drawRoundIdRef.current !== null) {
          idleBaseRef.current = rotationRef.current;
          idleStartedAtRef.current = now;
          drawRoundIdRef.current = null;
        }
        if (idleStartedAtRef.current === 0) {
          idleBaseRef.current = rotationRef.current;
          idleStartedAtRef.current = now;
        }
        if (reduced) {
          applyTransform(idleBaseRef.current);
        } else {
          applyTransform(
            lucky77IdleRotation(
              idleBaseRef.current,
              now - idleStartedAtRef.current,
            ),
          );
        }
        if (!resultVisible) setHighlight(null);
      }

      frame = window.requestAnimationFrame(tick);
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [
    isDrawing,
    isLanded,
    resultVisible,
    round,
    serverOffsetMs,
    stopIndex,
  ]);

  const seconds = Math.max(
    0,
    Math.ceil((isDrawing ? drawingMs : bettingMs) / 1000),
  );
  const centerLabel =
    round?.status === "betting_open"
      ? `${seconds}s`
      : isDrawing
        ? `${seconds}s`
        : round?.status === "betting_locked" || round?.status === "result_ready"
          ? "LOCK"
          : resultVisible
            ? "WIN"
            : "—";
  const phaseLabel =
    round?.status === "betting_open"
      ? "Place bets"
      : isDrawing
        ? "Spinning"
        : round?.status === "betting_locked" || round?.status === "result_ready"
          ? "Bets locked"
          : resultVisible
            ? "Winner"
            : "Next round";

  const winningIndex =
    highlightIndex !== null
      ? highlightIndex
      : resultVisible && typeof stopIndex === "number"
        ? stopIndex
        : null;

  return (
    <section
      className={`l77-wheel-stage${isDrawing ? " is-drawing" : ""}${resultVisible ? " has-result" : ""}`}
      aria-label={
        isDrawing ? "Lucky 77 wheel is spinning" : "Lucky 77 prize wheel"
      }
    >
      <span className="l77-wheel-stage__rays" aria-hidden="true" />
      <span className="l77-pointer" aria-hidden="true">
        <i />
      </span>
      <div className="l77-wheel-shell">
        <div
          ref={wheelRef}
          className="l77-wheel"
          style={{ transform: `rotate(${rotationRef.current}deg)` }}
          aria-hidden="true"
          data-slot-degrees={LUCKY_77_SLOT_DEGREES}
        >
          <svg className="l77-wheel__sectors" viewBox="0 0 100 100">
            <defs>
              <radialGradient id="l77-segment-a" cx="39%" cy="31%" r="78%">
                <stop offset="0" stopColor="#aaa7ff" />
                <stop offset="0.48" stopColor="#6966d1" />
                <stop offset="1" stopColor="#3d278c" />
              </radialGradient>
              <radialGradient id="l77-segment-b" cx="42%" cy="28%" r="82%">
                <stop offset="0" stopColor="#958af2" />
                <stop offset="0.5" stopColor="#574db5" />
                <stop offset="1" stopColor="#342175" />
              </radialGradient>
              <radialGradient id="l77-segment-c" cx="40%" cy="28%" r="82%">
                <stop offset="0" stopColor="#c19cf6" />
                <stop offset="0.46" stopColor="#7763cb" />
                <stop offset="1" stopColor="#483183" />
              </radialGradient>
              <radialGradient id="l77-segment-win" cx="38%" cy="27%" r="82%">
                <stop offset="0" stopColor="#fff8bb" />
                <stop offset="0.5" stopColor="#ffc94d" />
                <stop offset="1" stopColor="#d67d10" />
              </radialGradient>
            </defs>
            {slots.map((code, index) => (
              <path
                key={`${code}-${index}`}
                d={sectorPath(index)}
                className={winningIndex === index ? "is-winning" : undefined}
                fill={
                  winningIndex === index
                    ? "url(#l77-segment-win)"
                    : `url(#l77-segment-${["a", "b", "c"][index % 3]})`
                }
              />
            ))}
            <circle cx="50" cy="50" r="46.4" className="l77-wheel__bevel" />
            <ellipse
              cx="41"
              cy="28"
              rx="31"
              ry="17"
              className="l77-wheel__specular"
            />
          </svg>
          <span className="l77-wheel__inner-ring" />
          <span className="l77-wheel__glass" />
          {slots.map((code, index) => {
            const option = optionByCode.get(code);
            return (
              <span
                key={`symbol-${code}-${index}`}
                className="l77-wheel__slot"
                style={
                  {
                    "--l77-slot-angle": `${index * 40}deg`,
                  } as React.CSSProperties
                }
              >
                <Lucky77Symbol code={code} imageUrl={option?.image_url} />
              </span>
            );
          })}
        </div>
        <span className="l77-wheel-shell__lights" aria-hidden="true" />
      </div>

      <div
        className={`l77-wheel-clock${isDrawing ? " is-spinning" : ""}`}
        aria-live="polite"
      >
        <small>{phaseLabel}</small>
        <strong>{centerLabel}</strong>
      </div>
      {isDrawing ? (
        <span className="l77-wheel-stage__veil" aria-hidden="true" />
      ) : null}
    </section>
  );
}
