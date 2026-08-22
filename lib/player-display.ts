import type { PlayerIdentity } from "@/types/greedy";

export function shortPlayerId(userId: string): string {
  const value = userId.trim();
  if (value.length <= 14) return value || "Player";
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

export function playerDisplayName(player: Pick<PlayerIdentity, "user_id" | "display_name">): string {
  return player.display_name?.trim() || shortPlayerId(player.user_id);
}

export function playerInitials(player: Pick<PlayerIdentity, "user_id" | "display_name">): string {
  const source = player.display_name?.trim() || player.user_id.trim();
  const words = source
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[1][0]}`.toUpperCase();
  }
  return (words[0]?.slice(0, 2) || "P").toUpperCase();
}
