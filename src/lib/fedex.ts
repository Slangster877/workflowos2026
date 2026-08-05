import { getConnection, saveConnection } from "./oauth";

const API_BASE = process.env.FEDEX_ENV === "production" ? "https://apis.fedex.com" : "https://apis-sandbox.fedex.com";

async function fedexToken() {
  const conn = await getConnection("fedex");
  if (conn && conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 60_000) return conn.accessToken;
  const res = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: process.env.FEDEX_CLIENT_ID!,
      client_secret: process.env.FEDEX_CLIENT_SECRET!,
    }),
  });
  if (!res.ok) throw new Error(`FedEx auth failed (${res.status}): ${await res.text()}`);
  const t = await res.json();
  await saveConnection("fedex", { accessToken: t.access_token, expiresAt: new Date(Date.now() + t.expires_in * 1000) });
  return t.access_token as string;
}

export async function fedexApi(path: string, body: any) {
  const token = await fedexToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(`FedEx ${path} failed (${res.status}): ${JSON.stringify(json).slice(0, 300)}`);
  return json;
}

export const SHIP_FROM = {
  contact: { personName: "GrandMark Signs", phoneNumber: "9135550148" },
  address: { streetLines: ["15301 W 109th Street"], city: "Lenexa", stateOrProvinceCode: "KS", postalCode: "66219", countryCode: "US" },
};
