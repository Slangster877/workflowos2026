"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/components/ui";
import { money } from "@/lib/format";

type Line = { kind: string; description: string; signType?: string; widthIn?: number; heightIn?: number; qty?: number; materialId?: string; laborRole?: string; laborHours?: number; sellPrice?: number };

export default function EstimateBuilder() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const { data: est } = useQuery({ queryKey: ["estimate", id], queryFn: () => api(`/api/estimates/${id}`) });
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/api/meta") });
  const { data: book } = useQuery({ queryKey: ["pricebook"], queryFn: () => api("/api/pricebook") });
  const [lines, setLines] = useState<Line[] | null>(null);

  useEffect(() => { if (est && lines === null) setLines(est.items.map((i: any) => ({ ...i, sellPrice: undefined }))); }, [est, lines]);

  const save = useMutation({
    mutationFn: (payload: any) => api(`/api/estimates/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: (fresh) => { qc.setQueryData(["estimate", id], fresh); setLines(fresh.items.map((i: any) => ({ ...i, sellPrice: undefined }))); },
  });
  const convert = useMutation({
    mutationFn: () => api(`/api/estimates/${id}/convert`, { method: "POST" }),
    onSuccess: (order) => (window.location.href = `/orders/${order.id}`),
  });

  if (!est || !meta || !book || lines === null) return <p style={{ color: "var(--text-3)" }}>Loading builder…</p>;

  const upd = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const add = (kind: string) => setLines([...lines, {
    kind, description: "",
    ...(kind === "SIGN" ? { signType: book.entries[0]?.signType, widthIn: 48, heightIn: 24, qty: 1 } : {}),
    ...(kind === "MATERIAL" ? { materialId: meta.vendors[0] && undefined, qty: 1 } : {}),
    ...(kind === "LABOR" ? { laborRole: "Fabrication", laborHours: 4 } : {}),
  }]);

  return (
    <>
      <p style={{ fontSize: 12.5, marginTop: 0 }}><a href="/estimates">Estimates</a> <span style={{ color: "var(--text-3)" }}>› {est.number}</span></p>
      <div className="page-head">
        <div>
          <h1 className="page-title">{est.title} <span className="badge OPEN" style={{ marginLeft: 8 }}>● {est.status}</span></h1>
          <p className="page-sub">{est.client.company} · blended margin {Number(est.marginPct).toFixed(0)}%</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a className="btn ghost" href={`/api/estimates/${id}/print`} target="_blank">🖨 Print / PDF</a>
          {est.status !== "APPROVED" && <button className="btn ghost" onClick={() => save.mutate({ status: "SENT" })}>Mark Sent</button>}
          {!est.orderId && <button className="btn" onClick={() => convert.mutate()}>✓ Approve & Convert to Order</button>}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead><tr><th style={{ width: 90 }}>Kind</th><th>Details</th><th style={{ width: 130 }}>Line Sell</th><th /></tr></thead>
          <tbody>
            {lines.map((l, i) => (
              <tr key={i} style={{ cursor: "default" }}>
                <td><b>{l.kind}</b></td>
                <td>
                  {l.kind === "SIGN" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <select style={{ width: 180 }} value={l.signType} onChange={(e) => upd(i, { signType: e.target.value })}>
                        {book.entries.map((b: any) => <option key={b.signType}>{b.signType}</option>)}
                      </select>
                      <input style={{ width: 70 }} type="number" value={l.widthIn ?? ""} onChange={(e) => upd(i, { widthIn: +e.target.value })} /> ×
                      <input style={{ width: 70 }} type="number" value={l.heightIn ?? ""} onChange={(e) => upd(i, { heightIn: +e.target.value })} /> in ·
                      qty <input style={{ width: 56 }} type="number" value={l.qty ?? 1} onChange={(e) => upd(i, { qty: +e.target.value })} />
                    </div>
                  )}
                  {l.kind === "MATERIAL" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input style={{ width: 260 }} placeholder="Material description" value={l.description} onChange={(e) => upd(i, { description: e.target.value })} />
                      cost/unit <input style={{ width: 90 }} type="number" value={(l as any).unitCost ?? ""} onChange={(e) => upd(i, { ...( { unitCost: +e.target.value } as any) })} />
                      qty <input style={{ width: 56 }} type="number" value={l.qty ?? 1} onChange={(e) => upd(i, { qty: +e.target.value })} />
                    </div>
                  )}
                  {l.kind === "LABOR" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <select style={{ width: 150 }} value={l.laborRole} onChange={(e) => upd(i, { laborRole: e.target.value })}>
                        {Object.keys(book.laborRates).map((r) => <option key={r}>{r}</option>)}
                      </select>
                      hours <input style={{ width: 70 }} type="number" value={l.laborHours ?? ""} onChange={(e) => upd(i, { laborHours: +e.target.value })} />
                      <span style={{ color: "var(--text-3)", fontSize: 12 }}>@ {money(book.laborRates[l.laborRole ?? "Fabrication"] ?? 95)}/hr</span>
                    </div>
                  )}
                  {l.kind === "CUSTOM" && (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <input style={{ width: 300 }} placeholder="Description" value={l.description} onChange={(e) => upd(i, { description: e.target.value })} />
                      sell $ <input style={{ width: 100 }} type="number" value={l.sellPrice ?? ""} onChange={(e) => upd(i, { sellPrice: +e.target.value })} />
                    </div>
                  )}
                </td>
                <td style={{ fontWeight: 700 }}>{est.items[i] ? money(est.items[i].sellPrice) : "—"}</td>
                <td><button className="btn ghost" style={{ padding: "4px 9px" }} onClick={() => setLines(lines.filter((_, j) => j !== i))}>✕</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ display: "flex", gap: 8, padding: 14, flexWrap: "wrap", borderTop: "1px solid var(--border)" }}>
          {["SIGN", "MATERIAL", "LABOR", "CUSTOM"].map((k) => (
            <button key={k} className="btn ghost" style={{ fontSize: 12 }} onClick={() => add(k)}>+ {k[0] + k.slice(1).toLowerCase()}</button>
          ))}
          <div style={{ flex: 1 }} />
          <div style={{ alignSelf: "center", fontWeight: 800, fontSize: 16 }}>Total {money(est.total)}</div>
          <button className="btn" disabled={save.isPending} onClick={() => save.mutate({ items: lines })}>{save.isPending ? "Computing…" : "Save & Recompute"}</button>
        </div>
      </div>
      <p style={{ fontSize: 11.5, color: "var(--text-3)" }}>Sign lines price from your Price Book (sell $/sq ft with minimums); tune it under Settings → Price Book. Margin shown is sell vs. blended cost.</p>
    </>
  );
}
