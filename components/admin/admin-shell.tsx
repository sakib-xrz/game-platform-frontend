"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Banknote, CircleDollarSign, Dices, LayoutDashboard, LogOut, Menu, ShieldCheck, Smartphone, Spade } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { adminFetch } from "@/lib/admin-client";
import { cn } from "@/lib/utils";
import type { AdminIdentity } from "@/types/admin";

const navigation: Array<{ href: string; label: string; icon: ComponentType<{ className?: string }> }> = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/greedy", label: "Manage Greedy", icon: Dices },
  { href: "/admin/teen-patti", label: "Manage Teen Patti", icon: Spade },
  { href: "/admin/lucky-77", label: "Manage Lucky 77", icon: ShieldCheck },
  { href: "/admin/apps", label: "Platform Apps", icon: Smartphone },
  { href: "/admin/balance", label: "Adjust User Balance", icon: CircleDollarSign },
];

function Navigation({ pathname, mobile = false }: { pathname: string; mobile?: boolean }) {
  return <nav className="grid gap-1 px-3">{navigation.map(({ href, label, icon: Icon }) => {
    const active = pathname === href;
    const link = <Link className={cn("flex h-10 items-center gap-3 rounded-lg px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-950", active && "bg-slate-950 text-white hover:bg-slate-900 hover:text-white")} href={href}><Icon className="size-4" />{label}</Link>;
    return mobile ? <SheetClose asChild key={href}>{link}</SheetClose> : <div key={href}>{link}</div>;
  })}</nav>;
}

function Brand() {
  return <div className="flex h-16 items-center gap-3 px-5"><span className="grid size-9 place-items-center rounded-xl bg-slate-950 text-sm font-black text-white shadow-sm">GP</span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">Game Platform</p><p className="text-xs text-slate-500">Administration</p></div></div>;
}

export function AdminShell({ children, identity }: { children: ReactNode; identity: AdminIdentity }) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() { await adminFetch("/session", { method: "DELETE" }); router.replace("/admin/login"); router.refresh(); }
  const initials = identity.display_name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <div className="admin-root min-h-dvh bg-slate-50 font-sans text-slate-950">
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col"><Brand /><Separator /><div className="flex-1 py-4"><Navigation pathname={pathname} /></div><Separator /><div className="space-y-3 p-4"><div className="flex items-center gap-3"><Avatar><AvatarFallback>{initials || "A"}</AvatarFallback></Avatar><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{identity.display_name}</p><Badge variant="secondary" className="mt-1 capitalize">{identity.role.replaceAll("_", " ")}</Badge></div></div><Button variant="outline" className="w-full justify-start" onClick={logout}><LogOut /> Sign out</Button></div></aside>
    <div className="lg:pl-64"><header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-8"><Sheet><SheetTrigger asChild><Button variant="outline" size="icon" className="lg:hidden"><Menu /><span className="sr-only">Open navigation</span></Button></SheetTrigger><SheetContent side="left" className="w-72 p-0"><SheetHeader className="sr-only"><SheetTitle>Admin navigation</SheetTitle><SheetDescription>Open an admin page.</SheetDescription></SheetHeader><Brand /><Separator /><div className="py-4"><Navigation pathname={pathname} mobile /></div></SheetContent></Sheet><div className="flex min-w-0 flex-1 items-center gap-3"><Banknote className="hidden size-5 text-slate-400 sm:block" /><div className="min-w-0"><p className="truncate text-sm font-semibold">Operations Console</p><p className="truncate text-xs text-slate-500">Protected admin session</p></div></div><Badge variant="success" className="gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> Authenticated</Badge></header><main className="mx-auto w-full max-w-[1500px] p-4 md:p-8">{children}</main></div>
  </div>;
}
