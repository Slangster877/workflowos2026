"use client";

import { useQuery } from "@tanstack/react-query";
import { EntityPage } from "@/components/EntityPage";
import { api } from "@/components/ui";

export default function MaterialsPage() {
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/api/meta") });
  const C = meta?.constants;
  if (!meta) return <p style={{ color: "var(--text-3)" }}>Loading…</p>;
  return (
    <EntityPage
      title="Materials" sub="Substrates, vinyl, LED components — with stock levels and reorder points." endpoint="/api/materials"
      columns={[
        { label: "Material", render: (r) => <b>{r.name}</b> },
        { label: "Category", render: (r) => r.category },
        { label: "Vendor", render: (r) => r.vendor?.name ?? "—" },
        { label: "Unit", render: (r) => r.unit },
        { label: "On Hand", render: (r) => <span style={{ color: r.qtyOnHand <= r.reorderPoint ? "#fca5a5" : "inherit", fontWeight: 700 }}>{r.qtyOnHand}</span> },
        { label: "Reorder At", render: (r) => r.reorderPoint },
      ]}
      formDefs={[
        { k: "name", label: "Material Name", required: true },
        { k: "category", label: "Category", type: "select", opts: C.MATERIAL_CATS.map((s: string) => ({ value: s, label: s })) },
        { k: "vendorId", label: "Vendor", type: "select", opts: meta.vendors.map((v: any) => ({ value: v.id, label: v.name })) },
        { k: "unit", label: "Unit", type: "select", opts: C.UNITS.map((s: string) => ({ value: s, label: s })) },
        { k: "qtyOnHand", label: "Qty on Hand", type: "number" },
        { k: "reorderPoint", label: "Reorder Point", type: "number" },
      ]}
    />
  );
}
