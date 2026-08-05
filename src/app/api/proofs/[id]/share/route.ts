import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { appUrl } from "@/lib/oauth";
import { randomBytes } from "node:crypto";

// Mint (or return) the public approval link for a proof.
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    let proof = await prisma.proof.findUniqueOrThrow({ where: { id: params.id } });
    if (!proof.approvalToken) {
      proof = await prisma.proof.update({ where: { id: proof.id }, data: { approvalToken: randomBytes(24).toString("base64url") } });
    }
    return NextResponse.json({ url: appUrl(`/approve/${proof.approvalToken}`) });
  } catch (e) {
    return bad(e);
  }
}
