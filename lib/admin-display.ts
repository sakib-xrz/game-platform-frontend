export function formatAdminAmount(value: string | number | bigint | null | undefined) {
  if (value === null || value === undefined || value === "") return "—";
  try {
    return BigInt(value).toLocaleString("en-US");
  } catch {
    return String(value);
  }
}

export function formatUtc(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).format(date)} UTC`;
}

export function humanizeAdminValue(value: string) {
  return value.replaceAll("_", " ");
}
