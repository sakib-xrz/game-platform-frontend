"use client";

import clsx from "clsx";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ToastKind } from "@/lib/toast";

function ToastIcon({ kind }: { kind: ToastKind }) {
  switch (kind) {
    case "success":
      return <CheckCircle2 className="size-4 shrink-0 text-emerald-400" aria-hidden="true" />;
    case "error":
      return <AlertCircle className="size-4 shrink-0 text-rose-400" aria-hidden="true" />;
    case "warning":
      return <AlertTriangle className="size-4 shrink-0 text-amber-400" aria-hidden="true" />;
    case "info":
    default:
      return <Info className="size-4 shrink-0 text-sky-400" aria-hidden="true" />;
  }
}

export function ToastContainer({ className }: { className?: string }) {
  const { activeToast, toast } = useToast();

  if (!activeToast) return null;

  const isError = activeToast.kind === "error";

  return (
    <div
      className={clsx(
        "pointer-events-none fixed inset-x-0 top-0 z-[9999] flex justify-center px-4 pt-[max(14px,env(safe-area-inset-top))]",
        className,
      )}
      aria-live={isError ? "assertive" : "polite"}
      aria-atomic="true"
    >
      <div
        key={activeToast.id}
        role={isError ? "alert" : "status"}
        className={clsx(
          "toast-in pointer-events-auto flex max-w-[calc(100vw-32px)] items-center gap-2 rounded-full border px-4 py-2.5 text-center text-[12px] font-extrabold shadow-2xl backdrop-blur-md select-none",
          activeToast.kind === "success" &&
            "border-emerald-400/40 bg-[#083520]/95 text-emerald-100 shadow-[0_10px_30px_rgba(4,120,87,0.45)]",
          activeToast.kind === "error" &&
            "border-rose-400/40 bg-[#420c17]/95 text-rose-100 shadow-[0_10px_30px_rgba(225,29,72,0.45)]",
          activeToast.kind === "info" &&
            "border-sky-400/40 bg-[#0b2746]/95 text-sky-100 shadow-[0_10px_30px_rgba(14,165,233,0.45)]",
          activeToast.kind === "warning" &&
            "border-amber-400/40 bg-[#422206]/95 text-amber-100 shadow-[0_10px_30px_rgba(245,158,11,0.45)]",
        )}
      >
        <ToastIcon kind={activeToast.kind} />
        <span className="line-clamp-2 leading-snug">{activeToast.message}</span>
        <button
          type="button"
          onClick={() => toast.dismiss(activeToast.id)}
          className="ml-1 -mr-1 inline-flex size-4 shrink-0 items-center justify-center rounded-full opacity-70 transition-opacity hover:opacity-100 focus:outline-none"
          aria-label="Dismiss notification"
        >
          <X className="size-3" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
