"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
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
import type { PlatformAppRecord } from "@/types/admin";

type FormState = {
  app_name: string;
  package_name: string;
  sha_key: string;
  status: "active" | "disabled";
};

const emptyForm = (): FormState => ({
  app_name: "",
  package_name: "",
  sha_key: "",
  status: "active",
});

function formFromApp(app: PlatformAppRecord): FormState {
  return {
    app_name: app.app_name,
    package_name: app.package_name,
    sha_key: app.sha_key,
    status: app.status,
  };
}

export function PlatformAppsAdminPanel() {
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const canManage = identity.role === "super_admin";
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlatformAppRecord | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [deleteTarget, setDeleteTarget] = useState<PlatformAppRecord | null>(null);

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
          sha_key: form.sha_key.trim(),
          status: form.status,
        });
      }
      return adminClient.createPlatformApp({
        app_name: form.app_name.trim(),
        package_name: form.package_name.trim().toLowerCase(),
        sha_key: form.sha_key.trim(),
        status: form.status,
      });
    },
    onSuccess: async () => {
      toast.success(editing ? "App updated" : "App created");
      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
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
          <p className="text-sm font-medium text-slate-500">Mobile integration</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Platform Apps</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Register mobile apps that connect to the game platform. Each record stores the app
            name, Android package name, and signing certificate SHA key used to verify requests.
          </p>
        </div>
        {canManage && (
          <Button onClick={openCreate}>
            <Plus />
            Add app
          </Button>
        )}
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
          <CardTitle>App registry</CardTitle>
          <CardDescription>
            Package name and SHA key pairs identify trusted mobile clients during platform
            integration.
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
                  <TableHead>App name</TableHead>
                  <TableHead>Package name</TableHead>
                  <TableHead>SHA key</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  {canManage && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {apps.data.map((app) => (
                  <TableRow key={app.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Smartphone className="size-4 text-slate-400" />
                        {app.app_name}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{app.package_name}</TableCell>
                    <TableCell className="max-w-[220px] truncate font-mono text-xs">
                      {app.sha_key}
                    </TableCell>
                    <TableCell>
                      <Badge variant={app.status === "active" ? "success" : "secondary"}>
                        {app.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {new Date(app.updated_at).toLocaleString()}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(app)}>
                            <Pencil />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setDeleteTarget(app)}
                          >
                            <Trash2 />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center">
              <Smartphone className="mx-auto size-8 text-slate-400" />
              <p className="mt-3 text-sm font-medium">No platform apps yet</p>
              <p className="mt-1 text-xs text-slate-500">
                Add your first mobile app to store its package name and SHA signing key.
              </p>
              {canManage && (
                <Button className="mt-4" onClick={openCreate}>
                  <Plus />
                  Add app
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit platform app" : "Add platform app"}</DialogTitle>
            <DialogDescription>
              Store the mobile app identity used when validating requests from the phone app
              backend.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submit}>
            <div className="space-y-2">
              <Label htmlFor="app_name">App name</Label>
              <Input
                id="app_name"
                value={form.app_name}
                onChange={(event) => setForm({ ...form, app_name: event.target.value })}
                placeholder="Greedy Live"
                minLength={1}
                maxLength={120}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="package_name">Package name</Label>
              <Input
                id="package_name"
                value={form.package_name}
                onChange={(event) => setForm({ ...form, package_name: event.target.value })}
                placeholder="com.example.greedy"
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
              <Label htmlFor="sha_key">SHA key</Label>
              <Input
                id="sha_key"
                value={form.sha_key}
                onChange={(event) => setForm({ ...form, sha_key: event.target.value })}
                placeholder="AA:BB:CC:DD:EE:FF:..."
                minLength={8}
                maxLength={128}
                required
              />
              <p className="text-xs text-slate-500">
                Android signing certificate fingerprint. Colons are optional; stored as uppercase
                hex.
              </p>
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
              <Button type="submit" disabled={!canManage || save.isPending}>
                {save.isPending ? <Loader2 className="animate-spin" /> : null}
                {editing ? "Save changes" : "Create app"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </div>
  );
}
