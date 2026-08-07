"use client";

// Installer packet — print-optimized job sheet the crew takes to the site.
import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/components/ui";
import { money, dateFmt, STATUS_LABEL, mapHref } from "@/lib/format";

export default function PacketPage() {
  const { id } = useParams<{ id: string }>();
  const { data: o } = useQuery({ queryKey: ["order", id], queryFn: () => api(`/api/orders/${id}`) });
  useEffect(() => { if (o) setTimeout(() => window.print(), 400); }, [o]);
  if (!o) return <p style={{ color: "var(--text-3)" }}>Preparing packet…</p>;
  const maps = mapHref(o.address, o.city, o.state, o.zip);
  return (
    <div style={{ maxWidth: 720, background: "#fff", color: "#111", padding: 28, borderRadius: 8, fontSize: 13.5 }}>
      <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "3px solid #0f3b2e", paddingBottom: 12, marginBottom: 16 }}>
        <div><b>GRANDMARK SIGNS</b> — Installer Packet<br /><span style={{ color: "#667", fontSize: 12 }}>(913) 555-0148 · dispatch</span></div>
        <div style={{ textAlign: "right" }}><b style={{ fontSize: 17 }}>{o.number}</b><br /><span style={{ color: "#667", fontSize: 12 }}>{STATUS_LABEL[o.status]} · due {dateFmt(o.dueAt)}</span></div>
      </div>
      {[["Client", `${o.client.company}${o.client.contactName ? ` — ${o.client.contactName}` : ""}${o.client.phone ? ` · ${o.client.phone}` : ""}`],
        ["Job", `${o.projectName} · ${o.signType}${o.illumination ? ` · ${o.illumination}` : ""}`],
        ["Site", [o.address, o.city, o.state, o.zip].filter(Boolean).join(", ") || "TBD"],
        ["Value", money(o.total)], ["PM", o.pm?.name ?? "—"], ["PO #", o.poNumber ?? "—"],
        ["Approved proofs", o.proofs.filter((p: any) => p.status === "APPROVED").map((p: any) => `${o.number}-P${p.version}`).join(", ") || "⚠ NONE — do not install without an approved proof"],
      ].map(([l, v]) => (
        <div key={l as string} style={{ display: "flex", gap: 12, padding: "7px 0", borderBottom: "1px solid #ddd" }}>
          <div style={{ width: 130, color: "#667", fontWeight: 700, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
          <div>{v}</div>
        </div>
      ))}
      {maps && <p style={{ fontSize: 12 }}><a href={maps}>📍 Open site in Maps</a></p>}
      <div style={{ marginTop: 22, borderTop: "1px dashed #999", paddingTop: 14, fontSize: 12.5 }}>
        Site contact sign-off: ______________________________ &nbsp; Date: ____________<br /><br />
        Crew notes / punch list:
        <div style={{ height: 90, border: "1px solid #ccc", borderRadius: 6, marginTop: 6 }} />
      </div>
    </div>
  );
}
