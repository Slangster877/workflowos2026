"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/components/ui";
import { dateFmt } from "@/lib/format";

export default function InboxPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState("inbox");
  const { data: s } = useQuery({ queryKey: ["intstatus"], queryFn: () => api("/api/integrations/status") });
  const { data } = useQuery({ queryKey: ["emails", q, folder], queryFn: () => api(`/api/emails?q=${encodeURIComponent(q)}&folder=${folder}`) });
  const sync = useMutation({
    mutationFn: () => api("/api/integrations/gmail/sync", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["emails"] }),
  });

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Inbox</h1><p className="page-sub">{s?.gmail?.connected ? `${s.gmail.email} — auto-filed to clients & orders` : "Connect Gmail in Settings to start auto-filing client email."}</p></div>
        {s?.gmail?.connected && <button className="btn" disabled={sync.isPending} onClick={() => sync.mutate()}>{sync.isPending ? "Syncing…" : "⟳ Sync Now"}</button>}
      </div>
      <div className="tabs">
        {["inbox", "sent"].map((f) => (
          <div key={f} className={`tab ${folder === f ? "active" : ""}`} onClick={() => setFolder(f)}>{f[0].toUpperCase() + f.slice(1)}</div>
        ))}
      </div>
      <div className="searchbar"><input placeholder="Search email…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card" style={{ padding: 0 }}>
        {data?.rows?.length ? data.rows.map((m: any) => (
          <div key={m.id} style={{ padding: "11px 16px", borderBottom: "1px solid var(--border)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <b style={{ fontSize: 13 }}>{m.fromAddr}</b>
              <span style={{ fontSize: 11, color: "var(--text-3)" }}>{dateFmt(m.receivedAt)}</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--text-1)" }}>{m.subject}</div>
            {m.snippet && <div style={{ fontSize: 12, color: "var(--text-3)" }}>{m.snippet.slice(0, 140)}…</div>}
            {(m.client || m.order) && (
              <div style={{ fontSize: 11.5, color: "var(--green)", marginTop: 3 }}>
                ✓ Filed{m.client ? ` to ${m.client.company}` : ""}{m.order ? <> · <a href={`/orders/${m.order.id}`}>{m.order.number}</a></> : ""}
              </div>
            )}
          </div>
        )) : <div style={{ padding: 16, color: "var(--text-3)", fontSize: 13 }}>No email yet — connect Gmail in Settings, then Sync.</div>}
      </div>
    </>
  );
}
