import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { nextNumber } from "@/lib/numbers";

// Approved estimate → real Order, carrying the sign line's type and the full total.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { session, deny } = await requireSession();
  if (deny) return deny;
  try {
    const est = await prisma.estimate.findUniqueOrThrow({ where: { id: params.id }, include: { items: true, client: true } });
    if (est.orderId) return NextResponse.json({ error: "Already converted" }, { status: 400 });
    const sign = est.items.find((i) => i.kind === "SIGN");
    const order = await prisma.order.create({
      data: {
        number: await nextNumber("ORD"),
        clientId: est.clientId,
        signType: sign?.signType ?? "Wall Sign",
        projectName: est.title,
        total: est.total,
        pmId: (session!.user as any).id,
      },
    });
    await prisma.estimate.update({ where: { id: est.id }, data: { status: "APPROVED", orderId: order.id } });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return bad(e);
  }
}
