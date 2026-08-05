import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { proofUpdate } from "@/lib/schemas";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const { status } = proofUpdate.parse(await req.json());
    const proof = await prisma.proof.update({
      where: { id: params.id },
      data: { status, sentAt: status === "SENT" ? new Date() : undefined, approvedAt: status === "APPROVED" ? new Date() : undefined },
    });
    return NextResponse.json(proof);
  } catch (e) {
    return bad(e);
  }
}
