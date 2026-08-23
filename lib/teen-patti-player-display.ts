export type TeenPattiPlayerIdentity = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
};

export function teenPattiPlayerName(
  player: Pick<TeenPattiPlayerIdentity, "user_id" | "display_name">,
): string {
  const realName = player.display_name?.trim();
  if (realName) return realName;

  const id = player.user_id.trim();
  if (!id) return "Player";
  const readable = id.replace(/[^\p{L}\p{N}]+/gu, "");
  const initial = (readable[0] ?? "P").toUpperCase();
  const suffix = (readable.slice(-4) || readable).toUpperCase();
  return `${initial} ••• ${suffix}`;
}
