"use client";

import { useState } from "react";

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
          <button className="btn ghost" style={{ padding: "5px 10px" }} onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}

// Minimal controlled form builder: [key, label, type, options?]
export type FieldDef = { k: string; label: string; type?: "text" | "number" | "date" | "select"; opts?: { value: string; label: string }[]; required?: boolean };

export function useForm(defs: FieldDef[]) {
  const init = Object.fromEntries(defs.map((d) => [d.k, d.type === "select" && d.opts?.length ? d.opts[0].value : ""]));
  const [v, setV] = useState<Record<string, string>>(init);
  const set = (k: string, val: string) => setV((p) => ({ ...p, [k]: val }));
  const reset = () => setV(init);
  return { v, set, reset };
}

export function FormFields({ defs, form }: { defs: FieldDef[]; form: ReturnType<typeof useForm> }) {
  return (
    <>
      {defs.map((d) => (
        <Field key={d.k} label={d.label}>
          {d.type === "select" ? (
            <select value={form.v[d.k]} onChange={(e) => form.set(d.k, e.target.value)}>
              {(d.opts || []).map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={d.type || "text"}
              value={form.v[d.k]}
              required={d.required}
              onChange={(e) => form.set(d.k, e.target.value)}
            />
          )}
        </Field>
      ))}
    </>
  );
}

export function Pager({ page, total, take, onPage }: { page: number; total: number; take: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / take));
  return (
    <div className="pager">
      <span>{total} total</span>
      <button className="btn ghost" disabled={page <= 1} onClick={() => onPage(page - 1)}>‹</button>
      <span>{page} / {pages}</span>
      <button className="btn ghost" disabled={page >= pages} onClick={() => onPage(page + 1)}>›</button>
    </div>
  );
}

export async function api<T = any>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `Request failed (${res.status})`);
  return res.json();
}
