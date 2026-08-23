import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const alertVariants = cva("relative grid w-full grid-cols-[0_1fr] items-start gap-y-0.5 rounded-lg border px-4 py-3 text-sm has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] has-[>svg]:gap-x-3 [&>svg]:size-4 [&>svg]:translate-y-0.5", { variants: { variant: { default: "border-slate-200 bg-white text-slate-950", destructive: "border-red-200 bg-red-50 text-red-800", success: "border-emerald-200 bg-emerald-50 text-emerald-800", warning: "border-amber-200 bg-amber-50 text-amber-900" } }, defaultVariants: { variant: "default" } });
function Alert({ className, variant, ...props }: React.ComponentProps<"div"> & VariantProps<typeof alertVariants>) { return <div role="alert" data-slot="alert" className={cn(alertVariants({ variant }), className)} {...props} />; }
function AlertTitle({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="alert-title" className={cn("col-start-2 font-medium leading-none", className)} {...props} />; }
function AlertDescription({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="alert-description" className={cn("col-start-2 text-sm opacity-90 [&_p]:leading-relaxed", className)} {...props} />; }
export { Alert, AlertTitle, AlertDescription };
