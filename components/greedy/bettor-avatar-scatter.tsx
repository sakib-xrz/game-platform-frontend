"use client";

import { PlayerAvatar } from "@/components/greedy/player-avatar";
import {
  bettorAvatarSpot,
  bettorAvatarStyle,
  type BettorAvatarSpot,
} from "@/lib/bettor-avatar-layout";
import type { PublicBetAggregate } from "@/types/greedy";

type AvatarBounds = {
  minLeft: number;
  maxLeft: number;
  minTop: number;
  maxTop: number;
};

export function BettorAvatarScatter({
  optionId,
  bettors,
  bounds,
  containerClassName,
  avatarClassName,
  slotClassName,
  layout = "scatter",
}: {
  optionId: string;
  bettors: PublicBetAggregate[];
  bounds: AvatarBounds;
  containerClassName: string;
  avatarClassName: string;
  slotClassName: string;
  /** `row` keeps coins in a safe strip (no overlap). `scatter` uses hashed spots. */
  layout?: "scatter" | "row";
}) {
  const visibleBettors = bettors.slice(0, 3);
  if (visibleBettors.length === 0) return null;

  return (
    <span className={containerClassName} aria-hidden="true" data-layout={layout}>
      {visibleBettors.map((bettor, index) => {
        if (layout === "row") {
          return (
            <span key={bettor.user_id} className={slotClassName}>
              <PlayerAvatar player={bettor} className={avatarClassName} />
            </span>
          );
        }

        const spot: BettorAvatarSpot = bettorAvatarSpot(
          `${optionId}:${bettor.user_id}`,
          index,
          bounds,
        );
        return (
          <span
            key={bettor.user_id}
            className={slotClassName}
            style={{
              position: "absolute",
              transform: "translate(-50%, -50%)",
              ...bettorAvatarStyle(spot),
            }}
          >
            <PlayerAvatar player={bettor} className={avatarClassName} />
          </span>
        );
      })}
    </span>
  );
}
