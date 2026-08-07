import { NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { qboAuthUrl } from "@/lib/qbo";

export async function GET() {
  const { deny } = await requireSession();
  if (deny) return deny;
  if (!process.env.QBO_CLIENT_ID) return NextResponse.json({ error: "Set QBO_CLIENT_ID / QBO_CLIENT_SECRET in .env first" }, { status: 400 });
  return NextResponse.redirect(qboAuthUrl("qbo"));
}
