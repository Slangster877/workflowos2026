import { getConnection, saveConnection, appUrl } from "./oauth";

const AUTH_BASE = "https://appcenter.intuit.com/connect/oauth2";
const TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";
const API_BASE = process.env.QBO_ENV === "production"
  ? "https://quickbooks.api.intuit.com"
  : "https://sandbox-quickbooks.api.intuit.com";

export function qboAuthUrl(state: string) {
  const p = new URLSearchParams({
    client_id: process.env.QBO_CLIENT_ID!,
    response_type: "code",
    scope: "com.intuit.quickbooks.accounting",
    redirect_uri: appUrl("/api/integrations/qbo/callback"),
    state,
  });
  return `${AUTH_BASE}?${p}`;
}

async function tokenRequest(body: URLSearchParams) {
  const auth = Buffer.from(`${process.env.QBO_CLIENT_ID}:${process.env.QBO_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body,
  });
  if (!res.ok) throw new Error(`QBO token exchange failed (${res.status}): ${await res.text()}`);
  return res.json();
}

export async function qboExchangeCode(code: string, realmId: string) {
  const t = await tokenRequest(new URLSearchParams({
    grant_type: "authorization_code", code, redirect_uri: appUrl("/api/integrations/qbo/callback"),
  }));
  await saveConnection("qbo", {
    accessToken: t.access_token,
    refreshToken: t.refresh_token,
    expiresAt: new Date(Date.now() + t.expires_in * 1000),
    meta: { realmId },
  });
}

async function freshToken() {
  const conn = await getConnection("qbo");
  if (!conn) throw new Error("QuickBooks is not connected");
  if (conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 60_000) return conn;
  const t = await tokenRequest(new URLSearchParams({ grant_type: "refresh_token", refresh_token: conn.refreshToken! }));
  return saveConnection("qbo", {
    accessToken: t.access_token,
    refreshToken: t.refresh_token ?? conn.refreshToken!,
    expiresAt: new Date(Date.now() + t.expires_in * 1000),
    meta: conn.meta,
  });
}

export async function qboQuery(query: string) {
  const conn = await freshToken();
  const realmId = (conn.meta as any).realmId;
  const res = await fetch(`${API_BASE}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}&minorversion=73`, {
    headers: { Authorization: `Bearer ${conn.accessToken}`, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`QBO query failed (${res.status}): ${await res.text()}`);
  return res.json();
}
