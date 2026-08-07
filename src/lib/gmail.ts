import { getConnection, saveConnection, appUrl } from "./oauth";

const SCOPES = "https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send";

export function gmailAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    response_type: "code",
    scope: SCOPES,
    redirect_uri: appUrl("/api/integrations/gmail/callback"),
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!, ...body }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function gmailExchangeCode(code: string) {
  const t = await tokenRequest({ grant_type: "authorization_code", code, redirect_uri: appUrl("/api/integrations/gmail/callback") });
  // whoami for the connected address
  const prof = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/profile", { headers: { Authorization: `Bearer ${t.access_token}` } }).then((r) => r.json());
  await saveConnection("gmail", {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: new Date(Date.now() + t.expires_in * 1000),
    meta: { email: prof.emailAddress },
  });
}

export async function gmailToken() {
  const conn = await getConnection("gmail");
  if (!conn) throw new Error("Gmail is not connected");
  if (conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 60_000) return conn;
  const t = await tokenRequest({ grant_type: "refresh_token", refresh_token: conn.refreshToken! });
  return saveConnection("gmail", {
    accessToken: t.access_token,
    refreshToken: conn.refreshToken!,
    expiresAt: new Date(Date.now() + t.expires_in * 1000),
    meta: conn.meta,
  });
}

export async function gmailApi(path: string, init?: RequestInit) {
  const conn = await gmailToken();
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${conn.accessToken}`, "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new Error(`Gmail API failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export function header(msg: any, name: string) {
  return msg.payload?.headers?.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";
}
