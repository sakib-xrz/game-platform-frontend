"use client";

import {
  ClassicOptionArtwork,
  getClassicOptionDisplayName,
} from "@/lib/greedy-classic-art";
import type { RecentRound } from "@/types/greedy";

export function ClassicRecentResults({ history }: { history: RecentRound[] }) {
  const visible = history
    .filter((item) => item.result?.winning_option)
    .slice(0, 9);

  return (
    <section className="gc-history" aria-label="Recent results">
      <strong className="gc-history__label">Result</strong>
      <div className="gc-history__list">
        {visible.length ? (
          visible.map((item, index) => {
            const option = item.result!.winning_option;
            const displayName = getClassicOptionDisplayName(
              option.code,
              option.name,
              option.image_url,
            );
            return (
              <div
                key={item.id}
                title={`Round ${item.round_number}: ${displayName}`}
                className="gc-history__item"
              >
                {index === 0 ? (
                  <span className="gc-history__new">New</span>
                ) : null}
                <ClassicOptionArtwork
                  imageUrl={option.image_url}
                  code={option.code}
                  name={displayName}
                  className="gc-history__art"
                />
              </div>
            );
          })
        ) : (
          <span className="gc-history__empty">
            Results will appear after the first draw
          </span>
        )}
      </div>
    </section>
  );
}
