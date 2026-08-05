import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { proofCreate } from "@/lib/schemas";

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const data = proofCreate.parse(await req.json());
    const last = await prisma.proof.findFirst({ where: { orderId: params.id }, orderBy: { version: "desc" } });
    const proof = await prisma.proof.create({
      data: { orderId: params.id, version: (last?.version ?? 0) + 1, ...data },
    });
    return NextResponse.json(proof, { status: 201 });
  } catch (e) {
    return bad(e);
  }
}
