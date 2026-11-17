"use client";

import { domAnimation, LazyMotion, m, AnimatePresence } from "motion/react";
import { RefreshCw, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LeaderboardEmptyBoard } from "@/components/leaderboard/leaderboard-empty-board";
import { LeaderboardMyRankBar } from "@/components/leaderboard/leaderboard-my-rank-bar";
import { LeaderboardPodium } from "@/components/leaderboard/leaderboard-podium";
import { LeaderboardRankList } from "@/components/leaderboard/leaderboard-rank-list";
import { LeaderboardTabs } from "@/components/leaderboard/leaderboard-tabs";
import { useDailyLeaderboard } from "@/hooks/use-daily-leaderboard";
import type { GameSoundCue } from "@/hooks/use-game-sound";
import { cn } from "@/lib/utils";
import type {
  LeaderboardGameCode,
  LeaderboardPeriod,
  LeaderboardThemeId,
} from "@/types/leaderboard";

export type LeaderboardDialogProps = {
  open: boolean;
  onClose: () => void;
  gameCode: LeaderboardGameCode;
  theme: LeaderboardThemeId;
  title: string;
  subtitle: string;
  headerAccessory?: ReactNode;
  playSound?: (cue: GameSoundCue) => void;
};

export function LeaderboardDialog({
  open,
  onClose,
  gameCode,
  theme,
  title,
  subtitle,
  headerAccessory,
  playSound,
}: LeaderboardDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [period, setPeriod] = useState<LeaderboardPeriod>("today");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { data, loading, error, refresh } = useDailyLeaderboard(
    gameCode,
    period,
    open,
  );

  useEffect(() => {
    if (!open) return;
    playSound?.("chip");
  }, [open, playSound]);

  useEffect(() => {
    if (!open) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const shell = document.querySelector<HTMLElement>("[data-game-shell]");
    const previousShellOverflow = shell?.style.overflow ?? "";
    if (shell) shell.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      if (shell) shell.style.overflow = previousShellOverflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  const resetRemainingMs = data?.resetsAt
    ? Math.max(0, new Date(data.resetsAt).getTime() - nowMs)
    : 0;

  const podiumEntries = data?.entries.slice(0, 3) ?? [];
  const listEntries = data?.entries.filter((entry) => entry.rank >= 4) ?? [];

  const handlePeriodChange = (next: LeaderboardPeriod) => {
    if (next === period) return;
    playSound?.("tick");
    setPeriod(next);
  };

  const handleKeepPlaying = () => {
    playSound?.("bet");
    onClose();
  };

  return (
    <LazyMotion features={domAnimation}>
      <AnimatePresence>
        {open ? (
          <m.div
            key="lb-layer"
            className="lb-layer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
          >
            <button
              type="button"
              className="lb-overlay"
              aria-label="Dismiss leaderboard"
              onClick={onClose}
            />

            <div className="lb-sheet-frame">
              <section
                className={cn("lb-sheet", `lb-theme-${theme}`)}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
              >
                <div className="lb-sheet__glow" aria-hidden="true" />
                <div className="lb-sheet__scanlines" aria-hidden="true" />

                <header className="lb-header">
                  <div className="lb-header__title-wrap">
                    <div className="lb-header__icon" aria-hidden="true">
                      {headerAccessory}
                    </div>
                    <div>
                      <h2 id={titleId} className="lb-header__title">
                        {title}
                      </h2>
                      <p className="lb-header__subtitle">
                        {subtitle}
                        {data?.date ? ` · ${data.date}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="lb-header__actions">
                    <button
                      type="button"
                      className="lb-icon-btn"
                      onClick={() => {
                        playSound?.("tick");
                        void refresh();
                      }}
                      disabled={loading}
                      aria-label="Refresh leaderboard"
                      title="Refresh"
                    >
                      <RefreshCw
                        className={cn(
                          "lb-icon-btn__glyph",
                          loading && "is-spinning",
                        )}
                      />
                    </button>
                    <button
                      ref={closeRef}
                      type="button"
                      className="lb-icon-btn"
                      aria-label="Close leaderboard"
                      onClick={onClose}
                    >
                      <X className="lb-icon-btn__glyph" />
                    </button>
                  </div>
                </header>

                <LeaderboardTabs
                  period={period}
                  resetRemainingMs={resetRemainingMs}
                  onPeriodChange={handlePeriodChange}
                />

                <div className="lb-body custom-scrollbar">
                  {loading && !data ? (
                    <div className="lb-state">
                      <RefreshCw className="lb-state__spinner is-spinning" />
                      <p>Loading daily standings...</p>
                    </div>
                  ) : error && !data ? (
                    <div className="lb-state">
                      <p className="lb-state__error">{error}</p>
                      <button
                        type="button"
                        className="lb-retry"
                        onClick={() => void refresh()}
                      >
                        Retry
                      </button>
                    </div>
                  ) : !data?.entries.length ? (
                    <LeaderboardEmptyBoard periodLabel={period} />
                  ) : (
                    <>
                      <LeaderboardPodium entries={podiumEntries} />
                      <LeaderboardRankList entries={listEntries} />
                    </>
                  )}
                </div>

                <LeaderboardMyRankBar
                  currentUser={data?.currentUser ?? null}
                  onKeepPlaying={handleKeepPlaying}
                />
              </section>
            </div>
          </m.div>
        ) : null}
      </AnimatePresence>
    </LazyMotion>
  );
}
