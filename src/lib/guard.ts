import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "./auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session) return { session: null, deny: NextResponse.json({ error: "Sign in required" }, { status: 401 }) };
  return { session, deny: null };
}

export function bad(err: unknown) {
  const msg = err instanceof Error ? err.message : "Invalid request";
  return NextResponse.json({ error: msg }, { status: 400 });
}
