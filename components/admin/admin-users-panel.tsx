"use client";

import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Loader2, Plus, RefreshCw, Shield, UserCog } from "lucide-react";
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
import { ASSIGNABLE_ROLES, hasAdminPermission, roleLabel } from "@/lib/admin-permissions";
import type { AdminRole, AdminUserRecord } from "@/types/admin";

type CreateFormState = {
  email: string;
  display_name: string;
  role: AdminRole;
  password: string;
};

const emptyCreateForm = (defaultRole: AdminRole): CreateFormState => ({
  email: "",
  display_name: "",
  role: defaultRole,
  password: "",
});

function canManageRecord(actorRole: AdminRole, record: AdminUserRecord): boolean {
  if (actorRole === "dev_super_admin") return true;
  if (actorRole === "super_admin") return record.role === "game_operator";
  return false;
}

export function AdminUsersPanel() {
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const canManage = hasAdminPermission(identity.role, "admin.manage");
  const assignableRoles = ASSIGNABLE_ROLES[identity.role];
  const defaultRole = assignableRoles[0] ?? "game_operator";
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateFormState>(() => emptyCreateForm(defaultRole));
  const [resetTarget, setResetTarget] = useState<AdminUserRecord | null>(null);
  const [resetPassword, setResetPassword] = useState("");

  const admins = useQuery({
    queryKey: ["admin", "admin-users"],
    queryFn: () => adminClient.adminUsers(),
    enabled: canManage,
  });

  const visibleAdmins = useMemo(
    () => (admins.data || []).filter((record) => canManageRecord(identity.role, record)),
    [admins.data, identity.role],
  );

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin", "admin-users"] });
  };

  const create = useMutation({
    mutationFn: () =>
      adminClient.createAdminUser({
        email: createForm.email.trim(),
        display_name: createForm.display_name.trim(),
        role: createForm.role,
        password: createForm.password,
        force_password_change: true,
      }),
    onSuccess: async () => {
      toast.success("Admin account created");
      setCreateOpen(false);
      setCreateForm(emptyCreateForm(defaultRole));
      await refresh();
    },
    onError: (reason) =>
      toast.error(reason instanceof Error ? reason.message : "Could not create admin"),
  });

  const updateStatus = useMutation({
    mutationFn: ({ record, status }: { record: AdminUserRecord; status: AdminUserRecord["status"] }) =>
      adminClient.updateAdminUser(record.id, { status }),
    onSuccess: async () => {
      toast.success("Admin account updated");
      await refresh();
    },
    onError: (reason) =>
      toast.error(reason instanceof Error ? reason.message : "Could not update admin"),
  });

  const reset = useMutation({
    mutationFn: () => adminClient.resetAdminUserPassword(resetTarget!.id, resetPassword),
    onSuccess: async () => {
      toast.success("Password reset and sessions revoked");
      setResetTarget(null);
      setResetPassword("");
      await refresh();
    },
    onError: (reason) =>
      toast.error(reason instanceof Error ? reason.message : "Could not reset password"),
  });

  const revokeSessions = useMutation({
    mutationFn: (record: AdminUserRecord) => adminClient.revokeAdminUserSessions(record.id),
    onSuccess: async () => {
      toast.success("Admin sessions revoked");
      await refresh();
    },
    onError: (reason) =>
      toast.error(reason instanceof Error ? reason.message : "Could not revoke sessions"),
  });

  function openCreate() {
    setCreateForm(emptyCreateForm(defaultRole));
    setCreateOpen(true);
  }

  function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate();
  }

  function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    reset.mutate();
  }

  if (!canManage) {
    return (
      <Alert variant="warning">
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>You do not have permission to manage admin accounts.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">Account administration</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Create Admin</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            {identity.role === "super_admin"
              ? "Create game admin accounts with access to the four game management consoles only."
              : "Create and manage admin accounts across the platform."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus />
          Create admin
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Visible accounts</CardDescription>
            <CardTitle className="text-3xl">{visibleAdmins.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active game admins</CardDescription>
            <CardTitle className="text-3xl">
              {visibleAdmins.filter((item) => item.role === "game_operator" && item.status === "active").length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Your role</CardDescription>
            <CardTitle className="text-xl capitalize">{roleLabel(identity.role)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-5" />
              Admin accounts
            </CardTitle>
            <CardDescription>
              Super admins can only manage game operator accounts. Dev super admins can manage all roles.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refresh()} disabled={admins.isFetching}>
            {admins.isFetching ? <Loader2 className="animate-spin" /> : <RefreshCw />}
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          {admins.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Loader2 className="size-4 animate-spin" />
              Loading admin accounts…
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Admin</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleAdmins.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{record.display_name}</p>
                        <p className="text-xs text-slate-500">{record.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {roleLabel(record.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          record.status === "active"
                            ? "success"
                            : record.status === "locked"
                              ? "warning"
                              : "secondary"
                        }
                        className="capitalize"
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={record.id === identity.id || updateStatus.isPending}
                          onClick={() =>
                            updateStatus.mutate({
                              record,
                              status: record.status === "active" ? "disabled" : "active",
                            })
                          }
                        >
                          {record.status === "active" ? "Disable" : "Enable"}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setResetTarget(record)}>
                          <KeyRound className="size-4" />
                          Reset password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={revokeSessions.isPending}
                          onClick={() => revokeSessions.mutate(record)}
                        >
                          <Shield className="size-4" />
                          Revoke sessions
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create admin account</DialogTitle>
            <DialogDescription>
              New accounts must use a strong password and will be forced to change it on first login.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitCreate}>
            <div className="space-y-2">
              <Label htmlFor="admin-email">Email</Label>
              <Input
                id="admin-email"
                type="email"
                required
                value={createForm.email}
                onChange={(event) => setCreateForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-name">Display name</Label>
              <Input
                id="admin-name"
                required
                value={createForm.display_name}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, display_name: event.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-role">Role</Label>
              <Select
                value={createForm.role}
                onValueChange={(value) =>
                  setCreateForm((current) => ({ ...current, role: value as AdminRole }))
                }
              >
                <SelectTrigger id="admin-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {assignableRoles.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {roleLabel(role)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="admin-password">Temporary password</Label>
              <Input
                id="admin-password"
                type="password"
                required
                minLength={12}
                value={createForm.password}
                onChange={(event) =>
                  setCreateForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="animate-spin" /> : null}
                Create account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resetTarget)} onOpenChange={(open) => !open && setResetTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new temporary password for {resetTarget?.display_name}. All active sessions will be revoked.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitReset}>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New temporary password</Label>
              <Input
                id="reset-password"
                type="password"
                required
                minLength={12}
                value={resetPassword}
                onChange={(event) => setResetPassword(event.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={reset.isPending}>
                {reset.isPending ? <Loader2 className="animate-spin" /> : null}
                Reset password
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
