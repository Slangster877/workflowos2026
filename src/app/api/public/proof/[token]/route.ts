import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gmailApi } from "@/lib/gmail";
import { z } from "zod";

// PUBLIC endpoint — the token IS the auth. Read returns proof context; POST records the decision.
export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const proof = await prisma.proof.findUnique({
    where: { approvalToken: params.token },
    include: { order: { include: { client: { select: { company: true } } } } },
  });
  if (!proof) return NextResponse.json({ error: "This approval link is invalid or expired." }, { status: 404 });
  return NextResponse.json({
    orderNumber: proof.order.number, client: proof.order.client.company, signType: proof.order.signType,
    version: proof.version, fileName: proof.fileName, fileUrl: proof.fileUrl, status: proof.status,
  });
}

const actSchema = z.object({ action: z.enum(["APPROVED", "REVISIONS"]), note: z.string().max(1000).optional() });

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  try {
    const { action, note } = actSchema.parse(await req.json());
    const proof = await prisma.proof.findUnique({ where: { approvalToken: params.token }, include: { order: { include: { pm: true, client: true } } } });
    if (!proof) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
    if (proof.status === "APPROVED") return NextResponse.json({ ok: true, already: true });

    await prisma.proof.update({ where: { id: proof.id }, data: { status: action, approvedAt: action === "APPROVED" ? new Date() : null } });
    if (note || action) {
      await prisma.chatMessage.create({
        data: {
          orderId: proof.orderId,
          userId: proof.order.pmId ?? (await prisma.user.findFirstOrThrow({ where: { role: "OWNER" } })).id,
          body: `Customer ${action === "APPROVED" ? "APPROVED" : "requested changes on"} proof v${proof.version} via approval link.${note ? ` Note: "${note}"` : ""}`,
        },
      });
    }
    // Notify the PM by email when Gmail is connected; never block the customer on it.
    try {
      const pmEmail = proof.order.pm?.email;
      if (pmEmail) {
        const subject = `${proof.order.number}: proof v${proof.version} ${action === "APPROVED" ? "APPROVED ✔" : "needs revisions"}`;
        const body = `${proof.order.client.company} responded to proof v${proof.version} on ${proof.order.number}.${note ? `\r\n\r\nNote from customer:\r\n${note}` : ""}`;
        const raw = Buffer.from(`To: ${pmEmail}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`)
          .toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
        await gmailApi("/messages/send", { method: "POST", body: JSON.stringify({ raw }) });
      }
    } catch { /* gmail not connected — the chat entry is the record */ }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Invalid request" }, { status: 400 });
  }
}
