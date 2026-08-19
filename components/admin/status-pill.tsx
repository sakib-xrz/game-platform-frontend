export function StatusPill({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const tone = normalized === "running" || normalized === "published" || normalized === "betting_open" ? "is-positive" : normalized === "paused" || normalized === "draft" || normalized === "drawing" ? "is-warning" : normalized === "degraded" || normalized === "cancelled" ? "is-danger" : "";
  return <span className={`admin-status-pill ${tone}`}><i aria-hidden="true" />{status.replaceAll("_", " ")}</span>;
}
