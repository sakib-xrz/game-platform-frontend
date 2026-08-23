"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function AdminLoginPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const data = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/session", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: data.get("email"), password: data.get("password") }) });
      const body = await response.json().catch(() => null) as { message?: string; data?: { identity?: { force_password_change?: boolean } } } | null;
      if (!response.ok) throw new Error(body?.message || "Admin login failed");
      router.replace(body?.data?.identity?.force_password_change ? "/admin/password" : "/admin"); router.refresh();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Admin login failed"); } finally { setBusy(false); }
  }
  return <div className="admin-root grid min-h-dvh place-items-center bg-slate-950 p-4"><Card className="w-full max-w-md border-slate-800"><CardHeader className="text-center"><div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl bg-slate-950 text-white"><LockKeyhole /></div><CardTitle className="text-2xl">Admin sign in</CardTitle><CardDescription>Use your protected Game Platform administrator account.</CardDescription></CardHeader><form onSubmit={submit}><CardContent className="space-y-4">{error && <Alert variant="destructive"><AlertTitle>Sign in failed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}<div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" autoComplete="username" required /></div><div className="space-y-2"><Label htmlFor="password">Password</Label><Input id="password" name="password" type="password" autoComplete="current-password" required /></div></CardContent><CardFooter className="mt-6"><Button className="w-full" size="lg" disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <LockKeyhole />}{busy ? "Signing in…" : "Sign in"}</Button></CardFooter></form></Card></div>;
}
