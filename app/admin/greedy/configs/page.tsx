"use client";

import Link from "next/link";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { ArrowRight, Boxes, Plus, RefreshCw, Upload } from "lucide-react";
import { useAdminConfigs } from "@/hooks/use-admin";
import type { AdminConfigVersion } from "@/types/admin";
import { ErrorState, LoadingState, PageHeader, StatusPill } from "@/components/admin/admin-ui";

const column = createColumnHelper<AdminConfigVersion>();
const columns = [column.accessor("version", { header: "Version", cell: (info) => <strong>v{info.getValue()}</strong> }), column.accessor("status", { header: "Status", cell: (info) => <StatusPill status={info.getValue()} /> }), column.display({ id: "content", header: "Contents", cell: ({ row }) => <span>{row.original.options.length} options · {row.original.chip_values.filter((item) => item.is_enabled).length} chips</span> }), column.accessor("betting_duration_ms", { header: "Betting", cell: (info) => `${Math.round(info.getValue() / 1000)} sec` }), column.accessor("created_at", { header: "Created", cell: (info) => new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(info.getValue())) }), column.display({ id: "actions", header: "", cell: ({ row }) => <Link className="admin-table-link" href={`/admin/greedy/configs/${row.original.id}`}>Open <ArrowRight /></Link> })];

export default function ConfigsPage() {
  const query = useAdminConfigs();
  const table = useReactTable({ data: query.data || [], columns, getCoreRowModel: getCoreRowModel() });
  if (query.isLoading) return <LoadingState label="Loading configuration history…" />;
  if (query.isError || !query.data) return <ErrorState message={(query.error as Error)?.message || "Configuration API unavailable"} onRetry={() => query.refetch()} />;
  return <><PageHeader eyebrow="Greedy / configuration" title="Game configurations" description="Immutable versions make every future round reproducible and reviewable." action={<><button className="admin-secondary-button" onClick={() => query.refetch()}><RefreshCw className={query.isFetching ? "admin-spin" : ""} /> Refresh</button><Link href="/admin/greedy/configs/new" className="admin-primary-button"><Plus /> New draft</Link></>} />
    <section className="admin-callout"><Boxes /><div><strong>Publish with care.</strong><p>Publishing retires the current version for future rounds. Rounds already in progress keep their frozen configuration.</p></div></section>
    <article className="admin-panel admin-table-panel"><div className="admin-panel__top"><div><span className="admin-eyebrow">Version history</span><h2>{query.data.length} configuration versions</h2></div><Upload /></div><div className="admin-table-wrap"><table className="admin-table"><thead>{table.getHeaderGroups().map((headerGroup) => <tr key={headerGroup.id}>{headerGroup.headers.map((header) => <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>)}</tr>)}</thead><tbody>{table.getRowModel().rows.map((row) => <tr key={row.id}>{row.getVisibleCells().map((cell) => <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>)}</tr>)}</tbody></table></div>{query.data.length === 0 && <div className="admin-empty"><p>No drafts or published configurations yet.</p><Link href="/admin/greedy/configs/new" className="admin-primary-button">Create configuration <ArrowRight /></Link></div>}</article>
  </>;
}
