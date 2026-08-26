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
}: {
  optionId: string;
  bettors: PublicBetAggregate[];
  bounds: AvatarBounds;
  containerClassName: string;
  avatarClassName: string;
  slotClassName: string;
}) {
  const visibleBettors = bettors.slice(0, 3);
  if (visibleBettors.length === 0) return null;

  return (
    <span className={containerClassName} aria-hidden="true">
      {visibleBettors.map((bettor, index) => {
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
