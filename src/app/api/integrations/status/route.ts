import { NextResponse } from "next/server";
import { requireSession } from "@/lib/guard";
import { getConnection } from "@/lib/oauth";

export async function GET() {
  const { deny } = await requireSession();
  if (deny) return deny;
  const [qbo, gmail] = await Promise.all([getConnection("qbo"), getConnection("gmail")]);
  return NextResponse.json({
    qbo: qbo ? { connected: true, realmId: (qbo.meta as any)?.realmId, lastSync: (qbo.meta as any)?.lastSync ?? null } : { connected: false, configured: !!process.env.QBO_CLIENT_ID },
    gmail: gmail ? { connected: true, email: (gmail.meta as any)?.email } : { connected: false, configured: !!process.env.GOOGLE_CLIENT_ID },
    fedex: { configured: !!(process.env.FEDEX_CLIENT_ID && process.env.FEDEX_ACCOUNT_NUMBER), env: process.env.FEDEX_ENV ?? "sandbox" },
    ai: { configured: !!process.env.ANTHROPIC_API_KEY },
  });
}
