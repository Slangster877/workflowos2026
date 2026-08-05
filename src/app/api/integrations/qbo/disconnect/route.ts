import { NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { dropConnection } from "@/lib/oauth";

export async function POST() {
  const { deny } = await requireSession();
  if (deny) return deny;
  await dropConnection("qbo");
  return NextResponse.json({ ok: true });
}
