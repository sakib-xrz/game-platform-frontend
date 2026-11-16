"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Coins,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Gamepad2,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminClient } from "@/lib/admin-client";
import type { HouseProfitOverview, HouseProfitConfig } from "@/types/admin";

export function HouseProfitAdminPanel() {
  const queryClient = useQueryClient();
  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedGame, setSelectedGame] = useState<string>("default");

  // Load Overview Data
  const {
    data: overview,
    isLoading: isLoadingOverview,
    isFetching: isFetchingOverview,
    refetch: refetchOverview,
  } = useQuery<HouseProfitOverview>({
    queryKey: ["house-profit-overview", period],
    queryFn: () => adminClient.houseProfit.overview(period),
    refetchInterval: 15_000,
  });

  // Load Configuration for Selected Game
  const {
    data: configData,
    isLoading: isLoadingConfig,
    refetch: refetchConfig,
  } = useQuery<HouseProfitConfig>({
    queryKey: ["house-profit-config", selectedGame],
    queryFn: () => adminClient.houseProfit.config(selectedGame),
  });

  // Local Form State
  const [formConfig, setFormConfig] = useState<Partial<HouseProfitConfig>>({});
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  useEffect(() => {
    if (configData) {
      setFormConfig({
        target_house_profit_pct: configData.target_house_profit_pct,
        target_player_rtp_pct: configData.target_player_rtp_pct,
        max_daily_loss_coins: configData.max_daily_loss_coins,
        give_back_lost_pct: configData.give_back_lost_pct,
        give_back_window_days: configData.give_back_window_days,
        big_wins_mode: configData.big_wins_mode,
        weekly_guarantee_enabled: configData.weekly_guarantee_enabled,
        min_weekly_profit_pct: configData.min_weekly_profit_pct,
      });
      setSaveMessage(null);
    }
  }, [configData]);

  // Mutation to update config
  const updateMutation = useMutation({
    mutationFn: (payload: Partial<HouseProfitConfig>) =>
      adminClient.houseProfit.updateConfig(selectedGame, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["house-profit-config", selectedGame] });
      queryClient.invalidateQueries({ queryKey: ["house-profit-overview"] });
      setSaveMessage("Configuration saved successfully!");
      setTimeout(() => setSaveMessage(null), 4000);
    },
    onError: (err: any) => {
      setSaveMessage(`Failed to save: ${err.message || "Unknown error"}`);
    },
  });

  const handleSaveConfig = () => {
    updateMutation.mutate(formConfig);
  };

  const summary = overview?.summary;
  const isProfit = summary ? !summary.house_profit.startsWith("-") : true;

  return (
    <div className="space-y-8">
      {/* Header and Controls */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            House Profit & Operator Console
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Real-time margin control, 60:40 profit steering, daily circuit breakers, and weekly profit guarantee.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Period Selector (like Tecsior) */}
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
            {(["daily", "weekly", "monthly"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-all ${
                  period === p
                    ? "bg-slate-950 text-white shadow"
                    : "text-slate-600 hover:text-slate-950"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchOverview()}
            disabled={isFetchingOverview}
            className="gap-2 text-xs"
          >
            <RefreshCw className={`size-3.5 ${isFetchingOverview ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* House Profit Card */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              House Profit ({period})
            </CardTitle>
            {isProfit ? (
              <TrendingUp className="size-4 text-emerald-600" />
            ) : (
              <TrendingDown className="size-4 text-rose-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-extrabold tracking-tight ${
                isProfit ? "text-emerald-600" : "text-rose-600"
              }`}
            >
              {summary ? (
                <>
                  {isProfit ? "+" : ""}
                  {Number(summary.house_profit).toLocaleString()} coins
                </>
              ) : (
                "..."
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              House Kept:{" "}
              <span className="font-semibold text-slate-900">
                {summary ? `${summary.house_kept_pct}%` : "0%"}
              </span>{" "}
              of coins bet
            </p>
          </CardContent>
        </Card>

        {/* Total Wagered Card */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Wagered
            </CardTitle>
            <Coins className="size-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-slate-950">
              {summary ? Number(summary.total_wagered).toLocaleString() : "..."}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Across <span className="font-semibold text-slate-900">{summary?.total_bets ?? 0}</span> bets
            </p>
          </CardContent>
        </Card>

        {/* Total Paid Out Card */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Paid Out
            </CardTitle>
            <ArrowUpRight className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold tracking-tight text-slate-950">
              {summary ? Number(summary.total_paid_out).toLocaleString() : "..."}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Paid back:{" "}
              <span className="font-semibold text-slate-900">
                {summary ? `${summary.paid_back_pct}%` : "0%"}
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Target Status Card */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Target Status
            </CardTitle>
            <CheckCircle2 className="size-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                {summary?.target_status.meeting_target ?? 0} On Target
              </Badge>
              {(summary?.target_status.losing ?? 0) > 0 && (
                <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
                  {summary?.target_status.losing} Losing
                </Badge>
              )}
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Active Players: <span className="font-semibold text-slate-900">{summary?.total_players ?? 0}</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Profit Bar Chart (Tecsior Screenshot Style) */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-950">
            House profit per day
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            All games cumulative profit & loss (Green = House Profit, Red = House Loss).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {overview?.daily_chart && overview.daily_chart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.daily_chart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis
                    dataKey="date"
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => {
                      const d = new Date(val);
                      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                    }}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={11}
                    tickFormatter={(val) => {
                      if (Math.abs(val) >= 1_000_000) return `${(val / 1_000_000).toFixed(1)}M`;
                      if (Math.abs(val) >= 1_000) return `${(val / 1_000).toFixed(0)}K`;
                      return val;
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0].payload;
                      const val = Number(data.house_profit);
                      return (
                        <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-lg">
                          <p className="text-xs font-bold text-slate-900">{data.date}</p>
                          <p
                            className={`mt-1 text-sm font-extrabold ${
                              val >= 0 ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            Profit: {val >= 0 ? "+" : ""}
                            {val.toLocaleString()} coins
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            Wagered: {Number(data.wagered).toLocaleString()} | Kept: {data.house_kept_pct}%
                          </p>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine y={0} stroke="#cbd5e1" />
                  <Bar dataKey={(d) => Number(d.house_profit)} radius={[4, 4, 0, 0]}>
                    {overview.daily_chart.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={Number(entry.house_profit) >= 0 ? "#10b981" : "#ef4444"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="grid h-full place-items-center text-xs text-slate-400">
                No daily history recorded yet
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* By-Game Performance Table */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <CardTitle className="text-base font-bold text-slate-950">
            Performance By Game (Today)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Breakdown of wagers, payouts, player RTP, and house profits per active title.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th className="py-3 px-4">Game</th>
                  <th className="py-3 px-4 text-center">Players</th>
                  <th className="py-3 px-4 text-center">Bets</th>
                  <th className="py-3 px-4 text-right">Wagered</th>
                  <th className="py-3 px-4 text-right">Paid Out</th>
                  <th className="py-3 px-4 text-right">Paid Back %</th>
                  <th className="py-3 px-4 text-right">House Kept %</th>
                  <th className="py-3 px-4 text-right">House Profit</th>
                  <th className="py-3 px-4 text-center">Target Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {overview?.games && overview.games.length > 0 ? (
                  overview.games.map((game) => {
                    const profitNum = Number(game.house_profit);
                    return (
                      <tr key={game.game_code} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 font-bold text-slate-950">{game.game_name}</td>
                        <td className="py-3 px-4 text-center">{game.players}</td>
                        <td className="py-3 px-4 text-center">{game.bets}</td>
                        <td className="py-3 px-4 text-right">{Number(game.wagered).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{Number(game.paid_out).toLocaleString()}</td>
                        <td className="py-3 px-4 text-right">{game.paid_back_pct}%</td>
                        <td className="py-3 px-4 text-right font-semibold">{game.house_kept_pct}%</td>
                        <td
                          className={`py-3 px-4 text-right font-bold ${
                            profitNum >= 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {profitNum >= 0 ? "+" : ""}
                          {profitNum.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {game.status === "meeting_target" && (
                            <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                              On Target
                            </Badge>
                          )}
                          {game.status === "losing" && (
                            <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
                              Losing
                            </Badge>
                          )}
                          {game.status === "no_bets" && (
                            <span className="text-slate-400">No Bets</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-400">
                      Loading games data...
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Set House Profit & Limits Configuration Section */}
      <Card className="border-slate-200 bg-white shadow-sm">
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base font-bold text-slate-950 flex items-center gap-2">
                <Sliders className="size-4 text-slate-700" />
                Set House Profit & Risk Limits
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Configure profit margin targets (Company 60% / User 40%), daily loss circuit breaker, and retention give-back.
              </CardDescription>
            </div>

            <div className="w-56">
              <Select value={selectedGame} onValueChange={(val) => setSelectedGame(val)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Select Game" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Platform Default (All Games)</SelectItem>
                  <SelectItem value="greedy">Greedy</SelectItem>
                  <SelectItem value="greedy-classic">Monkey Wheel</SelectItem>
                  <SelectItem value="lucky-77">Lucky 77</SelectItem>
                  <SelectItem value="teen-patti">Teen Patti</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Target House Profit % */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Company House Profit % (Target)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formConfig.target_house_profit_pct ?? 60}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    target_house_profit_pct: Number(e.target.value),
                    target_player_rtp_pct: 100 - Number(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Company keeps {formConfig.target_house_profit_pct ?? 60}%. Player RTP is {100 - (formConfig.target_house_profit_pct ?? 60)}%.
              </p>
            </div>

            {/* Max Daily Loss (Circuit Breaker) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Max Daily Loss (Coins)
              </label>
              <Input
                type="number"
                min="0"
                value={formConfig.max_daily_loss_coins ?? "3000000"}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    max_daily_loss_coins: e.target.value,
                  })
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Circuit breaker: locks payouts if net loss hits this cap.
              </p>
            </div>

            {/* Give Back to Net Losers % */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Give Back to Losing Players (%)
              </label>
              <Input
                type="number"
                min="0"
                max="50"
                value={formConfig.give_back_lost_pct ?? 10}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    give_back_lost_pct: Number(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Boost payout for 8-day net losers only when house has surplus profits.
              </p>
            </div>

            {/* Big Wins Mode */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Big Wins Volatility Mode
              </label>
              <Select
                value={formConfig.big_wins_mode ?? "balanced"}
                onValueChange={(val: any) =>
                  setFormConfig({
                    ...formConfig,
                    big_wins_mode: val,
                  })
                }
              >
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="careful">Careful (Low Volatility / Min Drawdown)</SelectItem>
                  <SelectItem value="balanced">Balanced (30-day recovery window)</SelectItem>
                  <SelectItem value="open">Open (Uncapped Natural Multipliers)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Min Weekly Profit Threshold */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Min Weekly Guaranteed Margin %
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formConfig.min_weekly_profit_pct ?? 55}
                onChange={(e) =>
                  setFormConfig({
                    ...formConfig,
                    min_weekly_profit_pct: Number(e.target.value),
                  })
                }
              />
              <p className="mt-1 text-[11px] text-slate-500">
                Emergency recovery engages if weekly margin falls below this rate.
              </p>
            </div>

            {/* Weekly Guarantee Toggle */}
            <div className="flex flex-col justify-center">
              <label className="text-xs font-semibold text-slate-700 block mb-2">
                Weekly Profit Guarantee Lock
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={formConfig.weekly_guarantee_enabled ?? true}
                  onChange={(e) =>
                    setFormConfig({
                      ...formConfig,
                      weekly_guarantee_enabled: e.target.checked,
                    })
                  }
                  className="size-4 rounded border-slate-300 text-slate-900 focus:ring-slate-950"
                />
                Enforce rolling weekly recovery
              </label>
            </div>
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <div>
              {saveMessage && (
                <span
                  className={`text-xs font-semibold ${
                    saveMessage.includes("Failed") ? "text-rose-600" : "text-emerald-600"
                  }`}
                >
                  {saveMessage}
                </span>
              )}
            </div>

            <Button
              onClick={handleSaveConfig}
              disabled={updateMutation.isPending}
              className="bg-slate-950 hover:bg-slate-900 text-white text-xs px-5"
            >
              {updateMutation.isPending ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

