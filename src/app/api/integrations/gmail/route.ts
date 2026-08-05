import { NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { gmailAuthUrl } from "@/lib/gmail";

export async function GET() {
  const { deny } = await requireSession();
  if (deny) return deny;
  if (!process.env.GOOGLE_CLIENT_ID) return NextResponse.json({ error: "Set GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in .env first" }, { status: 400 });
  return NextResponse.redirect(gmailAuthUrl("gmail"));
}
