"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Activity, Banknote, Boxes, FileClock, LayoutDashboard, LogOut, Menu, Settings2, ShieldCheck, WalletCards, X, Bell } from "lucide-react";
import { useState, type ReactNode } from "react";
import { adminFetch } from "@/lib/admin-client";
import type { AdminIdentity, AdminRole } from "@/types/admin";

const nav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, roles: ["super_admin", "game_operator", "finance_operator", "auditor"] },
  { href: "/admin/greedy", label: "Live operations", icon: Activity, roles: ["super_admin", "game_operator", "auditor"] },
  { href: "/admin/greedy/configs", label: "Game configs", icon: Boxes, roles: ["super_admin", "game_operator", "auditor"] },
  { href: "/admin/rounds", label: "Rounds", icon: FileClock, roles: ["super_admin", "game_operator", "finance_operator", "support", "auditor"] },
  { href: "/admin/players", label: "Players", icon: ShieldCheck, roles: ["super_admin", "finance_operator", "support", "auditor"] },
  { href: "/admin/finance", label: "Finance", icon: WalletCards, roles: ["super_admin", "finance_operator"] },
  { href: "/admin/audit", label: "Audit log", icon: FileClock, roles: ["super_admin", "auditor"] },
  { href: "/admin/alerts", label: "System health", icon: Bell, roles: ["super_admin", "game_operator", "auditor"] },
  { href: "/admin/settings", label: "Settings", icon: Settings2, roles: ["super_admin"] },
];

export function AdminShell({ children, identity }: { children: ReactNode; identity: AdminIdentity }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const logout = async () => { await adminFetch("/session", { method: "DELETE" }); router.replace("/admin/login"); };
  return <div className="admin-app">
    <aside className={`admin-sidebar ${open ? "is-open" : ""}`}>
      <div className="admin-brand"><span className="admin-brand__mark">G</span><span><strong>Greedy</strong><small>Operations console</small></span><button className="admin-sidebar__close" onClick={() => setOpen(false)} aria-label="Close navigation"><X /></button></div>
      <nav aria-label="Admin navigation">{nav.filter((item) => (item.roles as readonly AdminRole[]).includes(identity.role)).map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setOpen(false)} className={`admin-nav-link ${pathname === href || (href !== "/admin" && pathname.startsWith(href)) ? "is-active" : ""}`}><Icon />{label}</Link>)}</nav>
      <div className="admin-sidebar__footer"><div className="admin-identity"><span>{identity.display_name.slice(0, 1).toUpperCase()}</span><div><strong>{identity.display_name}</strong><small>{identity.role.replaceAll("_", " ")}</small></div></div><button onClick={logout} className="admin-logout"><LogOut /> Sign out</button></div>
    </aside>
    {open && <button className="admin-sidebar__scrim" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <div className="admin-main"><header className="admin-topbar"><button className="admin-menu" onClick={() => setOpen(true)} aria-label="Open navigation"><Menu /></button><div><span className="admin-eyebrow">CONTROL PLANE</span><strong>Greedy game operations</strong></div><div className="admin-topbar__right"><span className="admin-live-dot" /> <span>Protected session</span><Banknote /></div></header><main className="admin-content">{children}</main></div>
  </div>;
}
