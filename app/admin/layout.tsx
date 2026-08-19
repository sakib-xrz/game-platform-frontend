import { AdminProviders } from "@/components/admin/admin-providers";
import { AdminGate } from "@/components/admin/admin-gate";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AdminProviders><AdminGate>{children}</AdminGate></AdminProviders>;
}
