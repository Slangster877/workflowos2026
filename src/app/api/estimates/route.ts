import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { nextNumber } from "@/lib/numbers";
import { z } from "zod";

const createSchema = z.object({ clientId: z.string().min(1), title: z.string().default("Sign Estimate") });

export async function GET(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const rows = await prisma.estimate.findMany({
    where: { deletedAt: null, ...(q ? { OR: [{ number: { contains: q, mode: "insensitive" } }, { title: { contains: q, mode: "insensitive" } }, { client: { company: { contains: q, mode: "insensitive" } } }] } : {}) },
    include: { client: { select: { company: true } }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ rows });
}

export async function POST(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const data = createSchema.parse(await req.json());
    const est = await prisma.estimate.create({ data: { ...data, number: await nextNumber("EST") } });
    return NextResponse.json(est, { status: 201 });
  } catch (e) {
    return bad(e);
  }
}
