"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) { return <DialogPrimitive.Root data-slot="dialog" {...props} />; }
function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) { return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />; }
function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) { return <DialogPrimitive.Close data-slot="dialog-close" {...props} />; }
function DialogContent({ className, children, showCloseButton = true, ...props }: React.ComponentProps<typeof DialogPrimitive.Content> & { showCloseButton?: boolean }) { return <DialogPrimitive.Portal><DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" /><DialogPrimitive.Content data-slot="dialog-content" className={cn("fixed top-1/2 left-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-lg sm:max-w-lg", className)} {...props}>{children}{showCloseButton && <DialogPrimitive.Close className="absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-slate-400"><X className="size-4" /><span className="sr-only">Close</span></DialogPrimitive.Close>}</DialogPrimitive.Content></DialogPrimitive.Portal>; }
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="dialog-header" className={cn("flex flex-col gap-2 text-center sm:text-left", className)} {...props} />; }
function DialogFooter({ className, ...props }: React.ComponentProps<"div">) { return <div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />; }
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) { return <DialogPrimitive.Title data-slot="dialog-title" className={cn("text-lg font-semibold leading-none", className)} {...props} />; }
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) { return <DialogPrimitive.Description data-slot="dialog-description" className={cn("text-sm text-slate-500", className)} {...props} />; }
export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };
