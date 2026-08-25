"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Check, Loader2, Search, UserRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { adminClient } from "@/lib/admin-client";
import type { PlatformUserRecord } from "@/types/admin";

function buildQuery(search: string, appId: string, page: number) {
  const params = new URLSearchParams({ page: String(page), limit: "20" });
  if (search) params.set("search", search);
  if (appId && appId !== "all") params.set("platform_app_id", appId);
  return `?${params.toString()}`;
}

export function PlatformUsersAdminPanel() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [appId, setAppId] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<PlatformUserRecord | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(search.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const query = buildQuery(debounced, appId, page);
  const users = useQuery({
    queryKey: ["admin", "platform-users", debounced, appId, page],
    queryFn: () => adminClient.platformUsers(query),
  });
  const apps = useQuery({
    queryKey: ["admin", "platform-users", "apps"],
    queryFn: () => adminClient.platformUserApps(),
  });
  const ledger = useQuery({
    queryKey: ["admin", "platform-users", "ledger", selected?.id],
    queryFn: () => adminClient.platformUserLedger(selected!.id, "?page=1&limit=100"),
    enabled: Boolean(selected?.id),
  });

  const totalPages = useMemo(() => {
    const total = users.data?.meta.total ?? 0;
    const limit = users.data?.meta.limit ?? 20;
    return Math.max(1, Math.ceil(total / limit));
  }, [users.data]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Platform integration</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Platform Users</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Browse users synced from partner apps, review balances, and inspect coin deposit and withdrawal history.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,.8fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Synced users</CardTitle>
            <CardDescription>Search by external user ID, email, or display name.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                  placeholder="Search users…"
                />
              </div>
              <Select
                value={appId}
                onValueChange={(value) => {
                  setAppId(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full sm:w-56">
                  <SelectValue placeholder="All apps" />
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
            </div>

            {users.isLoading ? (
              <div className="grid min-h-40 place-items-center">
                <Loader2 className="animate-spin text-slate-400" />
              </div>
            ) : users.data?.data.length ? (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>External ID</TableHead>
                      <TableHead>App</TableHead>
                      <TableHead>Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.data.data.map((user) => (
                      <TableRow key={user.id} className={selected?.id === user.id ? "bg-slate-100" : ""}>
                        <TableCell>
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-xs text-slate-500">{user.email}</div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800">
                            {user.external_user_id}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div>{user.app_name}</div>
                          <div className="text-xs text-slate-500">{user.package_name}</div>
                        </TableCell>
                        <TableCell>
                          {user.balance} {user.currency}
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.status === "active" ? "success" : "secondary"}>{user.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={selected?.id === user.id ? "default" : "outline"}
                            onClick={() => setSelected(user)}
                          >
                            {selected?.id === user.id ? <Check /> : <UserRound />}
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>
                    Page {page} of {totalPages} · {users.data.meta.total} users
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>
                      Previous
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={page >= totalPages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                No platform users match this search.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>User detail & ledger</CardTitle>
            <CardDescription>
              {selected ? `${selected.display_name} (${selected.external_user_id})` : "Select a user to inspect ledger entries."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-5">
                <div className="rounded-xl bg-slate-950 p-5 text-white">
                  <div className="flex items-center gap-2 text-sm text-slate-300">
                    <Users className="size-4" />
                    Current balance
                  </div>
                  <p className="mt-2 text-3xl font-bold">
                    {selected.balance} <span className="text-base text-slate-400">{selected.currency}</span>
                  </p>
                  <p className="mt-2 text-xs text-slate-400">
                    {selected.app_name} · synced {new Date(selected.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">External ID</span>
                    <code className="truncate rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
                      {selected.external_user_id}
                    </code>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Internal ID</span>
                    <span className="truncate font-mono text-xs">{selected.id}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Email</span>
                    <span>{selected.email}</span>
                  </div>
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">Updated</span>
                    <span>{new Date(selected.updated_at).toLocaleString()}</span>
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-sm font-medium">Coin ledger</p>
                  {ledger.isLoading ? (
                    <div className="grid min-h-24 place-items-center">
                      <Loader2 className="animate-spin text-slate-400" />
                    </div>
                  ) : ledger.data?.data.length ? (
                    <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                      {ledger.data.data.map((entry) => (
                        <div key={entry.id} className="rounded-lg border border-slate-200 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2">
                              {entry.type === "deposit" ? (
                                <ArrowDownLeft className="size-4 text-emerald-600" />
                              ) : (
                                <ArrowUpRight className="size-4 text-amber-600" />
                              )}
                              <div>
                                <p className="text-sm font-medium capitalize">{entry.type}</p>
                                <p className="text-xs text-slate-500">{new Date(entry.created_at).toLocaleString()}</p>
                              </div>
                            </div>
                            <Badge variant={entry.type === "deposit" ? "success" : "warning"}>
                              {entry.type === "deposit" ? "+" : "-"}
                              {entry.amount}
                            </Badge>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-slate-500">
                            <p>Balance: {entry.balance_before} → {entry.balance_after}</p>
                            {entry.client_request_id && <p className="truncate font-mono">Request: {entry.client_request_id}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">No coin movements recorded for this user yet.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid min-h-80 place-items-center rounded-xl border border-dashed border-slate-300 text-center">
                <div>
                  <UserRound className="mx-auto size-8 text-slate-400" />
                  <p className="mt-3 text-sm font-medium">No user selected</p>
                  <p className="mt-1 text-xs text-slate-500">Choose a synced user from the list.</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
