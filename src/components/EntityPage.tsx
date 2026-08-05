"use client";

// One list-page implementation shared by Clients / Contacts / Vendors / Materials —
// the Phase 2 equivalent of the prototype's generic page engine.
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Modal, FormFields, useForm, Pager, api, FieldDef } from "./ui";

type Col = { label: string; render: (r: any) => React.ReactNode };

export function EntityPage({ title, sub, endpoint, columns, formDefs, toPayload }: {
  title: string; sub: string; endpoint: string; columns: Col[];
  formDefs: FieldDef[]; toPayload?: (v: Record<string, string>) => any;
}) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);
  const form = useForm(formDefs);

  const { data, isLoading } = useQuery({
    queryKey: [endpoint, q, page],
    queryFn: () => api(`${endpoint}?q=${encodeURIComponent(q)}&page=${page}`),
  });

  const create = useMutation({
    mutationFn: (payload: any) => api(endpoint, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [endpoint] }); setCreating(false); form.reset(); },
  });

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">{sub}</p>
        </div>
        <button className="btn" onClick={() => setCreating(true)}>+ New {title.replace(/s$/, "")}</button>
      </div>
      <div className="searchbar">
        <input placeholder={`Search ${title.toLowerCase()}…`} value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="data">
          <thead><tr>{columns.map((c) => <th key={c.label}>{c.label}</th>)}</tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={columns.length} style={{ color: "var(--text-3)" }}>Loading…</td></tr>
            ) : data?.rows?.length ? (
              data.rows.map((r: any) => <tr key={r.id}>{columns.map((c) => <td key={c.label}>{c.render(r)}</td>)}</tr>)
            ) : (
              <tr><td colSpan={columns.length} style={{ color: "var(--text-3)" }}>No {title.toLowerCase()} yet — create the first one.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {data && <Pager page={data.page} total={data.total} take={data.take} onPage={setPage} />}
      {creating && (
        <Modal title={`New ${title.replace(/s$/, "")}`} onClose={() => setCreating(false)}>
          <FormFields defs={formDefs} form={form} />
          {create.isError && <div style={{ color: "#f87171", fontSize: 12.5, marginBottom: 10 }}>{(create.error as Error).message}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button className="btn ghost" onClick={() => setCreating(false)}>Cancel</button>
            <button className="btn" disabled={create.isPending} onClick={() => create.mutate(toPayload ? toPayload(form.v) : form.v)}>
              {create.isPending ? "Creating…" : "Create"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
