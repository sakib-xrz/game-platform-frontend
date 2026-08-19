"use client";

import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AdminShell } from "@/components/admin/admin-shell";
import type { AdminIdentity, AdminSession } from "@/types/admin";

const AdminIdentityContext = createContext<AdminIdentity | null>(null);

export function useAdminIdentity() {
  const identity = useContext(AdminIdentityContext);
  if (!identity) throw new Error("Admin identity is unavailable outside the protected console");
  return identity;
}

export function AdminGate({ children }: { children: ReactNode }) {
  const pathname = usePathname(); const router = useRouter(); const [state, setState] = useState<AdminSession | null>(null); const [loading, setLoading] = useState(pathname !== "/admin/login");
  useEffect(() => { if (pathname === "/admin/login") return; let active = true; fetch("/api/admin/session", { credentials: "include", cache: "no-store" }).then(async (response) => { if (!response.ok) { router.replace("/admin/login"); return; } const body = await response.json() as { data: AdminSession }; if (active && body.data.identity.force_password_change && pathname !== "/admin/password") { router.replace("/admin/password"); return; } if (active && body.data.identity.role === "support" && pathname === "/admin") { router.replace("/admin/players"); return; } if (active) setState(body.data); }).catch(() => router.replace("/admin/login")).finally(() => { if (active) setLoading(false); }); return () => { active = false; }; }, [pathname, router]);
  if (pathname === "/admin/login") return <>{children}</>;
  if (loading || !state) return <div className="admin-loading"><span className="admin-live-dot" /> Verifying secure session…</div>;
  return <AdminIdentityContext.Provider value={state.identity}><AdminShell identity={state.identity}>{children}</AdminShell></AdminIdentityContext.Provider>;
}
