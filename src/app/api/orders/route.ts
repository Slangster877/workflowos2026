import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession, bad } from "@/lib/guard";
import { orderCreate } from "@/lib/schemas";
import { nextNumber } from "@/lib/numbers";

export async function GET(req: NextRequest) {
  const { deny } = await requireSession();
  if (deny) return deny;
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q")?.trim() || "";
  const status = sp.get("status") || undefined;
  const page = Math.max(1, Number(sp.get("page") || 1));
  const take = 10;

  const where = {
    deletedAt: null,
    ...(status ? { status: status as any } : {}),
    ...(q
      ? {
          OR: [
            { number: { contains: q, mode: "insensitive" as const } },
            { projectName: { contains: q, mode: "insensitive" as const } },
            { client: { company: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
  };

  const [rows, total, counts] = await Promise.all([
    prisma.order.findMany({
      where,
      include: { client: { select: { company: true } }, pm: { select: { name: true, initials: true } } },
      orderBy: { orderedAt: "desc" },
      skip: (page - 1) * take,
      take,
    }),
    prisma.order.count({ where }),
    prisma.order.groupBy({ by: ["status"], where: { deletedAt: null }, _count: true }),
  ]);
  return NextResponse.json({ rows, total, page, take, counts });
}

export async function POST(req: NextRequest) {
  const { session, deny } = await requireSession();
  if (deny) return deny;
  try {
    const data = orderCreate.parse(await req.json());
    const client = await prisma.client.findUniqueOrThrow({ where: { id: data.clientId } });
    const number = await nextNumber("ORD");
    const order = await prisma.order.create({
      data: {
        ...data,
        number,
        projectName: `${data.signType} – ${data.storeNumber ? `Store #${data.storeNumber}` : client.company}`,
        pmId: data.pmId || (session!.user as any).id,
      },
    });
    return NextResponse.json(order, { status: 201 });
  } catch (e) {
    return bad(e);
  }
}
