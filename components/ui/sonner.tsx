"use client";

import { Toaster as Sonner, type ToasterProps } from "sonner";
function Toaster(props: ToasterProps) { return <Sonner theme="light" className="toaster group" toastOptions={{ classNames: { toast: "group toast border-slate-200 bg-white text-slate-950 shadow-lg", description: "text-slate-500", actionButton: "bg-slate-950 text-white", cancelButton: "bg-slate-100 text-slate-700" } }} {...props} />; }
export { Toaster };
