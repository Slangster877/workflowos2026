"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/components/ui";
import { money } from "@/lib/format";

const SERVICES = [
  ["FEDEX_GROUND", "FedEx Ground"],
  ["FEDEX_EXPRESS_SAVER", "Express Saver (3 day)"],
  ["FEDEX_2_DAY", "FedEx 2Day"],
  ["STANDARD_OVERNIGHT", "Standard Overnight"],
  ["PRIORITY_OVERNIGHT", "Priority Overnight"],
];

export default function ShippingPage() {
  const qc = useQueryClient();
  const { data: s } = useQuery({ queryKey: ["intstatus"], queryFn: () => api("/api/integrations/status") });
  const { data: orders } = useQuery({ queryKey: ["orders", "", "", 1], queryFn: () => api("/api/orders?page=1") });
  const [orderId, setOrderId] = useState("");
  const [serviceType, setServiceType] = useState("FEDEX_GROUND");
  const [weightLb, setWeightLb] = useState("18");
  const [quote, setQuote] = useState<string | null>(null);
  const [err, setErr] = useState("");

  const rate = useMutation({
    mutationFn: () => api("/api/integrations/fedex/rate", { method: "POST", body: JSON.stringify({ orderId, serviceType, weightLb }) }),
    onSuccess: (r) => { setErr(""); setQuote(r.amount ? `${money(r.amount)} — ${r.service}` : "No rate returned"); },
    onError: (e) => setErr((e as Error).message),
  });
  const ship = useMutation({
    mutationFn: () => api("/api/integrations/fedex/ship", { method: "POST", body: JSON.stringify({ orderId, serviceType, weightLb }) }),
    onSuccess: (sh) => { setErr(""); qc.invalidateQueries({ queryKey: ["order"] }); if (sh.labelUrl) window.open(sh.labelUrl, "_blank"); },
    onError: (e) => setErr((e as Error).message),
  });

  const rows = orders?.rows ?? [];
  if (rows.length && !orderId) setOrderId(rows[0].id);

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Shipping</h1><p className="page-sub">Real FedEx rates and 4×6 labels against your account{s?.fedex?.env ? ` (${s.fedex.env})` : ""}.</p></div>
      </div>
      {!s?.fedex?.configured ? (
        <div className="card">FedEx isn't configured yet — add <code>FEDEX_CLIENT_ID</code>, <code>FEDEX_CLIENT_SECRET</code>, and <code>FEDEX_ACCOUNT_NUMBER</code> to <code>.env</code> (setup steps in the README), then restart.</div>
      ) : (
        <div className="card" style={{ maxWidth: 460, display: "grid", gap: 12 }}>
          <div className="field"><label>Order (ship-to comes from its address)</label>
            <select value={orderId} onChange={(e) => setOrderId(e.target.value)}>
              {rows.map((o: any) => <option key={o.id} value={o.id}>{o.number} — {o.client.company}</option>)}
            </select>
          </div>
          <div className="field"><label>Service</label>
            <select value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
              {SERVICES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="field"><label>Weight (lb)</label>
            <input type="number" value={weightLb} onChange={(e) => setWeightLb(e.target.value)} />
          </div>
          {quote && <div style={{ fontSize: 13, color: "var(--text-1)" }}>💲 {quote}</div>}
          {err && <div style={{ fontSize: 12.5, color: "#f87171" }}>{err}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn ghost" disabled={rate.isPending || !orderId} onClick={() => rate.mutate()}>{rate.isPending ? "Quoting…" : "Get Rate"}</button>
            <button className="btn" disabled={ship.isPending || !orderId} onClick={() => ship.mutate()}>{ship.isPending ? "Creating…" : "Create Label"}</button>
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>Labels open as a printable PDF and are saved to the order's Shipments.</div>
        </div>
      )}
    </>
  );
}
