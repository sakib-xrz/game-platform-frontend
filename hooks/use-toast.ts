"use client";

import { useEffect, useState } from "react";
import {
  toast,
  toastManager,
  showToast,
  pushToast,
  type ToastItem,
  type ToastKind,
  type ToastOptions,
} from "@/lib/toast";

export function useToast() {
  const [activeToast, setActiveToast] = useState<ToastItem | null>(() =>
    toastManager.getCurrent(),
  );

  useEffect(() => {
    return toastManager.subscribe((item) => {
      setActiveToast(item);
    });
  }, []);

  return {
    activeToast,
    toast,
    showToast,
    pushToast,
    dismissToast: toast.dismiss,
  };
}

export type { ToastItem, ToastKind, ToastOptions };
