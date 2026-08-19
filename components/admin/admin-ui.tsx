"use client";

import { AlertTriangle, Check, CheckCircle2, ChevronDown, Loader2, RefreshCw, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Select from "@radix-ui/react-select";
import { StatusPill } from "@/components/admin/status-pill";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return <div className="admin-page-header"><div><span className="admin-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</div>;
}

export function MetricCard({ label, value, hint, tone = "" }: { label: string; value: string; hint: string; tone?: string }) {
  return <article className={`admin-metric-card ${tone}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></article>;
}

export function LoadingState({ label = "Loading console data…" }: { label?: string }) {
  return <div className="admin-loading"><Loader2 className="admin-spin" />{label}</div>;
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="admin-error-state"><AlertTriangle /><div><strong>Couldn’t load this view</strong><p>{message}</p>{onRetry && <button onClick={onRetry}><RefreshCw /> Try again</button>}</div></div>;
}

export function ConfirmDialog({ trigger, title, description, confirmLabel, confirmDisabled, destructive, onConfirm, children }: { trigger: ReactNode; title: string; description: string; confirmLabel: string; confirmDisabled?: boolean; destructive?: boolean; onConfirm: () => Promise<unknown> | void; children?: ReactNode }) {
  const [busy, setBusy] = useState(false);
  return <Dialog.Root><Dialog.Trigger asChild>{trigger}</Dialog.Trigger><Dialog.Portal><Dialog.Overlay className="admin-dialog-overlay" /><Dialog.Content className="admin-dialog"><Dialog.Close className="admin-dialog__close" aria-label="Close"><X /></Dialog.Close><Dialog.Title>{title}</Dialog.Title><Dialog.Description>{description}</Dialog.Description>{children}<div className="admin-dialog__actions"><Dialog.Close asChild><button className="admin-secondary-button">Keep open</button></Dialog.Close><button className={`admin-primary-button ${destructive ? "is-danger" : ""}`} disabled={busy || confirmDisabled} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{busy ? <Loader2 className="admin-spin" /> : <CheckCircle2 />}{confirmLabel}</button></div></Dialog.Content></Dialog.Portal></Dialog.Root>;
}

export function AdminSelect({ value, onValueChange, label, options, disabled }: { value: string; onValueChange: (value: string) => void; label: string; options: Array<{ value: string; label: string }>; disabled?: boolean }) {
  return <Select.Root value={value} onValueChange={onValueChange} disabled={disabled}>
    <Select.Trigger className="admin-select-trigger" aria-label={label}><Select.Value /><Select.Icon><ChevronDown /></Select.Icon></Select.Trigger>
    <Select.Portal><Select.Content className="admin-select-content" position="popper" sideOffset={6}><Select.Viewport>{options.map((option) => <Select.Item className="admin-select-item" value={option.value} key={option.value}><Select.ItemText>{option.label}</Select.ItemText><Select.ItemIndicator><Check /></Select.ItemIndicator></Select.Item>)}</Select.Viewport></Select.Content></Select.Portal>
  </Select.Root>;
}

export { StatusPill };
