import type { PlayerIdentity } from "@/types/greedy";

export function shortPlayerId(userId: string): string {
  const value = userId.trim();
  if (value.length <= 14) return value || "Player";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

export function playerDisplayName(player: Pick<PlayerIdentity, "user_id" | "display_name">): string {
  return player.display_name?.trim() || shortPlayerId(player.user_id);
}
