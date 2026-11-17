"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookOpen,
  Check,
  ExternalLink,
  Loader2,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Smartphone,
  Trash2,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { useAdminIdentity } from "@/components/admin/admin-gate";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { adminClient } from "@/lib/admin-client";
import { hasAdminPermission } from "@/lib/admin-permissions";
import type { PlatformAppRecord } from "@/types/admin";
import { IntegrationGuideModal } from "./integration-guide-modal";
import { WalletDiagnosticsModal } from "./wallet-diagnostics-modal";

type FormState = {
  app_name: string;
  app_key: string;
  package_name: string;
  sha_key: string;
  wallet_mode: "local" | "seamless";
  wallet_base_url: string;
  player_token_secret: string;
  allowed_origins: string;
  status: "active" | "disabled";
};

const emptyForm = (): FormState => ({
  app_name: "",
  app_key: "",
  package_name: "",
  sha_key: "",
  wallet_mode: "local",
  wallet_base_url: "",
  player_token_secret: "",
  allowed_origins: "*",
  status: "active",
});

function formFromApp(app: PlatformAppRecord): FormState {
  return {
    app_name: app.app_name,
    app_key: app.app_key || "",
    package_name: app.package_name,
    sha_key: app.sha_key,
    wallet_mode: app.wallet_mode || "local",
    wallet_base_url: app.wallet_base_url || "",
    player_token_secret: app.player_token_secret || "",
    allowed_origins: app.allowed_origins || "*",
    status: app.status,
  };
}

export function PlatformAppsAdminPanel() {
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const canManage = hasAdminPermission(identity.role, "platform.app.manage");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformAppRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<PlatformAppRecord | null>(null);
  const [revealedSecret, setRevealedSecret] = useState<{ app_name: string; signing_secret: string } | null>(null);

  const [guideApp, setGuideApp] = useState<PlatformAppRecord | null>(null);
  const [diagnosticsApp, setDiagnosticsApp] = useState<PlatformAppRecord | null>(null);

  const apps = useQuery({
    queryKey: ["admin", "platform-apps"],
    queryFn: () => adminClient.platformApps(),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "platform-apps"] });
  };

  const save = useMutation({
    mutationFn: async () => {
      if (editing) {
        return adminClient.updatePlatformApp(editing.id, {
          app_name: form.app_name.trim(),
          app_key: form.app_key.trim() || null,
          sha_key: form.sha_key.trim(),
          wallet_mode: form.wallet_mode,
          wallet_base_url: form.wallet_base_url.trim() || null,
          player_token_secret: form.player_token_secret.trim() || null,
          allowed_origins: form.allowed_origins.trim() || null,
          status: form.status,
        });
      }
      return adminClient.createPlatformApp({
        app_name: form.app_name.trim(),
        app_key: form.app_key.trim() || null,
        package_name: form.package_name.trim().toLowerCase(),
        sha_key: form.sha_key.trim(),
        wallet_mode: form.wallet_mode,
        wallet_base_url: form.wallet_base_url.trim() || null,
        player_token_secret: form.player_token_secret.trim() || null,
        allowed_origins: form.allowed_origins.trim() || null,
        status: form.status,
      });
    },
    onSuccess: async (result) => {
      toast.success(editing ? "App updated" : "App created");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      if (result?.signing_secret) {
        setRevealedSecret({
          app_name: result.app_name,
          signing_secret: result.signing_secret,
        });
      }
      await refresh();
    },
    onError: (reason) =>
      toast.error(reason instanceof Error ? reason.message : "Could not save app"),
  });

  const remove = useMutation({
    mutationFn: (app: PlatformAppRecord) => adminClient.deletePlatformApp(app.id),
    onSuccess: async () => {
      toast.success("App deleted");
      setDeleteTarget(null);
      await refresh();
    },
    onError: (reason) =>
      toast.error(reason instanceof Error ? reason.message : "Could not delete app"),
  });

  const rotateSecret = useMutation({
    mutationFn: (app: PlatformAppRecord) => adminClient.regeneratePlatformAppSigningSecret(app.id),
    onSuccess: async (result) => {
      toast.success("Signing secret rotated");
      if (result?.signing_secret) {
        setRevealedSecret({
          app_name: result.app_name,
          signing_secret: result.signing_secret,
        });
      }
      await refresh();
    },
    onError: (reason) =>
      toast.error(reason instanceof Error ? reason.message : "Could not rotate signing secret"),
  });

  const launchTestGame = useMutation({
    mutationFn: async (app: PlatformAppRecord) => {
      const res = await adminClient.generatePlatformAppLaunchUrl(app.id, { game: "monk-wheel" });
      window.open(res.launch_url, "_blank");
      toast.success("Game launched with signed test token");
    },
    onError: (err: any) => toast.error(err.message || "Failed to launch test game"),
  });

  const activeCount = useMemo(
    () => (apps.data || []).filter((app) => app.status === "active").length,
    [apps.data],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  }

  function openEdit(app: PlatformAppRecord) {
    setEditing(app);
    setForm(formFromApp(app));
    setDialogOpen(true);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    save.mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Enterprise 3rd Party Provider</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Platform Apps & Integration</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Configure external host applications, enable automated coin sync (seamless wallet), generate launch tokens, and test webhooks.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/integration">
            <Button variant="outline">
              <BookOpen className="mr-1.5 size-4 text-slate-500" />
              Integration Docs
            </Button>
          </Link>
          {canManage && (
            <Button onClick={openCreate} className="bg-indigo-600 hover:bg-indigo-700">
              <Plus className="mr-1.5 size-4" />
              Add platform app
            </Button>
          )}
        </div>
      </div>

      {!canManage && (
        <Alert variant="warning">
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Only super administrators can create, edit, or delete platform apps.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Registered apps</CardDescription>
            <CardTitle className="text-3xl">{apps.data?.length ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active apps</CardDescription>
            <CardTitle className="text-3xl">{apps.isLoading ? "—" : activeCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your role</CardDescription>
            <CardTitle className="text-lg capitalize">
              {identity.role.replaceAll("_", " ")}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connected Applications</CardTitle>
          <CardDescription>
            Each app can use local ledger wallets or real-time automated seamless wallet webhooks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {apps.isLoading ? (
            <div className="grid min-h-40 place-items-center">
              <Loader2 className="animate-spin text-slate-400" />
            </div>
          ) : apps.data?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App Name</TableHead>
                  <TableHead>App Key / Package</TableHead>
                  <TableHead>Wallet Mode</TableHead>
                  <TableHead>Signing Secret</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Integration Tools</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.data.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-slate-400" />
                        <div>
                          <div>{app.app_name}</div>
                          {app.wallet_base_url && (
                            <div className="text-[11px] font-mono text-slate-400 truncate max-w-[200px]">
                              {app.wallet_base_url}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-xs font-semibold text-slate-800">
                        {app.app_key || "—"}
                      </div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {app.package_name}
                      </div>
                    </TableCell>
                    <TableCell>
                      {app.wallet_mode === "seamless" ? (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 font-semibold">
                          <Zap className="size-3 mr-1 text-emerald-600 inline" /> Seamless
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="font-semibold">
                          Local Ledger
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {app.signing_secret_preview}
                      {app.has_rotated_signing_secret ? " · rotated" : ""}
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.status === "active" ? "success" : "secondary"}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1.5 flex-wrap">
                        <Button
                          size="sm"
                          variant="outline"
                          title="View Integration Code & Snippets"
                          onClick={() => setGuideApp(app)}
                        >
                          <BookOpen className="size-3.5 mr-1" />
                          Docs
                        </Button>

                        {app.wallet_mode === "seamless" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-amber-200 text-amber-800 hover:bg-amber-50"
                            title="Run live HMAC diagnostic tests"
                            onClick={() => setDiagnosticsApp(app)}
                          >
                            <Zap className="size-3.5 mr-1 text-amber-500" />
                            Test
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                          title="Open game with signed JWT token"
                          disabled={launchTestGame.isPending}
                          onClick={() => launchTestGame.mutate(app)}
                        >
                          <Play className="size-3.5 mr-1 text-indigo-600" />
                          Launch
                        </Button>

                        {canManage && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEdit(app)}
                            >
                              <Pencil className="size-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setDeleteTarget(app)}
                            >
                              <Trash2 className="size-3.5 text-red-500" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
              <Smartphone className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium">No platform apps registered yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Register your first mobile or web host application to generate signing secrets.
              </p>
              {canManage && (
                <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700" onClick={openCreate}>
                  <Plus className="mr-1.5 size-4" />
                  Add platform app
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditing(null);
            setForm(emptyForm());
          }
        }}
      >
        <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Platform App" : "Add Platform App"}</DialogTitle>
            <DialogDescription>
              Configure mobile app credentials and wallet synchronization mode.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="app_name">App name</Label>
                <Input
                  id="app_name"
                  value={form.app_name}
                  onChange={(event) => setForm({ ...form, app_name: event.target.value })}
                  placeholder="e.g. Zimo Live"
                  minLength={1}
                  maxLength={120}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="app_key">App key (Slug)</Label>
                <Input
                  id="app_key"
                  value={form.app_key}
                  onChange={(event) => setForm({ ...form, app_key: event.target.value })}
                  placeholder="e.g. zimo-live"
                  maxLength={64}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="package_name">Package name (Android Identifier)</Label>
              <Input
                id="package_name"
                value={form.package_name}
                onChange={(event) => setForm({ ...form, package_name: event.target.value })}
                placeholder="com.example.zimo"
                minLength={3}
                maxLength={255}
                required
                disabled={Boolean(editing)}
              />
              {editing && (
                <p className="text-xs text-slate-500">
                  Package name cannot be changed after creation.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="sha_key">SHA-256 Fingerprint</Label>
              <Input
                id="sha_key"
                value={form.sha_key}
                onChange={(event) => setForm({ ...form, sha_key: event.target.value })}
                placeholder="AA:BB:CC:DD:EE:FF:..."
                minLength={8}
                maxLength={128}
                required
              />
            </div>

            <div className="rounded-lg border border-slate-200 p-4 space-y-4 bg-slate-50">
              <div className="space-y-2">
                <Label className="font-bold text-slate-800">Wallet Mode</Label>
                <Select
                  value={form.wallet_mode}
                  onValueChange={(val: "local" | "seamless") =>
                    setForm({ ...form, wallet_mode: val })
                  }
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="local">Local Ledger (Platform Wallet)</SelectItem>
                    <SelectItem value="seamless">Automated Seamless Wallet (Real-Time Webhook)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">
                  Seamless mode checks balance and debits/credits bets directly on your host server in real-time.
                </p>
              </div>

              {form.wallet_mode === "seamless" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="wallet_base_url">Host Wallet Webhook Base URL</Label>
                    <Input
                      id="wallet_base_url"
                      value={form.wallet_base_url}
                      onChange={(e) => setForm({ ...form, wallet_base_url: e.target.value })}
                      placeholder="https://api.yourdomain.com"
                      className="bg-white"
                      required={form.wallet_mode === "seamless"}
                    />
                    <p className="text-xs text-slate-500">
                      Must implement <code>/internal/wallet/debit</code>, <code>/credit</code>, and <code>/balance</code>.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="player_token_secret">Player Token Secret (HS256)</Label>
                    <Input
                      id="player_token_secret"
                      value={form.player_token_secret}
                      onChange={(e) => setForm({ ...form, player_token_secret: e.target.value })}
                      placeholder="Secret key for signing 15-minute player JWTs"
                      className="bg-white"
                      minLength={8}
                    />
                    <p className="text-xs text-slate-500">
                      If left blank, signing secret will be used as default.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="allowed_origins">Allowed Iframe Origins (CORS & CSP)</Label>
                    <Input
                      id="allowed_origins"
                      value={form.allowed_origins}
                      onChange={(e) => setForm({ ...form, allowed_origins: e.target.value })}
                      placeholder="https://yourdomain.com, *"
                      className="bg-white"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(value: "active" | "disabled") =>
                  setForm({ ...form, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canManage || save.isPending} className="bg-indigo-600 hover:bg-indigo-700">
                {save.isPending ? <Loader2 className="animate-spin" /> : null}
                {editing ? "Save changes" : "Create app"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete platform app</DialogTitle>
            <DialogDescription>
              Remove <strong>{deleteTarget?.app_name}</strong> ({deleteTarget?.package_name})?
              Mobile clients using this registration will no longer be trusted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={remove.isPending}
              onClick={() => deleteTarget && remove.mutate(deleteTarget)}
            >
              {remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}
              Delete app
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revealed Secret Dialog */}
      <Dialog open={Boolean(revealedSecret)} onOpenChange={(open) => !open && setRevealedSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save the signing secret</DialogTitle>
            <DialogDescription>
              Copy this secret into your app backend environment now. It will not be shown again
              for <strong>{revealedSecret?.app_name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-slate-950 p-4 font-mono text-xs break-all text-emerald-300">
            {revealedSecret?.signing_secret}
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (revealedSecret?.signing_secret) {
                  await navigator.clipboard.writeText(revealedSecret.signing_secret);
                  toast.success("Signing secret copied");
                }
              }}
            >
              Copy secret
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Integration Guide Modal */}
      <IntegrationGuideModal
        app={guideApp}
        open={Boolean(guideApp)}
        onOpenChange={(open) => !open && setGuideApp(null)}
      />

      {/* Wallet Diagnostics Modal */}
      <WalletDiagnosticsModal
        app={diagnosticsApp}
        open={Boolean(diagnosticsApp)}
        onOpenChange={(open) => !open && setDiagnosticsApp(null)}
      />
    </div>
  );
}
