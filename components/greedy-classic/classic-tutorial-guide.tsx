"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Hand } from "lucide-react";

export function ClassicTutorialGuide({
  active,
  onDismiss,
}: {
  active: boolean;
  onDismiss: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (!active) return;

    // Cycle between step 1 (chip selection) and step 2 (placing bet)
    const interval = setInterval(() => {
      setStep((current) => (current === 1 ? 2 : 1));
    }, 2800);

    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div
      className="gc-tutorial-overlay"
      role="region"
      aria-label="Interactive how-to-play guide"
      onClick={onDismiss}
    >
      {/* Top Banner & Skip Button */}
      <div className="gc-tutorial-header" onClick={(e) => e.stopPropagation()}>
        <div className="gc-tutorial-badge">
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
          <span>Interactive Guide</span>
        </div>
        <button
          type="button"
          className="gc-tutorial-skip-btn"
          onClick={onDismiss}
          aria-label="Skip interactive tutorial"
        >
          <span>Got it!</span>
          <X className="w-4 h-4 ml-1" />
        </button>
      </div>

      {/* Hand & Pointer Container */}
      <div
        className={`gc-tutorial-hand-track gc-tutorial-hand-track--step-${step}`}
        aria-hidden="true"
      >
        {/* Animated 3D Cartoon Hand Pointer */}
        <div className="gc-tutorial-hand-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/assets/greedy-classic/tutorial-hand.png"
            alt=""
            className="gc-tutorial-hand-img"
          />
          {/* Golden Tap Ripple Rings */}
          <span className="gc-tutorial-ripple" />
          <span className="gc-tutorial-ripple gc-tutorial-ripple--delay" />
        </div>

        {/* Step Guidance Speech Bubble */}
        <div className="gc-tutorial-bubble">
          {step === 1 ? (
            <>
              <strong className="gc-tutorial-bubble__title">
                1. Select Coin
              </strong>
              <p className="gc-tutorial-bubble__text">
                Choose your bet amount from the gold tray below
              </p>
            </>
          ) : (
            <>
              <strong className="gc-tutorial-bubble__title">
                2. Tap to Bet!
              </strong>
              <p className="gc-tutorial-bubble__text">
                Tap Banana, Coconut or any fruit before time runs out!
              </p>
            </>
          )}
          <span className="gc-tutorial-bubble__arrow" />
        </div>
      </div>

      {/* Bottom Dismiss Hint */}
      <div className="gc-tutorial-footer">
        <Hand className="w-4 h-4 inline-block mr-1.5 opacity-80 animate-bounce" />
        <span>Tap anywhere to place your bet</span>
      </div>
    </div>
  );
}

