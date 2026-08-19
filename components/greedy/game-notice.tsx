"use client";

import clsx from "clsx";
import type { GameNotice as NoticeType } from "@/hooks/use-greedy-game";

export function GameNotice({ notice }: { notice: NoticeType }) {
  if (!notice) return null;
  return (
    <div
      role={notice.kind === "error" ? "alert" : "status"}
      aria-live={notice.kind === "error" ? "assertive" : "polite"}
      className={clsx(
        "toast-in fixed left-1/2 top-[max(16px,env(safe-area-inset-top))] z-[70] max-w-[calc(100%_-_32px)] -translate-x-1/2 rounded-full border px-4 py-2.5 text-center text-[12px] font-extrabold shadow-xl",
        notice.kind === "success" && "border-emerald-200 bg-emerald-600 text-white",
        notice.kind === "error" && "border-red-200 bg-red-600 text-white",
        notice.kind === "info" && "border-blue-200 bg-blue-600 text-white",
      )}
    >
      {notice.message}
    </div>
  );
}
