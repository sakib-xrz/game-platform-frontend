import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" className={cn("flex h-9 w-full min-w-0 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm text-slate-950 shadow-sm outline-none placeholder:text-slate-400 focus-visible:border-slate-400 focus-visible:ring-2 focus-visible:ring-slate-200 disabled:cursor-not-allowed disabled:opacity-50", className)} {...props} />;
}

export { Input };
