"use client";

import { useEffect, useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowUpRight,
  Coins,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminClient } from "@/lib/admin-client";
import { formatCompactAmount, formatInteger } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AnalyticsUserRow } from "@/types/admin";

type ChartSeriesKey = "sales" | "points_converted" | "profit";

const CHART_SERIES: Array<{
  key: ChartSeriesKey;
  label: string;
  color: string;
}> = [
  { key: "sales", label: "Bets placed", color: "#0f172a" },
  { key: "points_converted", label: "Coins added", color: "#0ea5e9" },
  { key: "profit", label: "House profit", color: "#10b981" },
];

function formatDisplayDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatAxisTick(value: number) {
  return formatCompactAmount(Math.round(value));
}

function lastSixMonthKeys(reference = new Date()) {
  const keys: string[] = [];
  for (let offset = 5; offset >= 0; offset -= 1) {
    const date = new Date(
      Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() - offset, 1),
    );
    keys.push(date.toISOString().slice(0, 7));
  }
  return keys;
}

function chartWindowQuery(reference = new Date()) {
  const keys = lastSixMonthKeys(reference);
  const from = `${keys[0]}-01`;
  const to = toInputDate(reference);
  return buildOverviewQuery(from, to);
}

function toInputDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function startOfUtcDay(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
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
  {
    id: "today",
    label: "Today",
    from: () => startOfUtcDay(new Date()),
    to: () => new Date(),
  },
  {
    id: "7d",
    label: "Last 7 days",
    from: () => daysAgo(6),
    to: () => new Date(),
  },
  {
    id: "30d",
    label: "Last 30 days",
    from: () => daysAgo(29),
    to: () => new Date(),
  },
  {
    id: "month",
    label: "This month",
    from: () => startOfUtcMonth(),
    to: () => new Date(),
  },
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
  if (input.appId && input.appId !== "all")
    params.set("platform_app_id", input.appId);
  if (input.from)
    params.set("from", new Date(`${input.from}T00:00:00.000Z`).toISOString());
  if (input.to)
    params.set("to", new Date(`${input.to}T23:59:59.999Z`).toISOString());
  return `?${params.toString()}`;
}

function buildUserDetailQuery(
  from: string,
  to: string,
  page: number,
  limit = 50,
) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (from) params.set("from", new Date(`${from}T00:00:00.000Z`).toISOString());
  if (to) params.set("to", new Date(`${to}T23:59:59.999Z`).toISOString());
  return `?${params.toString()}`;
}

function signedTone(value: string | number | bigint) {
  const amount = typeof value === "bigint" ? value : BigInt(value);
  if (amount > 0n) return "positive" as const;
  if (amount < 0n) return "negative" as const;
  return "neutral" as const;
}

function toneClass(tone: "neutral" | "positive" | "negative") {
  if (tone === "positive") return "text-emerald-600";
  if (tone === "negative") return "text-rose-600";
  return "text-slate-950";
}

const KPI_ICON_STYLES = {
  neutral: "bg-slate-100 text-slate-600",
  positive: "bg-emerald-50 text-emerald-600",
  negative: "bg-rose-50 text-rose-600",
  accent: "bg-sky-50 text-sky-600",
} as const;

function KpiCard({
  title,
  value,
  icon: Icon,
  tone = "neutral",
  iconTone = "neutral",
  loading = false,
}: {
  title: string;
  value: string;
  icon: typeof Coins;
  tone?: "neutral" | "positive" | "negative";
  iconTone?: keyof typeof KPI_ICON_STYLES;
  loading?: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="min-w-0 space-y-1">
          <CardDescription className="text-xs font-medium tracking-wide uppercase">
            {title}
          </CardDescription>
          {loading ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <CardTitle
              className={cn(
                "mt-1 text-3xl font-semibold tracking-tight",
                toneClass(tone),
              )}
            >
              {formatInteger(value)}
            </CardTitle>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5", KPI_ICON_STYLES[iconTone])}>
          <Icon className="size-5" />
        </div>
      </CardHeader>
    </Card>
  );
}

function BreakdownCard({
  title,
  value,
  caption,
  rows,
}: {
  title: string;
  value: string;
  caption: string;
  rows: Array<{
    label: string;
    value: string;
    tone?: "neutral" | "positive" | "negative";
  }>;
}) {
  return (
    <Card className="h-full gap-5 py-5">
      <CardHeader className="px-5">
        <CardDescription className="truncate text-[11px] font-medium tracking-[0.16em] text-slate-500 uppercase">
          {title}
        </CardDescription>
        <CardTitle className="mt-2 text-2xl font-semibold tracking-tight tabular-nums">
          {formatInteger(value)}
        </CardTitle>
        <p className="mt-1 text-xs text-slate-500">{caption}</p>
      </CardHeader>
      <CardContent className="mt-auto px-5">
        <dl className="space-y-2 border-t border-slate-100 pt-3">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="text-xs text-slate-500">{row.label}</dt>
              <dd
                className={cn(
                  "text-sm font-medium tabular-nums",
                  toneClass(row.tone ?? "neutral"),
                )}
              >
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-rose-200 bg-rose-50/60 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-rose-700">{message}</p>
      <Button type="button" variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="size-3.5" />
        Retry
      </Button>
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <KpiCard key={index} title="Loading" value="0" icon={Users} loading />
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Card key={index} className="h-full gap-5 py-5">
            <CardHeader className="px-5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-28" />
              <Skeleton className="mt-2 h-3 w-16" />
            </CardHeader>
            <CardContent className="mt-auto space-y-2 px-5">
              <Skeleton className="h-px w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-2 h-4 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-85 w-full rounded-xl" />
        </CardContent>
      </Card>
    </>
  );
}

function UsersTableSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  );
}

function UserDetailSkeleton() {
  return (
    <div className="mt-6 space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border border-slate-200 p-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-6 w-24" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-24" />
        <div className="grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-4 w-28" />
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

export function AnalyticsAdminPanel() {
  const [draftFrom, setDraftFrom] = useState(() =>
    toInputDate(startOfUtcMonth()),
  );
  const [draftTo, setDraftTo] = useState(() => toInputDate(new Date()));
  const [from, setFrom] = useState(draftFrom);
  const [to, setTo] = useState(draftTo);
  const [activePreset, setActivePreset] = useState<
    (typeof DATE_PRESETS)[number]["id"] | "custom"
  >("month");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [appId, setAppId] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState("company_profit");
  const [sortDir, setSortDir] = useState("desc");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(1);
  const [visibleSeries, setVisibleSeries] = useState<
    Record<ChartSeriesKey, boolean>
  >({
    sales: true,
    points_converted: true,
    profit: true,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const applyDateRange = (
    nextFrom = draftFrom,
    nextTo = draftTo,
    preset: typeof activePreset = "custom",
  ) => {
    setFrom(nextFrom);
    setTo(nextTo);
    setActivePreset(preset);
    setPage(1);
  };

  const applyPreset = (presetId: (typeof DATE_PRESETS)[number]["id"]) => {
    const preset = DATE_PRESETS.find((item) => item.id === presetId);
    if (!preset) return;
    const nextFrom = toInputDate(preset.from());
    const nextTo = toInputDate(preset.to());
    setDraftFrom(nextFrom);
    setDraftTo(nextTo);
    applyDateRange(nextFrom, nextTo, presetId);
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
    placeholderData: keepPreviousData,
  });

  const chartQuery = useMemo(() => chartWindowQuery(), []);
  const chartOverview = useQuery({
    queryKey: ["admin", "analytics", "overview", "last-6-months", chartQuery],
    queryFn: () => adminClient.analyticsOverview(chartQuery),
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
    queryKey: [
      "admin",
      "analytics",
      "user-detail",
      selectedUserId,
      detailQuery,
    ],
    queryFn: () =>
      adminClient.analyticsUserDetail(selectedUserId!, detailQuery),
    enabled: Boolean(selectedUserId),
    placeholderData: keepPreviousData,
  });

  const chartData = useMemo(() => {
    const byMonth = new Map(
      (chartOverview.data?.monthly_series ?? []).map((row) => [row.month, row]),
    );
    return lastSixMonthKeys().map((month) => {
      const row = byMonth.get(month);
      return {
        month,
        label: formatMonthLabel(month),
        sales: Number(row?.sales ?? 0),
        points_converted: Number(row?.points_converted ?? 0),
        profit: Number(row?.profit ?? 0),
      };
    });
  }, [chartOverview.data?.monthly_series]);

  const chartTotals = useMemo(() => {
    return chartData.reduce(
      (totals, row) => ({
        sales: totals.sales + row.sales,
        points_converted: totals.points_converted + row.points_converted,
        profit: totals.profit + row.profit,
      }),
      { sales: 0, points_converted: 0, profit: 0 },
    );
  }, [chartData]);

  const chartHasValues = chartData.some(
    (row) => row.sales > 0 || row.points_converted > 0 || row.profit !== 0,
  );

  const toggleSeries = (key: ChartSeriesKey) => {
    setVisibleSeries((current) => {
      const next = { ...current, [key]: !current[key] };
      if (!next.sales && !next.points_converted && !next.profit) return current;
      return next;
    });
  };

  const totalPages = useMemo(() => {
    const total = users.data?.meta.total ?? 0;
    const pageSize = users.data?.meta.limit ?? limit;
    return Math.max(1, Math.ceil(total / pageSize));
  }, [users.data, limit]);

  if (users.data && page > totalPages) {
    setPage(totalPages);
  }

  const profitTone = overview.data
    ? signedTone(overview.data.summary.profit)
    : "neutral";
  const overviewUpdating =
    overview.isFetching && !overview.isLoading && Boolean(overview.data);
  const usersUpdating =
    users.isFetching && !users.isLoading && Boolean(users.data);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h1 className="flex items-center gap-2.5 text-3xl font-bold tracking-tight">
            <span className="grid size-10 place-items-center rounded-2xl bg-slate-950 text-white shadow-sm">
              <LayoutDashboard className="size-5" />
            </span>
            Dashboard
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">
            See how games are performing, how many coins players added, and what
            the house kept.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm">
          <div className="flex items-col items-center gap-1.5">
            <div className="shrink-0 text-sm font-medium text-slate-700">
              Show results for
            </div>
            <div>
              <span className="hidden shrink-0 text-xs text-slate-500 lg:inline">
                {formatDisplayDate(from)} – {formatDisplayDate(to)}
              </span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {DATE_PRESETS.map((preset) => (
              <Button
                key={preset.id}
                type="button"
                size="sm"
                variant={activePreset === preset.id ? "default" : "outline"}
                className="h-7 rounded-full px-3 text-xs"
                onClick={() => applyPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Input
              id="analytics-from"
              type="date"
              aria-label="Start date"
              className="h-8 w-38"
              value={draftFrom}
              onChange={(event) => {
                setDraftFrom(event.target.value);
                setActivePreset("custom");
              }}
            />
            <span className="text-xs text-slate-400">to</span>
            <Input
              id="analytics-to"
              type="date"
              aria-label="End date"
              className="h-8 w-38"
              value={draftTo}
              onChange={(event) => {
                setDraftTo(event.target.value);
                setActivePreset("custom");
              }}
            />
            <Button
              type="button"
              size="sm"
              className="h-8"
              onClick={() => applyDateRange()}
            >
              Apply
            </Button>
          </div>
        </div>
      </div>

      {overview.isLoading && !overview.data ? (
        <OverviewSkeleton />
      ) : overview.isError && !overview.data ? (
        <ErrorState
          message={
            overview.error instanceof Error
              ? overview.error.message
              : "We couldn’t load the dashboard summary. Please try again."
          }
          onRetry={() => overview.refetch()}
        />
      ) : overview.data ? (
        <div
          className={cn(
            "space-y-6 transition-opacity",
            overviewUpdating && "opacity-80",
          )}
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Active players"
              value={String(overview.data.summary.human_players)}
              icon={Users}
              iconTone="accent"
            />
            <KpiCard
              title="Players losing"
              value={String(overview.data.summary.human_losers)}
              icon={ArrowDownRight}
              tone="negative"
              iconTone="negative"
            />
            <KpiCard
              title="Total bets"
              value={overview.data.summary.sales}
              icon={TrendingUp}
              iconTone="neutral"
            />
            <KpiCard
              title="House profit"
              value={overview.data.summary.profit}
              icon={ArrowUpRight}
              tone={profitTone}
              iconTone={profitTone === "neutral" ? "positive" : profitTone}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            <BreakdownCard
              title="Coins added"
              value={overview.data.summary.points_converted}
              caption="Deposited this period"
              rows={[
                {
                  label: "Top-ups",
                  value: formatInteger(overview.data.summary.deposit_count),
                },
                {
                  label: "Withdrawn",
                  value: formatInteger(overview.data.summary.withdrawals),
                },
              ]}
            />

            {overview.data.by_game.map((game) => (
              <BreakdownCard
                key={game.game_code}
                title={game.game_name}
                value={game.sales}
                caption="Total bets"
                rows={[
                  {
                    label: "Profit",
                    value: formatInteger(game.profit),
                    tone: signedTone(game.profit),
                  },
                  {
                    label: "Paid out",
                    value: formatInteger(game.payout),
                  },
                ]}
              />
            ))}
          </div>

          <Card>
            <CardHeader className="gap-3">
              <div>
                <CardTitle>Monthly performance</CardTitle>
                <CardDescription className="mt-1">
                  Last 6 months · compare bets, coins added, and house profit.
                </CardDescription>
                <div className="mt-3 flex flex-wrap gap-2">
                  {CHART_SERIES.map((series) => {
                    const active = visibleSeries[series.key];
                    return (
                      <Button
                        key={series.key}
                        type="button"
                        size="sm"
                        variant={active ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => toggleSeries(series.key)}
                      >
                        <span
                          className="size-2.5 rounded-full"
                          style={{
                            backgroundColor: active ? "#fff" : series.color,
                          }}
                        />
                        {series.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
              {chartHasValues ? (
                <div className="grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                    <p className="text-xs text-slate-500">Total bets</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatCompactAmount(Math.round(chartTotals.sales))}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                    <p className="text-xs text-slate-500">Coins added</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatCompactAmount(
                        Math.round(chartTotals.points_converted),
                      )}
                    </p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2">
                    <p className="text-xs text-slate-500">House profit</p>
                    <p className="text-sm font-semibold tabular-nums text-slate-950">
                      {formatCompactAmount(Math.round(chartTotals.profit))}
                    </p>
                  </div>
                </div>
              ) : null}
            </CardHeader>
            <CardContent className="h-85">
              {chartOverview.isLoading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : chartOverview.isError ? (
                <ErrorState
                  message={
                    chartOverview.error instanceof Error
                      ? chartOverview.error.message
                      : "We couldn’t load the monthly chart. Please try again."
                  }
                  onRetry={() => chartOverview.refetch()}
                />
              ) : !chartHasValues ? (
                <div className="flex h-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 text-sm text-slate-500">
                  <TrendingUp className="size-5 text-slate-400" />
                  No monthly data for the last 6 months yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 8, right: 8, left: 4, bottom: 0 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#e2e8f0"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={formatAxisTick}
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      width={52}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatInteger(String(value ?? 0)),
                        CHART_SERIES.find((series) => series.key === name)
                          ?.label ?? String(name),
                      ]}
                      labelFormatter={(label) => String(label)}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e2e8f0",
                        boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
                      }}
                    />
                    <Legend
                      formatter={(value) => (
                        <span className="text-slate-600">
                          {CHART_SERIES.find((series) => series.key === value)
                            ?.label ?? value}
                        </span>
                      )}
                    />
                    {visibleSeries.sales ? (
                      <Bar
                        dataKey="sales"
                        name="sales"
                        fill="#0f172a"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    ) : null}
                    {visibleSeries.points_converted ? (
                      <Bar
                        dataKey="points_converted"
                        name="points_converted"
                        fill="#0ea5e9"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    ) : null}
                    {visibleSeries.profit ? (
                      <Bar
                        dataKey="profit"
                        name="profit"
                        fill="#10b981"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={36}
                      />
                    ) : null}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <Card>
        <CardHeader className="gap-1">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle>Player results</CardTitle>
              <CardDescription className="mt-1">
                Browse who won or lost. Click a player to see their bets.
              </CardDescription>
            </div>
            {usersUpdating ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                <Loader2 className="size-3 animate-spin" />
                Refreshing…
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="h-9 pl-9"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name, email, or player ID"
              />
            </div>
            <Select
              value={appId}
              onValueChange={(value) => {
                setAppId(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-44">
                <SelectValue placeholder="All apps" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-100">
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
              <SelectTrigger className="h-9 w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-100">
                <SelectItem value="company_profit">House profit</SelectItem>
                <SelectItem value="lost">Player lost</SelectItem>
                <SelectItem value="won">Player won</SelectItem>
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
              <SelectTrigger className="h-9 w-full sm:w-36">
                <SelectValue placeholder="Direction" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-100">
                <SelectItem value="desc">Highest first</SelectItem>
                <SelectItem value="asc">Lowest first</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(limit)}
              onValueChange={(value) => {
                setLimit(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-fit">
                <SelectValue placeholder="Rows" />
              </SelectTrigger>
              <SelectContent position="popper" className="z-100">
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="20">20 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
                <SelectItem value="100">100 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {users.isLoading && !users.data ? (
            <UsersTableSkeleton />
          ) : users.isError && !users.data ? (
            <ErrorState
              message={
                users.error instanceof Error
                  ? users.error.message
                  : "We couldn’t load players. Please try again."
              }
              onRetry={() => users.refetch()}
            />
          ) : (
            <div
              className={cn(
                "space-y-4 transition-opacity",
                usersUpdating && "opacity-80",
              )}
            >
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                      <TableHead>Player</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead className="text-right">Coins added</TableHead>
                      <TableHead className="text-right">Won</TableHead>
                      <TableHead className="text-right">House profit</TableHead>
                      <TableHead className="text-right">Total bets</TableHead>
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
                          className="cursor-pointer"
                          onClick={() => {
                            setSelectedUserId(row.platform_user_id);
                            setDetailPage(1);
                          }}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-slate-950">
                                {row.display_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {row.email}
                              </p>
                              <p className="font-mono text-[11px] text-slate-400">
                                {row.external_user_id}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.app_name}</Badge>
                          </TableCell>
                          <TableCell className="text-right font-medium tabular-nums">
                            {formatInteger(row.coins_added)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums text-emerald-600">
                            <span className="inline-flex items-center justify-end gap-1">
                              <ArrowUpRight className="size-3.5" />
                              {formatInteger(row.won)}
                            </span>
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium tabular-nums",
                              toneClass(signedTone(companyProfit)),
                            )}
                          >
                            {formatInteger(row.company_profit)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatInteger(row.bet_total)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right font-medium tabular-nums",
                              toneClass(signedTone(net)),
                            )}
                          >
                            {formatInteger(row.net_result)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {formatInteger(row.balance)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                    {(users.data?.data ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="py-10 text-center text-sm text-slate-500"
                        >
                          {debounced || appId !== "all"
                            ? "No players match these filters in this period."
                            : "No players placed bets in this period."}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  {(() => {
                    const currentPage = users.data?.meta.page ?? page;
                    const pageSize = users.data?.meta.limit ?? limit;
                    const rowCount = users.data?.data.length ?? 0;
                    const total = users.data?.meta.total ?? 0;
                    const start =
                      rowCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
                    const end = (currentPage - 1) * pageSize + rowCount;
                    return (
                      <>
                        Showing {start}–{end} of {formatInteger(total)} players
                        · page {currentPage} / {totalPages}
                      </>
                    );
                  })()}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() =>
                      setPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() =>
                      setPage((current) => Math.min(totalPages, current + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            </div>
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
                : "Loading this player’s betting history…"}
            </SheetDescription>
          </SheetHeader>

          {userDetail.isLoading && !userDetail.data ? (
            <UserDetailSkeleton />
          ) : userDetail.isError && !userDetail.data ? (
            <div className="mt-6">
              <ErrorState
                message={
                  userDetail.error instanceof Error
                    ? userDetail.error.message
                    : "We couldn’t load this player’s details. Please try again."
                }
                onRetry={() => userDetail.refetch()}
              />
            </div>
          ) : userDetail.data ? (
            <div
              className={cn(
                "mt-6 space-y-6 transition-opacity",
                userDetail.isFetching && !userDetail.isLoading && "opacity-80",
              )}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Balance
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatInteger(userDetail.data.summary.balance)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    House profit
                  </p>
                  <p
                    className={cn(
                      "mt-1 text-lg font-semibold tabular-nums",
                      toneClass(
                        signedTone(userDetail.data.summary.company_profit),
                      ),
                    )}
                  >
                    {formatInteger(userDetail.data.summary.company_profit)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Coins added
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatInteger(userDetail.data.summary.coins_added)}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3">
                  <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                    Won / Bet total
                  </p>
                  <p className="mt-1 text-lg font-semibold tabular-nums">
                    {formatInteger(userDetail.data.summary.won)} /{" "}
                    {formatInteger(userDetail.data.summary.bet_total)}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium text-slate-700">
                  Games played
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {userDetail.data.by_game.map((game) => (
                    <div
                      key={game.game_code}
                      className="rounded-xl border border-slate-200 p-3 text-sm"
                    >
                      <p className="font-medium">{game.game_name}</p>
                      <p className="mt-1 text-slate-500">
                        {game.bet_count} bets · stake{" "}
                        {formatInteger(game.bet_total)}
                      </p>
                      <p className="text-slate-500">
                        Payouts {formatInteger(game.payout_total)} · house{" "}
                        <span
                          className={toneClass(signedTone(game.company_profit))}
                        >
                          {formatInteger(game.company_profit)}
                        </span>
                      </p>
                    </div>
                  ))}
                  {userDetail.data.by_game.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No bets in this period.
                    </p>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-sm font-medium text-slate-700">
                    Recent bets
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatInteger(userDetail.data.game_records.total)} bets
                  </p>
                </div>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
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
                          <TableCell className="text-sm">
                            {record.game_name}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.option_name}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
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
                          <TableCell className="text-right tabular-nums">
                            {formatInteger(record.payout_amount)}
                          </TableCell>
                        </TableRow>
                      ))}
                      {userDetail.data.game_records.items.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="py-6 text-center text-sm text-slate-500"
                          >
                            No bets found for this period.
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={detailPage <= 1 || userDetail.isFetching}
                    onClick={() =>
                      setDetailPage((current) => Math.max(1, current - 1))
                    }
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      detailPage * (userDetail.data.game_records.limit || 50) >=
                        userDetail.data.game_records.total ||
                      userDetail.isFetching
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
