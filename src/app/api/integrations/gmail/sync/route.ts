import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { gmailApi, header } from "@/lib/gmail";

// Pull recent mail and auto-file: sender email → Contact → Client → most recent open Order.
export async function POST() {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const list = await gmailApi("/messages?maxResults=50&q=-category:promotions -category:social");
    let filed = 0, stored = 0;
    for (const m of list.messages ?? []) {
      const exists = await prisma.emailRecord.findUnique({ where: { messageId: m.id } });
      if (exists) continue;
      const msg = await gmailApi(`/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Subject`);
      const fromRaw = header(msg, "From");
      const fromAddr = (fromRaw.match(/<(.+?)>/)?.[1] ?? fromRaw).toLowerCase().trim();
      const domain = fromAddr.split("@")[1] ?? "";

      // match: exact contact email → its client; else client email domain; else client email exact
      const contact = await prisma.contact.findFirst({ where: { email: { equals: fromAddr, mode: "insensitive" } } });
      let client = contact ? await prisma.client.findUnique({ where: { id: contact.clientId } }) : null;
      if (!client && domain) client = await prisma.client.findFirst({ where: { email: { endsWith: `@${domain}`, mode: "insensitive" } } });
      const order = client
        ? await prisma.order.findFirst({ where: { clientId: client.id, status: { not: "COMPLETED" }, deletedAt: null }, orderBy: { orderedAt: "desc" } })
        : null;

      await prisma.emailRecord.create({
        data: {
          messageId: m.id, fromAddr, toAddr: header(msg, "To"), subject: header(msg, "Subject") || "(no subject)",
          snippet: msg.snippet ?? null, clientId: client?.id ?? null, contactId: contact?.id ?? null, orderId: order?.id ?? null,
          receivedAt: new Date(Number(msg.internalDate)),
        },
      });
      stored++;
      if (client) filed++;
    }
    return NextResponse.json({ stored, filed });
  } catch (e) {
    return bad(e);
  }
}
