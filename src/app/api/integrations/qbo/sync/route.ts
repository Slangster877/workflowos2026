import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { qboQuery } from "@/lib/qbo";
import { saveConnection, getConnection } from "@/lib/oauth";

export async function POST() {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    // Customers → Clients (matched by qboId; read-only, QBO stays the financial source of truth)
    const cust = await qboQuery("select * from Customer maxresults 1000");
    let clients = 0;
    for (const c of cust.QueryResponse?.Customer ?? []) {
      await prisma.client.upsert({
        where: { qboId: c.Id },
        update: { company: c.DisplayName, phone: c.PrimaryPhone?.FreeFormNumber ?? undefined, email: c.PrimaryEmailAddr?.Address ?? undefined },
        create: { qboId: c.Id, company: c.DisplayName, phone: c.PrimaryPhone?.FreeFormNumber ?? null, email: c.PrimaryEmailAddr?.Address ?? null },
      });
      clients++;
    }
    // Invoices → Invoice rows linked to the synced client
    const inv = await qboQuery("select * from Invoice maxresults 1000");
    let invoices = 0;
    for (const i of inv.QueryResponse?.Invoice ?? []) {
      const client = await prisma.client.findUnique({ where: { qboId: i.CustomerRef?.value } });
      if (!client) continue;
      await prisma.invoice.upsert({
        where: { qboId: i.Id },
        update: { total: i.TotalAmt ?? 0, status: i.Balance === 0 ? "PAID" : "SENT" },
        create: {
          qboId: i.Id, number: `INV-${i.DocNumber ?? i.Id}`, clientId: client.id,
          total: i.TotalAmt ?? 0, status: i.Balance === 0 ? "PAID" : "SENT",
          issuedAt: i.TxnDate ? new Date(i.TxnDate) : new Date(), dueAt: i.DueDate ? new Date(i.DueDate) : null,
        },
      });
      invoices++;
    }
    const conn = await getConnection("qbo");
    await saveConnection("qbo", { accessToken: conn!.accessToken, refreshToken: conn!.refreshToken ?? undefined, expiresAt: conn!.expiresAt ?? undefined, meta: { ...(conn!.meta as any), lastSync: new Date().toISOString() } });
    return NextResponse.json({ clients, invoices });
  } catch (e) {
    return bad(e);
  }
}
