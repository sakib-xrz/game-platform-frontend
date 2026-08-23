import type { ReactNode } from "react";
import { AdminGate } from "@/components/admin/admin-gate";
import { AdminProviders } from "@/components/admin/admin-providers";
import { Toaster } from "@/components/ui/sonner";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminProviders><AdminGate>{children}</AdminGate><Toaster richColors position="top-right" /></AdminProviders>;
}
