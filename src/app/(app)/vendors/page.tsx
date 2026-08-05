"use client";

import { useQuery } from "@tanstack/react-query";
import { EntityPage } from "@/components/EntityPage";
import { api } from "@/components/ui";
import { mapHref } from "@/lib/format";

export default function VendorsPage() {
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/api/meta") });
  const C = meta?.constants;
  if (!meta) return <p style={{ color: "var(--text-3)" }}>Loading…</p>;
  return (
    <EntityPage
      title="Vendors" sub="Suppliers, lead times, and who to call." endpoint="/api/vendors"
      columns={[
        { label: "Vendor", render: (r) => <><b>{r.name}</b>{r.website && <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{r.website}</div>}</> },
        { label: "Category", render: (r) => r.category },
        { label: "Contact", render: (r) => <>{r.contactName ?? "—"}{r.email && <div style={{ fontSize: 10.5, color: "var(--green)" }}>{r.email}</div>}</> },
        { label: "Phone", render: (r) => r.phone ?? "—" },
        { label: "Location", render: (r) => { const h = mapHref(r.address, r.city, r.state, r.zip); const t = [r.city, r.state].filter(Boolean).join(", ") || "—"; return h ? <a href={h} target="_blank" rel="noopener">📍 {t}</a> : t; } },
        { label: "Lead (days)", render: (r) => r.leadTimeDays },
      ]}
      formDefs={[
        { k: "name", label: "Vendor Name", required: true },
        { k: "category", label: "Category", type: "select", opts: C.MATERIAL_CATS.map((s: string) => ({ value: s, label: s })) },
        { k: "coverage", label: "Coverage", type: "select", opts: ["LOCAL", "REGIONAL", "NATIONAL"].map((s) => ({ value: s, label: s[0] + s.slice(1).toLowerCase() })) },
        { k: "contactName", label: "Sales Rep / Contact" },
        { k: "phone", label: "Telephone" },
        { k: "email", label: "Email" },
        { k: "website", label: "Website" },
        { k: "address", label: "Street Address" },
        { k: "city", label: "City" },
        { k: "state", label: "State" },
        { k: "leadTimeDays", label: "Typical Lead Time (days)", type: "number" },
      ]}
    />
  );
}
