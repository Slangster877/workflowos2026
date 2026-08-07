import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";

export async function GET(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const folder = sp.get("folder") || "inbox";
  const rows = await prisma.emailRecord.findMany({
    where: {
      folder,
      ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { fromAddr: { contains: q, mode: "insensitive" } }, { snippet: { contains: q, mode: "insensitive" } }] } : {}),
    },
    include: { client: { select: { company: true } }, order: { select: { id: true, number: true } } },
    orderBy: { receivedAt: "desc" },
    take: 100,
  });
  return NextResponse.json({ rows });
}
