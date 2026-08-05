import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { z } from "zod";

export async function GET() {
  const { deny } = await requireSession();
  if (deny) return deny;
  const entries = await prisma.priceBookEntry.findMany({ orderBy: { signType: "asc" } });
  const rates = await prisma.setting.findUnique({ where: { key: "laborRates" } });
  return NextResponse.json({ entries, laborRates: rates?.value ?? {} });
}

const putSchema = z.object({
  entries: z.array(z.object({ signType: z.string(), sellPerSqFt: z.coerce.number(), minPrice: z.coerce.number(), costPerSqFt: z.coerce.number() })).optional(),
  laborRates: z.record(z.coerce.number()).optional(),
});

export async function PUT(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  try {
    const data = putSchema.parse(await req.json());
    for (const e of data.entries ?? []) {
      await prisma.priceBookEntry.upsert({ where: { signType: e.signType }, update: e, create: e });
    }
    if (data.laborRates) await prisma.setting.upsert({ where: { key: "laborRates" }, update: { value: data.laborRates }, create: { key: "laborRates", value: data.laborRates } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return bad(e);
  }
}
