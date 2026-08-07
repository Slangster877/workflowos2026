"use client";

import { useQuery } from "@tanstack/react-query";
import { EntityPage } from "@/components/EntityPage";
import { api } from "@/components/ui";

export default function ClientsPage() {
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/api/meta") });
  const C = meta?.constants;
  if (!meta) return <p style={{ color: "var(--text-3)" }}>Loading…</p>;
  return (
    <EntityPage
      title="Clients" sub="Accounts, primary contacts, and who owns the relationship." endpoint="/api/clients"
      columns={[
        { label: "Client", render: (r) => <><b>{r.company}</b>{r.businessType && <div style={{ fontSize: 10.5, color: "var(--text-3)" }}>{r.businessType}</div>}</> },
        { label: "Primary Contact", render: (r) => <>{r.contactName ?? "—"}{r.email && <div style={{ fontSize: 10.5, color: "var(--green)" }}>{r.email}</div>}</> },
        { label: "Phone", render: (r) => r.phone ?? "—" },
        { label: "Status", render: (r) => r.status },
        { label: "Orders", render: (r) => r._count?.orders ?? 0 },
        { label: "Account Mgr", render: (r) => r.accountMgr?.name ?? "—" },
      ]}
      formDefs={[
        { k: "company", label: "Company Name", required: true },
        { k: "businessType", label: "Business Type", type: "select", opts: C.BUSINESS_TYPES.map((s: string) => ({ value: s, label: s })) },
        { k: "contactName", label: "Primary Contact" },
        { k: "phone", label: "Telephone" },
        { k: "email", label: "Email" },
        { k: "accountMgrId", label: "Account Manager", type: "select", opts: meta.users.map((u: any) => ({ value: u.id, label: u.name })) },
      ]}
    />
  );
}
