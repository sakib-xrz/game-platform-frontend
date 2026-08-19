"use client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/admin/admin-ui";
import { ConfigEditor, newConfigDefaults } from "@/components/admin/config-editor";
import { adminClient } from "@/lib/admin-client";
export default function NewConfigPage() { const router = useRouter(); return <><PageHeader eyebrow="Greedy / configuration" title="Build a game draft" description="Create an immutable, reviewed setup for future rounds." action={<Link href="/admin/greedy/configs" className="admin-secondary-button"><ArrowLeft /> Back to versions</Link>} /><ConfigEditor initial={newConfigDefaults} submitLabel="Save draft" onSave={async (payload) => { await adminClient.createConfig(payload); router.push("/admin/greedy/configs"); }} /></>; }
