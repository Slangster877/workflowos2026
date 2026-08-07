import { NextRequest, NextResponse } from "next/server";
import { qboExchangeCode } from "@/lib/qbo";
import { appUrl } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const realmId = req.nextUrl.searchParams.get("realmId");
  if (!code || !realmId) return NextResponse.redirect(appUrl("/settings?qbo=denied"));
  try {
    await qboExchangeCode(code, realmId);
    return NextResponse.redirect(appUrl("/settings?qbo=connected"));
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(appUrl("/settings?qbo=error"));
  }
}
