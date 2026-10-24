/** Money arrives from the API as exact decimal strings; this only formats them for reading. */
export function naira(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n) : String(value);
}

/** Dates are shown in the time zone the businesses work in, whatever the staff member's laptop says. */
export function lagos(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString("en-NG", { timeZone: "Africa/Lagos", dateStyle: "medium", timeStyle: "short" }) : "—";
}

/** "AWAITING_PAYMENT" -> "Awaiting payment" */
export const words = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
