"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Modal } from "./ui";

type Field = { key: string; label: string; type?: "text" | "date" | "number" | "select"; options?: string[] };
type Column = { key: string; label: string };
type ModuleConfig = { columns: Column[]; fields?: Field[]; empty: string };

const CONFIG: Record<string, ModuleConfig> = {
  production: {
    columns: [
      { key: "number", label: "Job" }, { key: "name", label: "Project" },
      { key: "order", label: "Order" }, { key: "stage", label: "Stage" },
      { key: "technician", label: "Technician" }, { key: "progress", label: "Progress" },
      { key: "dueAt", label: "Due" },
    ],
    fields: [
      { key: "name", label: "Project name" }, { key: "substrate", label: "Substrate" },
      { key: "dueAt", label: "Due date", type: "date" },
    ],
    empty: "No production jobs yet. Moving an order to Production creates one automatically.",
  },
  installs: {
    columns: [
      { key: "order", label: "Order" }, { key: "client", label: "Client" },
      { key: "method", label: "Method" }, { key: "scheduledAt", label: "Scheduled" },
      { key: "crewLead", label: "Crew lead" }, { key: "status", label: "Status" },
    ],
    fields: [
      { key: "orderId", label: "Order ID" }, { key: "method", label: "Install method" },
      { key: "scheduledAt", label: "Scheduled date", type: "date" },
      { key: "permitRequired", label: "Permit", type: "select", options: ["No", "Yes — city permit", "Yes — landlord approval"] },
    ],
    empty: "No installs scheduled. Moving an order to Install adds it here.",
  },
  proofs: {
    columns: [
      { key: "order", label: "Order" }, { key: "client", label: "Client" },
      { key: "version", label: "Version" }, { key: "fileName", label: "Artwork" },
      { key: "status", label: "Status" }, { key: "createdAt", label: "Created" },
    ],
    empty: "No artwork proofs yet. Proof versions appear here as they are created.",
  },
  schedule: {
    columns: [
      { key: "startsAt", label: "Date" }, { key: "type", label: "Type" },
      { key: "title", label: "Event" }, { key: "client", label: "Client" },
      { key: "order", label: "Order" }, { key: "durationMin", label: "Minutes" },
    ],
    fields: [
      { key: "title", label: "Event title" }, { key: "startsAt", label: "Date", type: "date" },
      { key: "type", label: "Type", type: "select", options: ["DESIGN_REVIEW", "PRODUCTION_CHECK_IN", "SITE_SURVEY", "INSTALL", "CLIENT_CALL"] },
      { key: "durationMin", label: "Minutes", type: "number" },
    ],
    empty: "Nothing scheduled yet.",
  },
  service: {
    columns: [
      { key: "number", label: "Ticket" }, { key: "client", label: "Client" },
      { key: "issue", label: "Issue" }, { key: "priority", label: "Priority" },
      { key: "status", label: "Status" }, { key: "assignedTo", label: "Assigned" },
      { key: "dueAt", label: "Due" },
    ],
    fields: [
      { key: "clientId", label: "Client ID" }, { key: "issue", label: "Issue" },
      { key: "priority", label: "Priority", type: "select", options: ["LOW", "MEDIUM", "HIGH", "URGENT"] },
      { key: "dueAt", label: "Due date", type: "date" },
    ],
    empty: "No open service tickets.",
  },
  permits: {
    columns: [
      { key: "order", label: "Order" }, { key: "client", label: "Client" },
      { key: "permitRequired", label: "Requirement" }, { key: "scheduledAt", label: "Install date" },
      { key: "status", label: "Install status" },
    ],
    empty: "No permit-related installs need attention.",
  },
  accounting: {
    columns: [
      { key: "number", label: "Invoice" }, { key: "client", label: "Client" },
      { key: "order", label: "Order" }, { key: "total", label: "Total" },
      { key: "status", label: "Status" }, { key: "issuedAt", label: "Issued" },
      { key: "dueAt", label: "Due" },
    ],
    empty: "No invoices yet. Connect QuickBooks in Settings to sync accounting.",
  },
  files: {
    columns: [
      { key: "kind", label: "Type" }, { key: "name", label: "File / Record" },
      { key: "order", label: "Order" }, { key: "client", label: "Client" },
      { key: "status", label: "Status" }, { key: "createdAt", label: "Date" },
    ],
    empty: "No job files or communication records yet.",
  },
  "ai-tools": {
    columns: [
      { key: "signal", label: "AI signal" }, { key: "detail", label: "Recommended action" },
      { key: "severity", label: "Priority" }, { key: "count", label: "Items" },
    ],
    empty: "No operating alerts right now. Nice and boring—the good kind.",
  },
};

function display(value: unknown, key: string) {
  if (value === null || value === undefined || value === "") return "—";
  if (key === "total") return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
  if (/At$/.test(key)) return new Date(String(value)).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  if (key === "progress") return `${value}%`;
  return String(value).replaceAll("_", " ");
}

export function WorkflowUI({ module, title, subtitle }: { module: string; title: string; subtitle: string }) {
  const config = CONFIG[module];
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});
  const { data, isLoading, isError } = useQuery({
    queryKey: ["workflow", module],
    queryFn: () => api(`/api/workflow?module=${encodeURIComponent(module)}`),
  });
  const rows = useMemo(() => {
    const all = data?.rows ?? [];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((row: Record<string, unknown>) => Object.values(row).some((v) => String(v ?? "").toLowerCase().includes(q)));
  }, [data, query]);
  const create = useMutation({
    mutationFn: () => api(`/api/workflow?module=${encodeURIComponent(module)}`, { method: "POST", body: JSON.stringify(values) }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["workflow", module] }); setCreating(false); setValues({}); },
  });

  if (!config) return <div className="card">Unknown workflow module.</div>;
  return (
    <>
      <div className="page-head">
        <div><h1 className="page-title">{title}</h1><p className="page-sub">{subtitle}</p></div>
        {config.fields?.length ? <button className="btn" onClick={() => setCreating(true)}>+ New</button> : null}
      </div>
      <div className="module-summary">
        <div><span>Live records</span><strong>{data?.total ?? rows.length}</strong></div>
        <div><span>Workspace</span><strong>{title}</strong></div>
        <div><span>Updated</span><strong>Just now</strong></div>
      </div>
      <div className="searchbar"><input placeholder={`Search ${title.toLowerCase()}…`} value={query} onChange={(e) => setQuery(e.target.value)} /></div>
      <div className="card table-card">
        <table className="data">
          <thead><tr>{config.columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr></thead>
          <tbody>
            {isLoading ? <tr><td colSpan={config.columns.length}>Loading live data…</td></tr> :
              isError ? <tr><td colSpan={config.columns.length}>This module could not load. Check the database connection.</td></tr> :
              rows.length ? rows.map((row: Record<string, unknown>, index: number) => (
                <tr key={String(row.id ?? index)}>{config.columns.map((column) => <td key={column.key}>{display(row[column.key], column.key)}</td>)}</tr>
              )) : <tr><td colSpan={config.columns.length}>{config.empty}</td></tr>}
          </tbody>
        </table>
      </div>
      {creating && config.fields && <Modal title={`New ${title} record`} onClose={() => setCreating(false)}>
        {config.fields.map((field) => <div className="field" key={field.key}>
          <label>{field.label}</label>
          {field.type === "select" ? <select value={values[field.key] ?? ""} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}>
            <option value="">Select…</option>{field.options?.map((option) => <option key={option} value={option}>{option.replaceAll("_", " ")}</option>)}
          </select> : <input type={field.type ?? "text"} value={values[field.key] ?? ""} onChange={(e) => setValues({ ...values, [field.key]: e.target.value })} />}
        </div>)}
        {create.isError && <p style={{ color: "#f87171", fontSize: 12 }}>{(create.error as Error).message}</p>}
        <div className="modal-actions"><button className="btn ghost" onClick={() => setCreating(false)}>Cancel</button><button className="btn" disabled={create.isPending} onClick={() => create.mutate()}>{create.isPending ? "Saving…" : "Save"}</button></div>
      </Modal>}
    </>
  );
}
