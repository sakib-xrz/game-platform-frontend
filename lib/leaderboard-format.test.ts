import { describe, expect, it } from "vitest";
import {
  formatLeaderboardEarnings,
  formatLeaderboardProfit,
  formatLeaderboardWins,
  formatResetCountdown,
} from "@/lib/leaderboard-format";

describe("leaderboard-format", () => {
  it("formats compact earnings", () => {
    expect(formatLeaderboardEarnings("520000")).toBe("520,000");
    expect(formatLeaderboardEarnings("1200000")).toBe("1.2M");
    expect(formatLeaderboardEarnings("0")).toBe("0");
  });

  it("formats podium profit with sign and unit", () => {
    expect(formatLeaderboardProfit("1450000")).toBe("+1.45M Coins");
    expect(formatLeaderboardProfit("-12500")).toBe("-12,500 Coins");
    expect(formatLeaderboardProfit("0")).toBe("0 Coins");
  });

  it("formats wins and reset countdown", () => {
    expect(formatLeaderboardWins(1)).toBe("1 Win");
    expect(formatLeaderboardWins(142)).toBe("142 Wins");
    expect(formatResetCountdown(3 * 3600_000 + 42 * 60_000 + 15_000)).toBe(
      "03:42:15",
    );
  });
});
