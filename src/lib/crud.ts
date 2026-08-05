import { NextRequest, NextResponse } from "next/server";
import { ZodSchema } from "zod";
import { prisma } from "./prisma";
import { requireSession, bad } from "./guard";

type Model = "client" | "contact" | "vendor" | "material";

// One list/create/update/soft-delete implementation for the simple entities.
export function crudHandlers(model: Model, createSchema: ZodSchema, searchFields: string[], include?: object) {
  const delegate = () => (prisma as any)[model];

  async function GET(req: NextRequest) {
    const { deny } = await requireSession();
    if (deny) return deny;
    const sp = req.nextUrl.searchParams;
    const q = sp.get("q")?.trim() || "";
    const page = Math.max(1, Number(sp.get("page") || 1));
    const take = 12;
    const where = {
      deletedAt: null,
      ...(q ? { OR: searchFields.map((f) => ({ [f]: { contains: q, mode: "insensitive" } })) } : {}),
    };
    const [rows, total] = await Promise.all([
      delegate().findMany({ where, include, orderBy: { createdAt: "desc" }, skip: (page - 1) * take, take }),
      delegate().count({ where }),
    ]);
    return NextResponse.json({ rows, total, page, take });
  }

  async function POST(req: NextRequest) {
    const { deny } = await requireSession();
    if (deny) return deny;
    try {
      const data = createSchema.parse(await req.json());
      const row = await delegate().create({ data });
      return NextResponse.json(row, { status: 201 });
    } catch (e) {
      return bad(e);
    }
  }

  async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { deny } = await requireSession();
    if (deny) return deny;
    try {
      const { id } = await params;
      const data = (createSchema as any).partial().parse(await req.json());
      const row = await delegate().update({ where: { id }, data });
      return NextResponse.json(row);
    } catch (e) {
      return bad(e);
    }
  }

  async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { deny } = await requireSession();
    if (deny) return deny;
    const { id } = await params;
    await delegate().update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  }

  return { GET, POST, PATCH, DELETE };
}
