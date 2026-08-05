"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/components/ui";

function Card({ title, status, children }: { title: string; status: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="card" style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {status}
      </div>
      {children}
    </div>
  );
}

const Dot = ({ on, label }: { on: boolean; label: string }) => (
  <span className={`badge ${on ? "COMPLETED" : "OPEN"}`}>● {label}</span>
);

export default function SettingsPage() {
  const qc = useQueryClient();
  const { data: s } = useQuery({ queryKey: ["intstatus"], queryFn: () => api("/api/integrations/status") });
  const [syncMsg, setSyncMsg] = useState<Record<string, string>>({});

  const sync = useMutation({
    mutationFn: (p: string) => api(`/api/integrations/${p}/sync`, { method: "POST" }),
    onSuccess: (r, p) => {
      setSyncMsg((m) => ({ ...m, [p]: p === "qbo" ? `Synced ${r.clients} customers, ${r.invoices} invoices` : `Stored ${r.stored} emails, auto-filed ${r.filed}` }));
      qc.invalidateQueries();
    },
    onError: (e, p) => setSyncMsg((m) => ({ ...m, [p]: (e as Error).message })),
  });
  const disconnect = useMutation({
    mutationFn: (p: string) => api(`/api/integrations/${p}/disconnect`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["intstatus"] }),
  });

  if (!s) return <p style={{ color: "var(--text-3)" }}>Loading…</p>;

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Settings — Integrations</h1><p className="page-sub">Connect the systems GrandMark already runs on.</p></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
        <Card title="QuickBooks Online" status={<Dot on={s.qbo.connected} label={s.qbo.connected ? "Connected" : "Not connected"} />}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {s.qbo.connected
              ? `Realm ${s.qbo.realmId}${s.qbo.lastSync ? ` · last sync ${new Date(s.qbo.lastSync).toLocaleString()}` : " · never synced"}`
              : s.qbo.configured ? "Credentials configured — connect your company file." : "Add QBO_CLIENT_ID / QBO_CLIENT_SECRET to .env (see README)."}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!s.qbo.connected && <a className="btn" href="/api/integrations/qbo" style={{ textDecoration: "none" }}>Connect QuickBooks</a>}
            {s.qbo.connected && <button className="btn" disabled={sync.isPending} onClick={() => sync.mutate("qbo")}>Sync Customers & Invoices</button>}
            {s.qbo.connected && <button className="btn ghost" onClick={() => disconnect.mutate("qbo")}>Disconnect</button>}
          </div>
          {syncMsg.qbo && <div style={{ fontSize: 12, color: "var(--green)" }}>{syncMsg.qbo}</div>}
        </Card>

        <Card title="Gmail / Google Workspace" status={<Dot on={s.gmail.connected} label={s.gmail.connected ? "Connected" : "Not connected"} />}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {s.gmail.connected ? `${s.gmail.email} — new mail auto-files to clients, contacts, and open orders.`
              : s.gmail.configured ? "Credentials configured — authorize your mailbox." : "Add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to .env (see README)."}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!s.gmail.connected && <a className="btn" href="/api/integrations/gmail" style={{ textDecoration: "none" }}>Connect Gmail</a>}
            {s.gmail.connected && <button className="btn" disabled={sync.isPending} onClick={() => sync.mutate("gmail")}>Sync & Auto-file Mail</button>}
            {s.gmail.connected && <button className="btn ghost" onClick={() => disconnect.mutate("gmail")}>Disconnect</button>}
          </div>
          {syncMsg.gmail && <div style={{ fontSize: 12, color: "var(--green)" }}>{syncMsg.gmail}</div>}
        </Card>

        <Card title="FedEx" status={<Dot on={s.fedex.configured} label={s.fedex.configured ? `Ready (${s.fedex.env})` : "Not configured"} />}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {s.fedex.configured
              ? "API credentials set — rate quotes and label creation are live on the Shipping page."
              : "Add FEDEX_CLIENT_ID / FEDEX_CLIENT_SECRET / FEDEX_ACCOUNT_NUMBER to .env (see README)."}
          </div>
          <a className="btn ghost" href="/shipping" style={{ textDecoration: "none", width: "fit-content" }}>Open Shipping →</a>
        </Card>

        <Card title="Claude AI (Anthropic)" status={<Dot on={s.ai.configured} label={s.ai.configured ? "Ready" : "Not configured"} />}>
          <div style={{ fontSize: 12.5, color: "var(--text-2)" }}>
            {s.ai.configured
              ? "Server-side key set — AI price checks are live on the New Order form. The key never reaches the browser."
              : "Add ANTHROPIC_API_KEY to .env to enable AI price checks."}
          </div>
        </Card>
      </div>
    </>
  );
}
