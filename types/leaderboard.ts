export type LeaderboardPeriod = "today" | "yesterday";

export type LeaderboardGameCode =
  | "greedy"
  | "greedy-classic"
  | "teen-patti"
  | "lucky-77";

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  netProfit: string;
  totalPayout: string;
  winCount: number;
  isCurrentUser: boolean;
}

export interface CurrentUserStanding {
  rank: number | null;
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  netProfit: string;
  totalPayout: string;
  totalBet: string;
  winCount: number;
}

export interface GameLeaderboardData {
  gameCode: LeaderboardGameCode;
  period: LeaderboardPeriod;
  date: string;
  serverTime: string;
  resetsAt: string;
  totalParticipants: number;
  entries: LeaderboardEntry[];
  currentUser: CurrentUserStanding | null;
}

export type LeaderboardThemeId =
  | "greedy"
  | "classic"
  | "teen-patti"
  | "lucky-77";
