import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { orderUpdate } from "@/lib/schemas";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { deny } = await requireSession();
  if (deny) return deny;
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      client: true,
      pm: { select: { id: true, name: true, initials: true } },
      proofs: { orderBy: { version: "asc" } },
      chat: { include: { user: { select: { name: true, initials: true } } }, orderBy: { createdAt: "asc" } },
      shipments: true,
    },
  });
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const data = orderUpdate.parse(await req.json());
    const order = await prisma.order.update({ where: { id: params.id }, data });
    return NextResponse.json(order);
  } catch (e) {
    return bad(e);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { deny } = await requireSession();
  if (deny) return deny;
  await prisma.order.update({ where: { id: params.id }, data: { deletedAt: new Date() } });
  return NextResponse.json({ ok: true });
}
