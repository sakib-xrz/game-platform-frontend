export type ToastKind = "success" | "error" | "info" | "warning";

export type ToastItem = {
  id: string | number;
  kind: ToastKind;
  message: string;
  durationMs?: number;
  createdAt: number;
};

export type ToastOptions = {
  durationMs?: number;
  id?: string | number;
};

type ToastListener = (toast: ToastItem | null) => void;

class ToastManager {
  private listeners: Set<ToastListener> = new Set();
  private currentToast: ToastItem | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private nextId = 0;

  subscribe(listener: ToastListener): () => void {
    this.listeners.add(listener);
    listener(this.currentToast);
    return () => {
      this.listeners.delete(listener);
    };
  }

  show(kind: ToastKind, message: string, options?: ToastOptions): string | number {
    const id = options?.id ?? `toast-${++this.nextId}`;
    const durationMs =
      options?.durationMs ?? (kind === "error" ? 3400 : 2600);

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const item: ToastItem = {
      id,
      kind,
      message,
      durationMs,
      createdAt: Date.now(),
    };

    this.currentToast = item;
    this.notify();

    if (typeof window !== "undefined") {
      this.timer = setTimeout(() => {
        if (this.currentToast?.id === id) {
          this.currentToast = null;
          this.notify();
        }
      }, durationMs);
    }

    return id;
  }

  dismiss(id?: string | number) {
    if (!id || this.currentToast?.id === id) {
      if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
      }
      this.currentToast = null;
      this.notify();
    }
  }

  getCurrent(): ToastItem | null {
    return this.currentToast;
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener(this.currentToast);
      } catch (error) {
        console.error("Error in toast listener:", error);
      }
    });
  }
}

export const toastManager = new ToastManager();

export const toast = {
  show: (kind: ToastKind, message: string, options?: ToastOptions) =>
    toastManager.show(kind, message, options),
  success: (message: string, options?: ToastOptions) =>
    toastManager.show("success", message, options),
  error: (message: string, options?: ToastOptions) =>
    toastManager.show("error", message, options),
  info: (message: string, options?: ToastOptions) =>
    toastManager.show("info", message, options),
  warning: (message: string, options?: ToastOptions) =>
    toastManager.show("warning", message, options),
  dismiss: (id?: string | number) => toastManager.dismiss(id),
};

export const showToast = (
  kind: ToastKind,
  message: string,
  options?: ToastOptions,
) => toastManager.show(kind, message, options);

export const pushToast = showToast;
