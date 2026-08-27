"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Loader2,
  Pause,
  Play,
  RefreshCw,
  Rocket,
  Settings2,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { ConfigEditor } from "@/components/admin/config-editor";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { canManageGames } from "@/lib/admin-permissions";
import type {
  AdminApproval,
  AdminConfigVersion,
  CreateAdminConfigInput,
} from "@/types/admin";
import { useAdminIdentity } from "@/components/admin/admin-gate";

type EditorState =
  | { mode: "create"; initial: CreateAdminConfigInput }
  | { mode: "edit"; config: AdminConfigVersion };

function configInput(config: AdminConfigVersion): CreateAdminConfigInput {
  return {
    betting_duration_ms: config.betting_duration_ms,
    lock_duration_ms: config.lock_duration_ms,
    drawing_duration_ms: config.drawing_duration_ms,
    result_duration_ms: config.result_duration_ms,
    min_bet: config.min_bet,
    max_single_bet: config.max_single_bet,
    max_round_bet: config.max_round_bet,
    notes: config.notes || "",
    options: config.options.map(
      ({
        code,
        name,
        image_url,
        asset_id,
        display_order,
        payout_numerator,
        payout_denominator,
        probability_weight,
        is_enabled,
      }) => ({
        code,
        name,
        image_url,
        asset_id,
        display_order,
        payout_numerator,
        payout_denominator,
        probability_weight,
        is_enabled,
      }),
    ),
    chip_values: config.chip_values.map(
      ({ amount, display_order, is_enabled }) => ({
        amount,
        display_order,
        is_enabled,
      }),
    ),
  };
}

function statusVariant(
  status: string,
): "success" | "warning" | "secondary" | "outline" {
  if (status === "published" || status === "running") return "success";
  if (status === "draft" || status === "paused" || status === "review_pending")
    return "warning";
  return "secondary";
}

function openEditorForConfig(config: AdminConfigVersion): EditorState {
  return { mode: "edit", config };
}

function saveLabel(config?: AdminConfigVersion) {
  if (!config) return "Create draft";
  return config.status === "published" ? "Save changes" : "Save draft";
}

const GAME_LABEL = "Lucky 77";
const PUBLISH_ACTION = "lucky_77.config.publish";

export function Lucky77AdminPanel() {
  const identity = useAdminIdentity();
  const queryClient = useQueryClient();
  const gameClient = adminClient.lucky77;
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [publishTarget, setPublishTarget] = useState<AdminConfigVersion | null>(
    null,
  );
  const runtime = useQuery({
    queryKey: ["admin", "lucky-77", "runtime"],
    queryFn: gameClient.runtime,
    refetchInterval: 5000,
  });
  const configs = useQuery({
    queryKey: ["admin", "lucky-77", "configs"],
    queryFn: gameClient.configs,
  });
  const approvals = useQuery({
    queryKey: ["admin", "approvals", "lucky-77"],
    queryFn: () => adminClient.approvalsPaged("?page=1&limit=100"),
    refetchInterval: 8000,
  });
  const canManage = canManageGames(identity.role);
  const gameApprovals = useMemo(
    () =>
      (approvals.data?.data || []).filter(
        (item) => item.action_type === PUBLISH_ACTION,
      ),
    [approvals.data],
  );

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "lucky-77"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "approvals"] }),
    ]);
  }
  const action = useMutation({
    mutationFn: async (next: "resume" | "pause") =>
      next === "resume" ? gameClient.resume() : gameClient.pause(),
    onSuccess: async (_data, next) => {
      toast.success(
        next === "resume"
          ? `${GAME_LABEL} resumed`
          : `${GAME_LABEL} paused safely`,
      );
      await refresh();
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error ? reason.message : "Runtime action failed",
      ),
  });

  const publish = useMutation({
    mutationFn: (id: string) => gameClient.publish(id),
    onSuccess: async (data) => {
      const result = data as { approval_id?: string };
      toast.success(
        result?.approval_id
          ? "Publish request submitted for approval"
          : "Configuration published",
      );
      setPublishTarget(null);
      await refresh();
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error ? reason.message : "Publish request failed",
      ),
  });
  const decide = useMutation({
    mutationFn: ({
      approval,
      decision,
    }: {
      approval: AdminApproval;
      decision: "approve" | "reject";
    }) =>
      decision === "approve"
        ? adminClient.approve(approval.id, `Reviewed from Manage ${GAME_LABEL}`)
        : adminClient.reject(approval.id, `Rejected from Manage ${GAME_LABEL}`),
    onSuccess: async (_data, variables) => {
      toast.success(`Publish request ${variables.decision}d`);
      await refresh();
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error ? reason.message : "Approval action failed",
      ),
  });
  const applyApproved = useMutation({
    mutationFn: gameClient.publishApproved,
    onSuccess: async () => {
      toast.success(`Approved ${GAME_LABEL} configuration is now live`);
      await refresh();
    },
    onError: (reason) =>
      toast.error(
        reason instanceof Error
          ? reason.message
          : "Approved configuration could not be applied",
      ),
  });

  async function save(payload: CreateAdminConfigInput) {
    if (!editor) return;
    if (editor.mode === "create") await gameClient.createConfig(payload);
    else await gameClient.updateConfig(editor.config.id, payload);
    toast.success(
      editor.mode === "create"
        ? "Configuration draft created"
        : editor.config.status === "published"
          ? "Configuration updated"
          : "Configuration draft updated",
    );
    setEditor(null);
    await refresh();
  }

  const editingConfig = editor?.mode === "edit" ? editor.config : undefined;
  const editorKey = editor
    ? editor.mode === "create"
      ? "create"
      : editor.config.id
    : "closed";
  const editorTitle =
    editor?.mode === "create"
      ? `Create ${GAME_LABEL} configuration`
      : `Manage version ${editingConfig?.version}`;
  const editorDescription =
    editor?.mode === "create"
      ? "Configure timing, bet limits, options, and chips. Save as a draft, then submit for approval."
      : editingConfig?.status === "published"
        ? "Edit timing, bet limits, options, and chips. Changes apply to this live version immediately."
        : "Edit timing, bet limits, options, and chips. Save as a draft, then submit for approval.";

  if (runtime.isLoading || configs.isLoading)
    return (
      <div className="grid min-h-64 place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-400" />
      </div>
    );
  if (runtime.isError || configs.isError)
    return (
      <Alert variant="destructive">
        <AlertTitle>{GAME_LABEL} administration is unavailable</AlertTitle>
        <AlertDescription>
          {(runtime.error || (configs.error as Error))?.message ||
            "The backend could not be reached."}
        </AlertDescription>
      </Alert>
    );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">
            Game administration
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">
            Manage {GAME_LABEL}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Control the runtime and publish versioned settings. The player
            snapshot automatically receives the newly published configuration.
          </p>
        </div>
        <Button variant="outline" onClick={() => void refresh()}>
          <RefreshCw /> Refresh
        </Button>
      </div>
      {!canManage && (
        <Alert variant="warning">
          <ShieldCheck />
          <AlertTitle>Read-only access</AlertTitle>
          <AlertDescription>
            Your admin role can inspect {GAME_LABEL} configuration but cannot
            change runtime or settings.
          </AlertDescription>
        </Alert>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Runtime status</CardDescription>
            <CardTitle className="flex items-center gap-2 text-2xl capitalize">
              <Badge variant={statusVariant(runtime.data?.status || "unknown")}>
                {runtime.data?.status || "unknown"}
              </Badge>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Active configuration</CardDescription>
            <CardTitle className="text-2xl">
              {runtime.data?.active_config_version?.version
                ? `Version ${runtime.data.active_config_version.version}`
                : "Not published"}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Current round</CardDescription>
            <CardTitle className="truncate text-base">
              {runtime.data?.current_round?.status?.replaceAll("_", " ") ||
                "No active round"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Runtime controls</CardTitle>
            <CardDescription>
              Pause finishes the active round safely; resume starts/continues
              round creation.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={
                !canManage ||
                action.isPending ||
                runtime.data?.status !== "running"
              }
              onClick={() => action.mutate("pause")}
            >
              <Pause /> Pause
            </Button>
            <Button
              disabled={
                !canManage ||
                action.isPending ||
                runtime.data?.status === "running"
              }
              onClick={() => action.mutate("resume")}
            >
              <Play /> Resume
            </Button>
          </div>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configuration versions</CardTitle>
            <CardDescription>
              Manage, clone and publish complete {GAME_LABEL} configurations.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>Bet limits</TableHead>
                <TableHead>Options / chips</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(configs.data || []).map((config) => (
                <TableRow key={config.id}>
                  <TableCell className="font-semibold">
                    v{config.version}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusVariant(config.status)}
                      className="capitalize"
                    >
                      {config.status.replaceAll("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-slate-500"
                      onClick={() => setEditor(openEditorForConfig(config))}
                    >
                      {config.betting_duration_ms / 1000}s bet ·{" "}
                      {config.drawing_duration_ms / 1000}s draw
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-slate-500"
                      onClick={() => setEditor(openEditorForConfig(config))}
                    >
                      {config.min_bet} – {config.max_round_bet}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="link"
                      className="h-auto p-0 text-slate-500"
                      onClick={() => setEditor(openEditorForConfig(config))}
                    >
                      {config.options.filter((item) => item.is_enabled).length}{" "}
                      /{" "}
                      {
                        config.chip_values.filter((item) => item.is_enabled)
                          .length
                      }
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditor(openEditorForConfig(config))}
                      >
                        <Settings2 /> Manage
                      </Button>
                      {config.status === "draft" && (
                        <Button
                          size="sm"
                          disabled={!canManage || publish.isPending}
                          onClick={() => setPublishTarget(config)}
                        >
                          <Rocket /> Publish
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{GAME_LABEL} publish approvals</CardTitle>
          <CardDescription>
            Publication requires review by another eligible administrator. The
            requester can apply an approved request from this page.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {gameApprovals.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gameApprovals.map((approval) => {
                  const requestedByMe =
                    approval.requested_by_admin_id === identity.id;
                  return (
                    <TableRow key={approval.id}>
                      <TableCell className="font-mono text-xs">
                        {approval.id}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            approval.status === "approved"
                              ? "success"
                              : approval.status === "pending"
                                ? "warning"
                                : "secondary"
                          }
                        >
                          {approval.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-500">
                        {new Date(approval.expires_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          {approval.status === "pending" && !requestedByMe && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={decide.isPending}
                                onClick={() =>
                                  decide.mutate({
                                    approval,
                                    decision: "reject",
                                  })
                                }
                              >
                                Reject
                              </Button>
                              <Button
                                size="sm"
                                disabled={decide.isPending}
                                onClick={() =>
                                  decide.mutate({
                                    approval,
                                    decision: "approve",
                                  })
                                }
                              >
                                Approve
                              </Button>
                            </>
                          )}
                          {approval.status === "approved" && requestedByMe && (
                            <Button
                              size="sm"
                              disabled={applyApproved.isPending}
                              onClick={() => applyApproved.mutate(approval.id)}
                            >
                              <Rocket /> Apply live
                            </Button>
                          )}
                          {approval.status === "pending" && requestedByMe && (
                            <span className="text-xs text-slate-500">
                              Waiting for another admin
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-slate-500">
              No {GAME_LABEL} publish approval requests are visible to this
              account.
            </p>
          )}
        </CardContent>
      </Card>
      <Sheet
        open={Boolean(editor)}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-4xl"
        >
          <SheetHeader>
            <SheetTitle>{editorTitle}</SheetTitle>
            <SheetDescription>{editorDescription}</SheetDescription>
          </SheetHeader>
          {editor && (
            <div className="space-y-4 px-4 pb-6">
              <ConfigEditor
                key={editorKey}
                initial={
                  editor.mode === "create"
                    ? editor.initial
                    : configInput(editor.config)
                }
                submitLabel={saveLabel(editingConfig)}
                readOnly={!canManage}
                onSave={save}
                validateConfig={gameClient.validateConfig}
                uploadAsset={gameClient.uploadAsset}
                gameLabel={GAME_LABEL}
                lockOptionCodes
              />
            </div>
          )}
        </SheetContent>
      </Sheet>
      <Dialog
        open={Boolean(publishTarget)}
        onOpenChange={(open) => {
          if (!open) setPublishTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Publish configuration v{publishTarget?.version}
            </DialogTitle>
            <DialogDescription>
              This submits the complete draft for independent approval. Once
              approved and applied, the {GAME_LABEL} user panel updates from its
              authoritative snapshot.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPublishTarget(null)}>
              Cancel
            </Button>
            <Button
              disabled={publish.isPending}
              onClick={() => publishTarget && publish.mutate(publishTarget.id)}
            >
              {publish.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Rocket />
              )}{" "}
              Submit for approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
