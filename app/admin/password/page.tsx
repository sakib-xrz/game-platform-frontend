"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { adminFetch } from "@/lib/admin-client";

export default function ChangeAdminPasswordPage() {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); setBusy(true); setError(""); const data = new FormData(event.currentTarget); const next = String(data.get("new_password") || ""); if (next !== String(data.get("confirm_password") || "")) { setError("New passwords do not match"); setBusy(false); return; } try { await adminFetch("/auth/password/change", { method: "POST", body: JSON.stringify({ current_password: data.get("current_password"), new_password: next }) }); router.replace("/admin"); router.refresh(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Password change failed"); } finally { setBusy(false); } }
  return <div className="mx-auto max-w-xl"><Card><CardHeader><CardTitle>Set a new admin password</CardTitle><CardDescription>Your account requires a password change before administration controls can be used.</CardDescription></CardHeader><form onSubmit={submit}><CardContent className="space-y-4">{error && <Alert variant="destructive"><AlertTitle>Password not changed</AlertTitle><AlertDescription>{error}</AlertDescription></Alert>}<div className="space-y-2"><Label htmlFor="current_password">Current password</Label><Input id="current_password" name="current_password" type="password" required /></div><div className="space-y-2"><Label htmlFor="new_password">New password</Label><Input id="new_password" name="new_password" type="password" minLength={12} required /></div><div className="space-y-2"><Label htmlFor="confirm_password">Confirm new password</Label><Input id="confirm_password" name="confirm_password" type="password" minLength={12} required /></div></CardContent><CardFooter className="mt-6 justify-end"><Button disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <KeyRound />}{busy ? "Changing…" : "Change password"}</Button></CardFooter></form></Card></div>;
}
