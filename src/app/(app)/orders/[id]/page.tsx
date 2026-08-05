"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/components/ui";
import { money, dateFmt, STATUS_LABEL, mapHref } from "@/lib/format";

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"overview" | "proofs" | "chat">("overview");
  const [proofUrl, setProofUrl] = useState("");
  const [msg, setMsg] = useState("");

  const { data: o, isLoading } = useQuery({ queryKey: ["order", id], queryFn: () => api(`/api/orders/${id}`) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["order", id] });

  const addProof = useMutation({
    mutationFn: () => api(`/api/orders/${id}/proofs`, { method: "POST", body: JSON.stringify({ fileName: proofUrl.split("/").pop() || "artwork link", fileUrl: proofUrl, source: "LINK" }) }),
    onSuccess: () => { setProofUrl(""); refresh(); },
  });
  const setProofStatus = useMutation({
    mutationFn: ({ pid, status }: { pid: string; status: string }) => api(`/api/proofs/${pid}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: refresh,
  });
  const shareProof = useMutation({
    mutationFn: (pid: string) => api(`/api/proofs/${pid}/share`, { method: "POST" }),
    onSuccess: async (r) => { await navigator.clipboard.writeText(r.url).catch(() => {}); alert(`Approval link copied:\n${r.url}`); },
  });
  const emailProof = useMutation({
    mutationFn: (pid: string) => api(`/api/integrations/gmail/send`, { method: "POST", body: JSON.stringify({ orderId: id, proofId: pid }) }),
    onSuccess: refresh,
    onError: (e, pid) => { alert((e as Error).message + " — marking Sent without email."); setProofStatus.mutate({ pid, status: "SENT" }); },
  });
  const send = useMutation({
    mutationFn: () => api(`/api/orders/${id}/chat`, { method: "POST", body: JSON.stringify({ body: msg }) }),
    onSuccess: () => { setMsg(""); refresh(); },
  });
  const setStatus = useMutation({
    mutationFn: (status: string) => api(`/api/orders/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: refresh,
  });

  if (isLoading || !o) return <p style={{ color: "var(--text-3)" }}>Loading order…</p>;
  const maps = mapHref(o.address, o.city, o.state, o.zip);
  const PROOF_BADGE: Record<string, string> = { DRAFT: "OPEN", SENT: "PRODUCTION", APPROVED: "COMPLETED", REVISIONS: "ON_HOLD" };

  return (
    <>
      <p style={{ fontSize: 12.5, marginTop: 0 }}><a href="/orders">Orders</a> <span style={{ color: "var(--text-3)" }}>› {o.number}</span></p>
      <div className="page-head">
        <div>
          <h1 className="page-title">{o.client.company} – {o.signType} <span className={`badge ${o.status}`} style={{ verticalAlign: "middle", marginLeft: 8 }}>● {STATUS_LABEL[o.status]}</span></h1>
          <p className="page-sub">
            {o.storeNumber ? `Store #${o.storeNumber} · ` : ""}
            {maps ? <a href={maps} target="_blank" rel="noopener">📍 {[o.address, o.city, o.state].filter(Boolean).join(", ")}</a> : "Address TBD"}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <a className="btn ghost" href={`/orders/${id}/packet`} target="_blank" style={{ textDecoration: "none", fontSize: 12 }}>🖨 Installer Packet</a>
        <select value={o.status} onChange={(e) => setStatus.mutate(e.target.value)} style={{ width: "auto" }}>
          {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 18 }}>
        {[["Total", money(o.total)], ["Ordered", dateFmt(o.orderedAt)], ["Due", dateFmt(o.dueAt)], ["PM", o.pm?.name ?? "—"]].map(([l, v]) => (
          <div className="card" key={l as string}><div className="stat-label">{l}</div><div style={{ fontSize: 17, fontWeight: 700 }}>{v}</div></div>
        ))}
      </div>

      <div className="tabs">
        {(["overview", "proofs", "chat"] as const).map((t) => (
          <div key={t} className={`tab ${tab === t ? "active" : ""}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)} {t === "proofs" && <span style={{ color: "var(--text-3)" }}>{o.proofs.length}</span>}{t === "chat" && <span style={{ color: "var(--text-3)" }}>{o.chat.length}</span>}
          </div>
        ))}
      </div>

      {tab === "overview" && (
        <div className="card">
          {[["Project", o.projectName], ["Illumination", o.illumination ?? "—"], ["Priority", o.priority], ["PO #", o.poNumber ?? "—"], ["Client contact", [o.client.contactName, o.client.phone, o.client.email].filter(Boolean).join(" · ") || "—"]].map(([l, v]) => (
            <div key={l as string} style={{ display: "flex", justifyContent: "space-between", gap: 14, padding: "9px 0", borderBottom: "1px solid var(--border)", fontSize: 13.5 }}>
              <span style={{ color: "var(--text-3)" }}>{l}</span><span style={{ textAlign: "right" }}>{v}</span>
            </div>
          ))}
        </div>
      )}

      {tab === "proofs" && (
        <div className="card">
          {o.proofs.map((p: any) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--border)", flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5 }}>Proof v{p.version} <span className={`badge ${PROOF_BADGE[p.status]}`} style={{ marginLeft: 6 }}>● {p.status}</span></div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>{o.number}-P{p.version} · {p.fileName} · {dateFmt(p.createdAt)}</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {p.fileUrl && <a className="btn ghost" style={{ padding: "6px 10px", fontSize: 12 }} href={p.fileUrl} target="_blank" rel="noopener">Open</a>}
                {p.status === "DRAFT" && <button className="btn ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => emailProof.mutate(p.id)}>✉ Send to Customer</button>}
                {p.status !== "APPROVED" && <button className="btn ghost" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => shareProof.mutate(p.id)}>🔗 Approval Link</button>}
                {p.status === "SENT" && <button className="btn" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setProofStatus.mutate({ pid: p.id, status: "APPROVED" })}>✓ Approve</button>}
              </div>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, paddingTop: 14, flexWrap: "wrap" }}>
            <input placeholder="Paste a Dropbox / Drive artwork link…" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} style={{ maxWidth: 380 }} />
            <button className="btn" disabled={!proofUrl || addProof.isPending} onClick={() => addProof.mutate()}>+ Add Proof v{o.proofs.length + 1}</button>
          </div>
          <p style={{ fontSize: 11.5, color: "var(--text-3)", marginBottom: 0 }}>Direct file upload arrives with the Phase 3 storage integration — link proofs are fully functional now.</p>
        </div>
      )}

      {tab === "chat" && (
        <div className="card" style={{ maxWidth: 640 }}>
          <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
            {o.chat.map((m: any) => (
              <div key={m.id} style={{ display: "flex", gap: 9 }}>
                <div style={{ width: 28, height: 28, borderRadius: 999, background: "#4f46e5", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{m.user.initials}</div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, color: "var(--text-3)" }}>{m.user.name} · {dateFmt(m.createdAt)}</div>
                  <div style={{ fontSize: 13 }}>{m.body}</div>
                </div>
              </div>
            ))}
            {!o.chat.length && <div style={{ color: "var(--text-3)", fontSize: 13 }}>No messages yet — start the thread.</div>}
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input placeholder="Message the team about this order…" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === "Enter" && msg && send.mutate()} />
            <button className="btn" disabled={!msg || send.isPending} onClick={() => send.mutate()}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
