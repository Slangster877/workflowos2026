"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, api } from "@/components/ui";
import { money, dateFmt } from "@/lib/format";

const EST_BADGE: Record<string, string> = { DRAFT: "OPEN", SENT: "PRODUCTION", APPROVED: "COMPLETED", DECLINED: "ON_HOLD" };

export default function EstimatesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/api/meta") });
  const { data } = useQuery({ queryKey: ["estimates", q], queryFn: () => api(`/api/estimates?q=${encodeURIComponent(q)}`) });

  const create = useMutation({
    mutationFn: () => api("/api/estimates", { method: "POST", body: JSON.stringify({ clientId: clientId || meta.clients[0]?.id, title: title || "Sign Estimate" }) }),
    onSuccess: (est) => { qc.invalidateQueries({ queryKey: ["estimates"] }); window.location.href = `/estimates/${est.id}`; },
  });

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Estimates</h1><p className="page-sub">Square-footage pricing from your price book — the engine that wins the job.</p></div>
        <button className="btn" onClick={() => setCreating(true)} disabled={!meta}>+ New Estimate</button>
      </div>
      <div className="searchbar"><input placeholder="Search estimates…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead><tr><th>Estimate #</th><th>Client</th><th>Title</th><th>Status</th><th>Lines</th><th>Margin</th><th>Total</th><th>Created</th></tr></thead>
          <tbody>
            {data?.rows?.length ? data.rows.map((e: any) => (
              <tr key={e.id} onClick={() => (window.location.href = `/estimates/${e.id}`)}>
                <td style={{ color: "var(--green)", fontWeight: 600 }}>{e.number}</td>
                <td style={{ fontWeight: 600 }}>{e.client.company}</td>
                <td style={{ color: "var(--text-2)" }}>{e.title}</td>
                <td><span className={`badge ${EST_BADGE[e.status]}`}>● {e.status}</span></td>
                <td>{e._count.items}</td>
                <td style={{ color: Number(e.marginPct) < 35 ? "#fca5a5" : "var(--text-2)" }}>{Number(e.marginPct).toFixed(0)}%</td>
                <td style={{ fontWeight: 700 }}>{money(e.total)}</td>
                <td style={{ color: "var(--text-2)" }}>{dateFmt(e.createdAt)}</td>
              </tr>
            )) : <tr><td colSpan={8} style={{ color: "var(--text-3)" }}>No estimates yet.</td></tr>}
          </tbody>
        </table>
      </div>
      {creating && meta && (
        <Modal title="New Estimate" onClose={() => setCreating(false)}>
          <div className="field"><label>Client</label>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)}>{meta.clients.map((c: any) => <option key={c.id} value={c.id}>{c.company}</option>)}</select>
          </div>
          <div className="field"><label>Title</label><input value={title} placeholder="Monument Sign — Store #7244" onChange={(e) => setTitle(e.target.value)} /></div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn" onClick={() => create.mutate()}>Create & Open Builder</button>
          </div>
        </Modal>
      )}
    </>
  );
}
