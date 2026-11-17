"use client";

import { useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Loader2, Play, RefreshCw, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { adminClient } from "@/lib/admin-client";
import type { PlatformAppRecord } from "@/types/admin";

interface WalletDiagnosticsModalProps {
  app: PlatformAppRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type TestReport = {
  overall_status: "SUCCESS" | "WARNING" | "FAILED";
  duration_ms: number;
  tests: Array<{
    name: string;
    endpoint: string;
    passed: boolean;
    status_code?: number;
    message: string;
    latency_ms: number;
  }>;
};

export function WalletDiagnosticsModal({
  app,
  open,
  onOpenChange,
}: WalletDiagnosticsModalProps) {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<TestReport | null>(null);

  if (!app) return null;

  const runTest = async () => {
    setRunning(true);
    setReport(null);
    try {
      const data = await adminClient.testPlatformAppWallet(app.id, "diag_user_001");
      setReport(data);
      if (data.overall_status === "SUCCESS") {
        toast.success("All integration tests passed successfully!");
      } else {
        toast.error("One or more integration checks failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to execute wallet test suite");
    } finally {
      setRunning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl md:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Zap className="size-5 text-amber-500" />
            <DialogTitle>Seamless Wallet Diagnostic Suite</DialogTitle>
          </div>
          <DialogDescription>
            Validating live HMAC-SHA256 connectivity and webhook responses for <strong>{app.app_name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1 font-mono">
            <div><span className="text-slate-400">Target URL:</span> {app.wallet_base_url || "Not configured"}</div>
            <div><span className="text-slate-400">Wallet Mode:</span> {app.wallet_mode || "local"}</div>
          </div>

          {!report && !running && (
            <div className="text-center py-8 space-y-3">
              <Zap className="mx-auto size-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">Ready to run 4-point verification check</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Tests balance reading, HMAC canonical headers, replay window freshness, and transaction lookup recovery.
              </p>
              <Button onClick={runTest} className="mt-2 bg-indigo-600 hover:bg-indigo-700">
                <Play className="size-4 mr-1.5" /> Start Diagnostics
              </Button>
            </div>
          )}

          {running && (
            <div className="text-center py-12 space-y-3">
              <Loader2 className="mx-auto size-8 animate-spin text-indigo-600" />
              <p className="text-sm font-medium text-slate-700">Testing host wallet endpoints with HMAC signing...</p>
            </div>
          )}

          {report && (
            <div className="space-y-3">
              <div
                className={`p-3 rounded-lg border flex items-center justify-between text-xs font-semibold ${
                  report.overall_status === "SUCCESS"
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : "bg-red-50 border-red-200 text-red-800"
                }`}
              >
                <div className="flex items-center gap-2">
                  {report.overall_status === "SUCCESS" ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-red-600" />
                  )}
                  <span>Overall Status: {report.overall_status}</span>
                </div>
                <span>Total Latency: {report.duration_ms}ms</span>
              </div>

              <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {report.tests.map((t, idx) => (
                  <div key={idx} className="p-3 text-xs flex items-start justify-between bg-white hover:bg-slate-50">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {t.passed ? (
                          <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                        ) : (
                          <XCircle className="size-4 text-red-500 shrink-0" />
                        )}
                        <strong className="font-semibold text-slate-900">{t.name}</strong>
                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                          {t.endpoint}
                        </span>
                      </div>
                      <p className={`pl-6 ${t.passed ? "text-slate-600" : "text-red-600 font-medium"}`}>
                        {t.message}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400 shrink-0 pl-2">
                      {t.latency_ms}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {report && (
            <Button variant="outline" size="sm" onClick={runTest} disabled={running}>
              <RefreshCw className="size-3.5 mr-1.5" /> Re-test
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
