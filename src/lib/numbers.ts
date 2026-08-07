import { prisma } from "./prisma";

// App-generated sequential numbers (ORD-1001, INV-1120…). Single-shop safe;
// a Postgres sequence per prefix is the Phase 5 upgrade if concurrency grows.
export async function nextNumber(prefix: "ORD" | "EST" | "INV" | "PAY" | "TKT" | "JOB") {
  const table: Record<string, () => Promise<{ number: string } | null>> = {
    ORD: () => prisma.order.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    EST: () => prisma.estimate.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    INV: () => prisma.invoice.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    PAY: () => prisma.payment.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    TKT: () => prisma.serviceTicket.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
    JOB: () => prisma.productionJob.findFirst({ orderBy: { number: "desc" }, select: { number: true } }),
  };
  const last = await table[prefix]();
  const n = last ? parseInt(last.number.split("-")[1] || "1000", 10) + 1 : 1001;
  return `${prefix}-${n}`;
}
