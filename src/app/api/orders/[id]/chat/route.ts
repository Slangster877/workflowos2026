import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { chatCreate } from "@/lib/schemas";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { session, deny } = await requireSession();
  if (deny) return deny;
  try {
    const { body } = chatCreate.parse(await req.json());
    const msg = await prisma.chatMessage.create({
      data: { orderId: params.id, userId: (session!.user as any).id, body },
      include: { user: { select: { name: true, initials: true } } },
    });
    return NextResponse.json(msg, { status: 201 });
  } catch (e) {
    return bad(e);
  }
}
