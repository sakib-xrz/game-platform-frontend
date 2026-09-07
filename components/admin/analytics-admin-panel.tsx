"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChartColumn,
  Coins,
  Loader2,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminClient } from "@/lib/admin-client";
import { formatInteger } from "@/lib/format";
import type { AnalyticsUserRow } from "@/types/admin";

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function defaultFromDate() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1));
}

function daysAgo(days: number) {
  const now = startOfUtcDay(new Date());
  now.setUTCDate(now.getUTCDate() - days);
  return now;
}

function startOfUtcMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
}

const DATE_PRESETS = [
  { id: "today", label: "Today", from: () => startOfUtcDay(new Date()), to: () => new Date() },
  { id: "7d", label: "Last 7 days", from: () => daysAgo(6), to: () => new Date() },
  { id: "30d", label: "Last 30 days", from: () => daysAgo(29), to: () => new Date() },
  { id: "month", label: "This month", from: () => startOfUtcMonth(), to: () => new Date() },
  { id: "12m", label: "Last 12 months", from: () => defaultFromDate(), to: () => new Date() },
] as const;

function buildOverviewQuery(from: string, to: string) {
  const params = new URLSearchParams();
  if (from) params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
  const query = params.toString();
  return query ? `?${query}` : "";
}

function buildUsersQuery(input: {
  search: string;
  appId: string;
  from: string;
  to: string;
  page: number;
  limit: number;
  sort: string;
  sortDir: string;
}) {
  const params = new URLSearchParams({
    page: String(input.page),
    limit: String(input.limit),
    sort: input.sort,
    sort_dir: input.sortDir,
    players_only: "true",
  });
  if (input.search) params.set("search", input.search);
  if (input.appId && input.appId !== "all") params.set("platform_app_id", input.appId);
  if (input.from) params.set("from", new Date(`${input.from}T00:00:00.000Z`).toISOString());
  if (input.to) params.set("to", new Date(`${input.to}T23:59:59.999Z`).toISOString());
  return `?${params.toString()}`;
}

function buildUserDetailQuery(from: string, to: string, page: number, limit = 50) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (from) params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
  return `?${params.toString()}`;
}

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Coins;
  tone?: "neutral" | "positive" | "negative";
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardDescription>{title}</CardDescription>
          <CardTitle
            className={
              tone === "positive"
                ? "mt-1 text-3xl text-emerald-600"
                : tone === "negative"
                  ? "mt-1 text-3xl text-rose-600"
                  : "mt-1 text-3xl"
            }
          >
            {formatInteger(value)}
          </CardTitle>
        </div>
        <div className="rounded-xl bg-slate-100 p-2 text-slate-600">
          <Icon className="size-5" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-slate-500">{hint}</p>
      </CardContent>
    </Card>
  );
}

export function AnalyticsAdminPanel() {
  const [draftFrom, setDraftFrom] = useState(() => toInputDate(defaultFromDate()));
  const [draftTo, setDraftTo] = useState(() => toInputDate(new Date()));
  const [from, setFrom] = useState(draftFrom);
  const [to, setTo] = useState(draftTo);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [appId, setAppId] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState("company_profit");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const applyDateRange = (nextFrom = draftFrom, nextTo = draftTo) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setPage(1);
  };

  const applyPreset = (presetId: (typeof DATE_PRESETS)[number]["id"]) => {
    const preset = DATE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const nextFrom = toInputDate(preset.from());
    const nextTo = toInputDate(preset.to());
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    applyDateRange(nextFrom, nextTo);
  };

  const overviewQuery = buildOverviewQuery(from, to);
  const usersQuery = buildUsersQuery({
    search: debounced,
    appId,
    from,
    to,
    page,
    limit,
    sort,
    sortDir,
  });

  const overview = useQuery({
    queryKey: ["admin", "analytics", "overview", overviewQuery],
    queryFn: () => adminClient.analyticsOverview(overviewQuery),
  });

  const users = useQuery({
    queryKey: ["admin", "analytics", "users", usersQuery],
    queryFn: () => adminClient.analyticsUsers(usersQuery),
  });

  const apps = useQuery({
    queryKey: ["admin", "platform-users", "apps"],
    queryFn: () => adminClient.platformUserApps(),
  });

  const detailQuery = selectedUserId
    ? buildUserDetailQuery(from, to, detailPage)
    : "";

  const userDetail = useQuery({
    queryKey: ["admin", "analytics", "user-detail", selectedUserId, detailQuery],
    queryFn: () => adminClient.analyticsUserDetail(selectedUserId!, detailQuery),
    enabled: Boolean(selectedUserId),
  });

  const chartData = useMemo(
    () =>
      (overview.data?.monthly_series ?? []).map((row) => ({
        month: row.month,
        sales: Number(row.sales),
        points_converted: Number(row.points_converted),
        profit: Number(row.profit),
      })),
    [overview.data?.monthly_series],
  );

  const totalPages = useMemo(() => {
    const total = users.data?.meta.total ?? 0;
    const pageSize = users.data?.meta.limit ?? limit;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [users.data, limit]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const profitTone =
    overview.data && BigInt(overview.data.summary.profit) < 0n
      ? "negative"
      : overview.data && BigInt(overview.data.summary.profit) > 0n
        ? "positive"
        : "neutral";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Platform insights</p>
          <h1 className="mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight">
            <ChartColumn className="size-7" />
            Analytics
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Cross-game sales, coin conversion, house profit, and per-user win/loss across Greedy,
            Greedy Classic, Lucky 77, and Teen Patti.
          </p>
        </div>
        <div className="w-full max-w-xl space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div>
            <p className="text-sm font-medium text-slate-700">Date range</p>
            <p className="text-xs text-slate-500">
              Applied: {from} → {to}. Filters overview KPIs, chart, and user ledger totals.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="space-y-1">
              <Label htmlFor="analytics-from">From</Label>
              <Input
                id="analytics-from"
                type="date"
                value={draftFrom}
                onChange={(event) => setDraftFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="analytics-to">To</Label>
              <Input
                id="analytics-to"
                type="date"
                value={draftTo}
                onChange={(event) => setDraftTo(event.target.value)}
              />
            </div>
            <Button type="button" onClick={() => applyDateRange()}>
              Apply
            </Button>
          </div>
        </div>
      </div>

      {overview.isLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" />
          Loading overview…
        </div>
      ) : overview.isError ? (
        <Card>
          <CardContent className="py-6 text-sm text-rose-600">
            {overview.error instanceof Error
              ? overview.error.message
              : "Could not load analytics overview"}
          </CardContent>
        </Card>
      ) : overview.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Human players"
              value={String(overview.data.summary.human_players)}
              hint="Real users who placed at least one bet (bots excluded)"
              icon={Users}
            />
            <KpiCard
              title="Human losers"
              value={String(overview.data.summary.human_losers)}
              hint="Players currently down on betting net in this range"
              icon={ArrowDownRight}
              tone="negative"
            />
            <KpiCard
              title="Sales"
              value={overview.data.summary.sales}
              hint="Human bet stake only (bots excluded)"
              icon={TrendingUp}
            />
            <KpiCard
              title="Company profit"
              value={overview.data.summary.profit}
              hint={`Coins kept from humans: stake ${formatInteger(overview.data.summary.accepted_stake)} − payouts ${formatInteger(overview.data.summary.payout)}`}
              icon={ArrowUpRight}
              tone={profitTone}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <KpiCard
              title="Points converted"
              value={overview.data.summary.points_converted}
              hint={`${overview.data.summary.deposit_count} deposits · ${formatInteger(overview.data.summary.withdrawals)} withdrawn`}
              icon={Coins}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>How profit works</CardDescription>
                <CardTitle className="text-base font-medium leading-relaxed text-slate-700">
                  Player brings 5,000 → loses 3,000 → balance 2,000, company profit 3,000. Then wins
                  1,000 → balance 3,000, company profit 2,000. Bots are never counted.
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            {overview.data.by_game.map((game) => {
              const gameProfit = BigInt(game.profit);
              return (
                <Card key={game.game_code}>
                  <CardHeader className="pb-2">
                    <CardDescription>{game.game_name}</CardDescription>
                    <CardTitle className="text-xl">{formatInteger(game.sales)}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm text-slate-500">
                    <p>
                      Profit:{" "}
                      <span
                        className={
                          gameProfit > 0n
                            ? "font-medium text-emerald-600"
                            : gameProfit < 0n
                              ? "font-medium text-rose-600"
                              : "font-medium"
                        }
                      >
                        {formatInteger(game.profit)}
                      </span>
                    </p>
                    <p>Payouts: {formatInteger(game.payout)}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Monthly trend</CardTitle>
              <CardDescription>
                Sales, points converted, and house profit by month ({overview.data.timezone}).
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[340px]">
              {chartData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No monthly data in this range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} width={72} />
                    <Tooltip
                      formatter={(value) => formatInteger(String(value ?? 0))}
                      contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
                    />
                    <Legend />
                    <Bar dataKey="sales" name="Sales" fill="#0f172a" radius={[6, 6, 0, 0]} />
                    <Bar
                      dataKey="points_converted"
                      name="Points converted"
                      fill="#38bdf8"
                      radius={[6, 6, 0, 0]}
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      name="Profit"
                      stroke="#10b981"
                      strokeWidth={2}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Real players · wins &amp; losses</CardTitle>
          <CardDescription>
            Humans who actually bet in this date range (bots excluded). Company profit is coins the
            house kept from that player. Click a row for game records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search email, name, or external user ID"
              />
            </div>
            <Select
              value={appId}
              onValueChange={(value) => {
                setAppId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[220px]">
                <SelectValue placeholder="Platform app" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All apps</SelectItem>
                {(apps.data || []).map((app) => (
                  <SelectItem key={app.id} value={app.id}>
                    {app.app_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={sort}
              onValueChange={(value) => {
                setSort(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="company_profit">Company profit</SelectItem>
                <SelectItem value="lost">Player lost</SelectItem>
                <SelectItem value="won">Won</SelectItem>
                <SelectItem value="coins_added">Coins added</SelectItem>
                <SelectItem value="net_result">Player net</SelectItem>
                <SelectItem value="balance">Balance</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sortDir}
              onValueChange={(value) => {
                setSortDir(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[140px]">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="desc">High → low</SelectItem>
                <SelectItem value="asc">Low → high</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-[120px]">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {users.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading users…
            </div>
          ) : users.isError ? (
            <p className="text-sm text-rose-600">
              {users.error instanceof Error ? users.error.message : "Could not load users"}
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>App</TableHead>
                    <TableHead className="text-right">Coins added</TableHead>
                    <TableHead className="text-right">Won</TableHead>
                    <TableHead className="text-right">Company profit</TableHead>
                    <TableHead className="text-right">Bet total</TableHead>
                    <TableHead className="text-right">Player net</TableHead>
                    <TableHead className="text-right">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(users.data?.data ?? []).map((row: AnalyticsUserRow) => {
                    const net = BigInt(row.net_result);
                    const companyProfit = BigInt(row.company_profit);
                    return (
                      <TableRow
                        key={row.platform_user_id}
                        className="cursor-pointer hover:bg-slate-50"
                        onClick={() => {
                          setSelectedUserId(row.platform_user_id);
                          setDetailPage(1);
                        }}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{row.display_name}</p>
                            <p className="text-xs text-slate-500">{row.email}</p>
                            <p className="text-xs text-slate-400">{row.external_user_id}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{row.app_name}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatInteger(row.coins_added)}
                        </TableCell>
                        <TableCell className="text-right text-emerald-600">
                          <span className="inline-flex items-center gap-1">
                            <ArrowUpRight className="size-3.5" />
                            {formatInteger(row.won)}
                          </span>
                        </TableCell>
                        <TableCell
                          className={
                            companyProfit > 0n
                              ? "text-right font-medium text-emerald-600"
                              : companyProfit < 0n
                                ? "text-right font-medium text-rose-600"
                                : "text-right font-medium"
                          }
                        >
                          {formatInteger(row.company_profit)}
                        </TableCell>
                        <TableCell className="text-right">{formatInteger(row.bet_total)}</TableCell>
                        <TableCell
                          className={
                            net > 0n
                              ? "text-right font-medium text-emerald-600"
                              : net < 0n
                                ? "text-right font-medium text-rose-600"
                                : "text-right font-medium"
                          }
                        >
                          {formatInteger(row.net_result)}
                        </TableCell>
                        <TableCell className="text-right">{formatInteger(row.balance)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {(users.data?.data ?? []).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-sm text-slate-500">
                        No real players bet in this date range.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Showing {(users.data?.data.length ?? 0) === 0
                    ? 0
                    : (page - 1) * limit + 1}
                  –
                  {(page - 1) * limit + (users.data?.data.length ?? 0)} of{" "}
                  {formatInteger(users.data?.meta.total ?? 0)} users · page{" "}
                  {users.data?.meta.page ?? page} / {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1 || users.isFetching}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages || users.isFetching}
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Sheet
        open={Boolean(selectedUserId)}
        onOpenChange={(open) => {
          if (!open) setSelectedUserId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          <SheetHeader>
            <SheetTitle>
              {userDetail.data?.user.display_name ?? "Player details"}
            </SheetTitle>
            <SheetDescription>
              {userDetail.data
                ? `${userDetail.data.user.email} · ${userDetail.data.user.app_name}`
                : "Loading player betting history"}
            </SheetDescription>
          </SheetHeader>

          {userDetail.isLoading ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading details…
            </div>
          ) : userDetail.isError ? (
            <p className="mt-6 text-sm text-rose-600">
              {userDetail.error instanceof Error
                ? userDetail.error.message
                : "Could not load player details"}
            </p>
          ) : userDetail.data ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Balance</p>
                  <p className="text-lg font-semibold">
                    {formatInteger(userDetail.data.summary.balance)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Company profit</p>
                  <p
                    className={
                      BigInt(userDetail.data.summary.company_profit) >= 0n
                        ? "text-lg font-semibold text-emerald-600"
                        : "text-lg font-semibold text-rose-600"
                    }
                  >
                    {formatInteger(userDetail.data.summary.company_profit)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Coins added</p>
                  <p className="text-lg font-semibold">
                    {formatInteger(userDetail.data.summary.coins_added)}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">Won / Bet total</p>
                  <p className="text-lg font-semibold">
                    {formatInteger(userDetail.data.summary.won)} /{" "}
                    {formatInteger(userDetail.data.summary.bet_total)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">By game</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {userDetail.data.by_game.map((game) => (
                    <div key={game.game_code} className="rounded-lg border border-slate-200 p-3 text-sm">
                      <p className="font-medium">{game.game_name}</p>
                      <p className="text-slate-500">
                        {game.bet_count} bets · stake {formatInteger(game.bet_total)}
                      </p>
                      <p className="text-slate-500">
                        Payouts {formatInteger(game.payout_total)} · company{" "}
                        {formatInteger(game.company_profit)}
                      </p>
                    </div>
                  ))}
                  {userDetail.data.by_game.length === 0 ? (
                    <p className="text-sm text-slate-500">No bets in this range.</p>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-700">Game records</h3>
                  <p className="text-xs text-slate-500">
                    {formatInteger(userDetail.data.game_records.total)} bets
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Game</TableHead>
                      <TableHead>Pick</TableHead>
                      <TableHead className="text-right">Bet</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead className="text-right">Payout</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {userDetail.data.game_records.items.map((record) => (
                      <TableRow key={`${record.game_code}-${record.bet_id}`}>
                        <TableCell className="whitespace-nowrap text-xs text-slate-500">
                          {new Date(record.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-sm">{record.game_name}</TableCell>
                        <TableCell className="text-sm">{record.option_name}</TableCell>
                        <TableCell className="text-right">
                          {formatInteger(record.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              record.outcome === "win"
                                ? "default"
                                : record.outcome === "loss"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {record.outcome ?? "pending"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatInteger(record.payout_amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {userDetail.data.game_records.items.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-6 text-center text-sm text-slate-500">
                          No game records in this range.
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={detailPage <= 1 || userDetail.isFetching}
                    onClick={() => setDetailPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      detailPage * (userDetail.data.game_records.limit || 50) >=
                        userDetail.data.game_records.total || userDetail.isFetching
                    }
                    onClick={() => setDetailPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
