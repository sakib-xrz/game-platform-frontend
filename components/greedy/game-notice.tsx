"use client";

import { useEffect } from "react";
import { showToast } from "@/lib/toast";
import { ToastContainer } from "@/components/toast/toast-container";

type NoticeType = {
  id: number;
  kind: "success" | "error" | "info";
  message: string;
} | null;

/**
 * @deprecated Toasts are now automatically displayed from the top center via `<ToastContainer />` in RootLayout.
 */
export function GameNotice({
  notice,
}: {
  notice?: NoticeType;
  className?: string;
}) {
  useEffect(() => {
    if (notice?.message) {
      showToast(notice.kind, notice.message);
    }
  }, [notice]);

  return null;
}

export { ToastContainer };
