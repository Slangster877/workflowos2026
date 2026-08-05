import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { computeLines, LineInput } from "@/lib/estimating";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const { deny } = await requireSession();
  if (deny) return deny;
  const est = await prisma.estimate.findUnique({
    where: { id: params.id },
    include: { client: true, items: { orderBy: { sortOrder: "asc" } } },
  });
  if (!est) return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
  return NextResponse.json(est);
}

const patchSchema = z.object({
  title: z.string().optional(),
  status: z.enum(["DRAFT", "SENT", "APPROVED", "DECLINED"]).optional(),
  notes: z.string().optional(),
  items: z.array(z.any()).optional(), // full replace; engine recomputes everything
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const data = patchSchema.parse(await req.json());
    const { items, ...estimateData } = data;
    if (items) {
      const { lines, subtotal, marginPct } = await computeLines(items as LineInput[]);
      await prisma.$transaction([
        prisma.estimateLineItem.deleteMany({ where: { estimateId: params.id } }),
        prisma.estimateLineItem.createMany({ data: lines.map((l) => ({ ...l, estimateId: params.id })) }),
        prisma.estimate.update({ where: { id: params.id }, data: { ...estimateData, subtotal, marginPct, total: subtotal } }),
      ]);
    } else {
      await prisma.estimate.update({ where: { id: params.id }, data: estimateData });
    }
    const est = await prisma.estimate.findUnique({ where: { id: params.id }, include: { client: true, items: { orderBy: { sortOrder: "asc" } } } });
    return NextResponse.json(est);
  } catch (e) {
    return bad(e);
  }
}
