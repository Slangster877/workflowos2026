import { NextRequest, NextResponse } from "next/server";
import { gmailExchangeCode } from "@/lib/gmail";
import { appUrl } from "@/lib/oauth";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.redirect(appUrl("/settings?gmail=denied"));
  try {
    await gmailExchangeCode(code);
    return NextResponse.redirect(appUrl("/settings?gmail=connected"));
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(appUrl("/settings?gmail=error"));
  }
}
