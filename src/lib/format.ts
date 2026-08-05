export const money = (n: number | string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Number(n));

export const dateFmt = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open", PRODUCTION: "In Production", INSTALL: "In Install", COMPLETED: "Completed", ON_HOLD: "On Hold",
};

export function mapHref(addr?: string | null, city?: string | null, state?: string | null, zip?: string | null) {
  const parts = [addr, city, [state, zip].filter(Boolean).join(" ")].filter((p) => p && p !== "TBD");
  if (!parts.length || addr === "TBD") return null;
  return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(parts.join(", "));
}
