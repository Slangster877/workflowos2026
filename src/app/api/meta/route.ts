import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/guard";
import * as C from "@/lib/constants";

// Everything the forms need for their dropdowns, in one call.
export async function GET() {
  const { deny } = await requireSession();
  if (deny) return deny;
  const [clients, users, vendors] = await Promise.all([
    prisma.client.findMany({ where: { deletedAt: null }, select: { id: true, company: true }, orderBy: { company: "asc" } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.vendor.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  return NextResponse.json({ clients, users, vendors, constants: C });
}
