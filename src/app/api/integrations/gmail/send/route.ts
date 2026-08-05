import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { gmailApi } from "@/lib/gmail";
import { z } from "zod";

const schema = z.object({ orderId: z.string(), proofId: z.string() });

// Emails a proof link to the order's client and marks the proof SENT.
export async function POST(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const { orderId, proofId } = schema.parse(await req.json());
    const order = await prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: { client: true } });
    let proof = await prisma.proof.findUniqueOrThrow({ where: { id: proofId } });
    if (!proof.approvalToken) {
      const { randomBytes } = await import("node:crypto");
      proof = await prisma.proof.update({ where: { id: proofId }, data: { approvalToken: randomBytes(24).toString("base64url") } });
    }
    const to = order.client.email;
    if (!to) return NextResponse.json({ error: `${order.client.company} has no email on file` }, { status: 400 });

    const subject = `Proof ${order.number}-P${proof.version} for approval — ${order.signType}`;
    const body = [
      `Hi ${order.client.contactName ?? order.client.company},`, "",
      `Proof v${proof.version} for your ${order.signType} (${order.number}) is ready for review:`,
      proof.fileUrl ?? "(attached separately)", "",
      `Approve online (one click): ${process.env.NEXTAUTH_URL}/approve/${proof.approvalToken}`, "",
      "GrandMark Signs · (913) 555-0148",
    ].join("\r\n");
    const raw = Buffer.from(`To: ${to}\r\nSubject: ${subject}\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n${body}`)
      .toString("base64").replace(/\+/g, "-").replace(/\//g, "_");
    await gmailApi("/messages/send", { method: "POST", body: JSON.stringify({ raw }) });

    await prisma.proof.update({ where: { id: proofId }, data: { status: "SENT", sentAt: new Date() } });
    await prisma.emailRecord.create({
      data: { fromAddr: "me", toAddr: to, subject, snippet: `Proof v${proof.version} sent for approval`, folder: "sent", clientId: order.clientId, orderId: order.id },
    });
    return NextResponse.json({ ok: true, to });
  } catch (e) {
    return bad(e);
  }
}
