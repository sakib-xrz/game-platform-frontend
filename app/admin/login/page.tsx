"use client";

import { useState } from "react";
import { ArrowRight, KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { const response = await fetch("/api/admin/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }); const body = await response.json(); if (!response.ok) throw new Error(body.message || "Could not sign in"); router.replace("/admin"); router.refresh(); } catch (e) { setError(e instanceof Error ? e.message : "Could not sign in"); } finally { setBusy(false); }
  }
  return <main className="admin-login"><div className="admin-login__glow" /><section className="admin-login__card"><div className="admin-brand admin-brand--login"><span className="admin-brand__mark">G</span><span><strong>Greedy</strong><small>Operations console</small></span></div><span className="admin-login__badge"><ShieldCheck /> Private admin access</span><h1>Welcome back.</h1><p>Sign in to monitor live rounds, publish game configurations, and manage operations.</p><form onSubmit={submit}><label>Email<input autoFocus type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="operator@example.com" required /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter your password" required /></label>{error && <div className="admin-form-error" role="alert">{error}</div>}<button className="admin-primary-button" disabled={busy}>{busy ? "Verifying…" : "Enter console"}<ArrowRight /></button></form><div className="admin-login__note"><KeyRound /> Credentials are exchanged only with this same-origin server.</div></section></main>;
}
