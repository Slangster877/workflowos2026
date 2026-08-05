"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, FormFields, useForm, Pager, api } from "@/components/ui";
import { money, dateFmt, STATUS_LABEL } from "@/lib/format";

const TABS = ["", "OPEN", "PRODUCTION", "INSTALL", "COMPLETED", "ON_HOLD"];

export default function OrdersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/api/meta") });
  const { data, isLoading } = useQuery({
    queryKey: ["orders", q, status, page],
    queryFn: () => api(`/api/orders?q=${encodeURIComponent(q)}&status=${status}&page=${page}`),
  });

  const C = meta?.constants;
  const formDefs = meta ? [
    { k: "clientId", label: "Client", type: "select" as const, opts: meta.clients.map((c: any) => ({ value: c.id, label: c.company })) },
    { k: "signType", label: "Sign Type", type: "select" as const, opts: C.SIGN_TYPES.map((s: string) => ({ value: s, label: s })) },
    { k: "illumination", label: "Illumination", type: "select" as const, opts: C.ILLUMINATION.map((s: string) => ({ value: s, label: s })) },
    { k: "status", label: "Status", type: "select" as const, opts: TABS.slice(1).map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
    { k: "pmId", label: "Project Manager", type: "select" as const, opts: meta.users.map((u: any) => ({ value: u.id, label: u.name })) },
    { k: "total", label: "Order Total ($)", type: "number" as const },
    { k: "dueAt", label: "Due Date", type: "date" as const },
    { k: "storeNumber", label: "Store #", type: "text" as const },
  ] : [];
  const form = useForm(formDefs);

  const create = useMutation({
    mutationFn: (payload: any) => api("/api/orders", { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); setCreating(false); },
  });
  const [aiNote, setAiNote] = useState("");
  const aiCheck = useMutation({
    mutationFn: () => api("/api/ai/price-check", { method: "POST", body: JSON.stringify({ signType: form.v.signType }) }),
    onSuccess: (r) => setAiNote(r.text ?? r.note ?? ""),
    onError: (e) => setAiNote((e as Error).message),
  });

  const countFor = (s: string) =>
    s === "" ? data?.counts?.reduce((a: number, c: any) => a + c._count, 0) : data?.counts?.find((c: any) => c.status === s)?._count ?? 0;

  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">Orders</h1><p className="page-sub">Every sign job from quote to install.</p></div>
        <button className="btn" onClick={() => setCreating(true)} disabled={!meta}>+ New Order</button>
      </div>
      <div className="tabs">
        {TABS.map((s) => (
          <div key={s} className={`tab ${status === s ? "active" : ""}`} onClick={() => { setStatus(s); setPage(1); }}>
            {s === "" ? "All" : STATUS_LABEL[s]} {data && <span style={{ color: "var(--text-3)" }}>{countFor(s)}</span>}
          </div>
        ))}
      </div>
      <div className="searchbar">
        <input placeholder="Search orders…" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead><tr><th>Order #</th><th>Client</th><th>Project</th><th>Status</th><th>Total</th><th>Due</th><th>PM</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ color: "var(--text-3)" }}>Loading…</td></tr>
            ) : data?.rows?.length ? data.rows.map((o: any) => (
              <tr key={o.id} onClick={() => (window.location.href = `/orders/${o.id}`)}>
                <td style={{ color: "var(--green)", fontWeight: 600 }}>{o.number}</td>
                <td style={{ fontWeight: 600 }}>{o.client.company}</td>
                <td style={{ color: "var(--text-2)" }}>{o.projectName}</td>
                <td><span className={`badge ${o.status}`}>● {STATUS_LABEL[o.status]}</span></td>
                <td style={{ fontWeight: 700 }}>{money(o.total)}</td>
                <td style={{ color: "var(--text-2)" }}>{dateFmt(o.dueAt)}</td>
                <td style={{ color: "var(--text-2)" }}>{o.pm?.name ?? "—"}</td>
              </tr>
            )) : (
              <tr><td colSpan={7} style={{ color: "var(--text-3)" }}>No orders match — adjust the filters or create one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} total={data.total} take={data.take} onPage={setPage} />}
      {creating && meta && (
        <Modal title="New Order" onClose={() => setCreating(false)}>
          <FormFields defs={formDefs} form={form} />
          <div style={{ marginBottom: 12 }}>
            <button className="btn ghost" style={{ fontSize: 12, padding: "7px 11px" }} disabled={aiCheck.isPending} onClick={() => aiCheck.mutate()}>{aiCheck.isPending ? "Checking…" : "✨ AI Price Check"}</button>
            {aiNote && <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>✨ {aiNote}</div>}
          </div>
          {create.isError && <div style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{(create.error as Error).message}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn" disabled={create.isPending} onClick={() => create.mutate(form.v)}>{create.isPending ? "Creating…" : "Create Order"}</button>
          </div>
        </Modal>
      )}
    </>
  );
}
