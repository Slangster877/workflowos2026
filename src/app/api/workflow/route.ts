import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";

const text = (value: unknown) => value == null ? "" : String(value);
const number = (value: unknown, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
const date = (value: unknown) => value ? new Date(String(value)) : null;

export async function GET(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  const module = req.nextUrl.searchParams.get("module");
  let rows: Record<string, unknown>[] = [];

  if (module === "production") {
    const data = await prisma.productionJob.findMany({ include: { order: true, technician: true }, orderBy: { updatedAt: "desc" }, take: 200 });
    rows = data.map((r) => ({ ...r, order: r.order?.number, technician: r.technician?.name }));
  } else if (module === "installs" || module === "permits") {
    const data = await prisma.install.findMany({
      where: module === "permits" ? { permitRequired: { not: null } } : undefined,
      include: { order: { include: { client: true } }, crewLead: true }, orderBy: { scheduledAt: "asc" }, take: 200,
    });
    rows = data.map((r) => ({ ...r, order: r.order.number, client: r.order.client.company, crewLead: r.crewLead?.name }));
  } else if (module === "proofs") {
    const data = await prisma.proof.findMany({ include: { order: { include: { client: true } } }, orderBy: { createdAt: "desc" }, take: 200 });
    rows = data.map((r) => ({ ...r, version: `V${r.version}`, order: r.order.number, client: r.order.client.company }));
  } else if (module === "schedule") {
    const data = await prisma.scheduleEvent.findMany({ include: { client: true, order: true }, orderBy: { startsAt: "asc" }, take: 200 });
    rows = data.map((r) => ({ ...r, client: r.client?.company, order: r.order?.number }));
  } else if (module === "service") {
    const data = await prisma.serviceTicket.findMany({ include: { client: true, assignedTo: true }, orderBy: { updatedAt: "desc" }, take: 200 });
    rows = data.map((r) => ({ ...r, client: r.client.company, assignedTo: r.assignedTo?.name }));
  } else if (module === "accounting") {
    const data = await prisma.invoice.findMany({ include: { client: true, order: true }, orderBy: { issuedAt: "desc" }, take: 200 });
    rows = data.map((r) => ({ ...r, total: Number(r.total), client: r.client.company, order: r.order?.number }));
  } else if (module === "files") {
    const [proofs, shipments, emails] = await Promise.all([
      prisma.proof.findMany({ include: { order: { include: { client: true } } }, orderBy: { createdAt: "desc" }, take: 75 }),
      prisma.shipment.findMany({ include: { order: { include: { client: true } } }, orderBy: { shippedAt: "desc" }, take: 75 }),
      prisma.emailRecord.findMany({ include: { order: { include: { client: true } } }, orderBy: { receivedAt: "desc" }, take: 75 }),
    ]);
    rows = [
      ...proofs.map((r) => ({ id: r.id, kind: "Proof", name: r.fileName, order: r.order.number, client: r.order.client.company, status: r.status, createdAt: r.createdAt })),
      ...shipments.map((r) => ({ id: r.id, kind: "Shipping", name: r.trackingNumber, order: r.order.number, client: r.order.client.company, status: r.status, createdAt: r.shippedAt })),
      ...emails.map((r) => ({ id: r.id, kind: "Email", name: r.subject, order: r.order?.number, client: r.order?.client.company, status: r.folder, createdAt: r.receivedAt })),
    ].sort((a, b) => +new Date(String(b.createdAt)) - +new Date(String(a.createdAt)));
  } else if (module === "ai-tools") {
    const [lateOrders, proofRevisions, productionBacklog, permitInstalls] = await Promise.all([
      prisma.order.count({ where: { dueAt: { lt: new Date() }, status: { not: "COMPLETED" }, deletedAt: null } }),
      prisma.proof.count({ where: { status: "REVISIONS" } }),
      prisma.productionJob.count({ where: { stage: { in: ["IN_PRODUCTION", "IN_ASSEMBLY"] } } }),
      prisma.install.count({ where: { permitRequired: { startsWith: "Yes" }, status: { not: "Completed" } } }),
    ]);
    rows = [
      { id: "late", signal: "Due-date risk", detail: "Review overdue active orders and reset ownership.", severity: lateOrders ? "HIGH" : "CLEAR", count: lateOrders },
      { id: "proofs", signal: "Proof revisions", detail: "Group revision requests before artwork returns to production.", severity: proofRevisions ? "MEDIUM" : "CLEAR", count: proofRevisions },
      { id: "production", signal: "Production load", detail: "Balance technician assignments across active fabrication jobs.", severity: productionBacklog > 8 ? "HIGH" : "NORMAL", count: productionBacklog },
      { id: "permits", signal: "Permit watch", detail: "Confirm approvals before crews and equipment are dispatched.", severity: permitInstalls ? "MEDIUM" : "CLEAR", count: permitInstalls },
    ];
  } else {
    return NextResponse.json({ error: "Unknown workflow module" }, { status: 400 });
  }
  return NextResponse.json({ rows, total: rows.length });
}

export async function POST(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  const module = req.nextUrl.searchParams.get("module");
  try {
    const body = await req.json();
    if (module === "production") {
      return NextResponse.json(await prisma.productionJob.create({ data: { number: `JOB-${Date.now().toString().slice(-7)}`, name: text(body.name) || "New production job", substrate: text(body.substrate) || null, dueAt: date(body.dueAt) } }));
    }
    if (module === "installs") {
      return NextResponse.json(await prisma.install.create({ data: { orderId: text(body.orderId), method: text(body.method) || "Standard installation", scheduledAt: date(body.scheduledAt), permitRequired: text(body.permitRequired) || null } }));
    }
    if (module === "schedule") {
      return NextResponse.json(await prisma.scheduleEvent.create({ data: { title: text(body.title) || "New event", startsAt: date(body.startsAt) ?? new Date(), type: body.type || "CLIENT_CALL", durationMin: number(body.durationMin, 60) } }));
    }
    if (module === "service") {
      return NextResponse.json(await prisma.serviceTicket.create({ data: { number: `TKT-${Date.now().toString().slice(-7)}`, clientId: text(body.clientId), issue: text(body.issue), priority: body.priority || "MEDIUM", dueAt: date(body.dueAt) } }));
    }
    return NextResponse.json({ error: "This module is managed from its connected workflow." }, { status: 405 });
  } catch (error) {
    return bad(error);
  }
}
