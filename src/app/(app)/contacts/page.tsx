"use client";

import { useQuery } from "@tanstack/react-query";
import { EntityPage } from "@/components/EntityPage";
import { api } from "@/components/ui";
import { dateFmt } from "@/lib/format";

export default function ContactsPage() {
  const { data: meta } = useQuery({ queryKey: ["meta"], queryFn: () => api("/api/meta") });
  const C = meta?.constants;
  if (!meta) return <p style={{ color: "var(--text-3)" }}>Loading…</p>;
  return (
    <EntityPage
      title="Contacts" sub="Every person you deal with, filed under their company." endpoint="/api/contacts"
      columns={[
        { label: "Name", render: (r) => <b>{r.name}</b> },
        { label: "Title", render: (r) => r.title ?? "—" },
        { label: "Company", render: (r) => r.client?.company ?? "—" },
        { label: "Email", render: (r) => <span style={{ color: "var(--green)" }}>{r.email ?? "—"}</span> },
        { label: "Phone", render: (r) => r.phone ?? "—" },
        { label: "Added", render: (r) => dateFmt(r.createdAt) },
      ]}
      formDefs={[
        { k: "name", label: "Full Name", required: true },
        { k: "title", label: "Title / Role", type: "select", opts: C.CONTACT_TITLES.map((s: string) => ({ value: s, label: s })) },
        { k: "clientId", label: "Company", type: "select", opts: meta.clients.map((c: any) => ({ value: c.id, label: c.company })) },
        { k: "phone", label: "Telephone" },
        { k: "email", label: "Email" },
      ]}
    />
  );
}
