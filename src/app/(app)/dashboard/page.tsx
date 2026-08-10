"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { api } from "@/components/ui";
import { money, dateFmt, STATUS_LABEL } from "@/lib/format";

const STAGES = ["OPEN", "PRODUCTION", "INSTALL", "ON_HOLD", "COMPLETED"];

export default function Dashboard() {
  const { data: session } = useSession();
  const { data } = useQuery({ queryKey: ["orders", "", "", 1], queryFn: () => api("/api/orders?page=1") });

  const count = (s: string) => data?.counts?.find((c: any) => c.status === s)?._count ?? 0;
  const active = STAGES.filter((s) => s !== "COMPLETED").reduce((a, s) => a + count(s), 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">Welcome back, {session?.user?.name ?? "there"}</h1>
          <p className="page-sub">Live from the database — here's what's happening at GrandMark today.</p>
        </div>
        <div style={{ textAlign: "right" }}><div style={{ fontWeight: 750 }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div><div className="page-sub">Kansas City operations</div></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 18 }}>
        {[["Active Orders", active], ["In Production", count("PRODUCTION")], ["In Install", count("INSTALL")], ["Completed", count("COMPLETED")]].map(([l, v]) => (
          <div className="card" key={l as string}><div className="stat-label">{l}</div><div className="stat-value">{v}</div></div>
        ))}
      </div>
      <div className="quick-grid">
        {[
          ["Production", "Fabrication & assembly", "/production"], ["Proofs", "Artwork approvals", "/proofs"],
          ["Install Schedule", "Crews & permits", "/installs"], ["AI Watch", "Risk & workload signals", "/ai-tools"],
        ].map(([title, copy, href]) => <Link href={href} key={href} className="quick-card"><span>{title}</span><small>{copy}</small><b>Open →</b></Link>)}
      </div>
      <div className="card" style={{ padding: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid var(--border)" }}>
          <div style={{ fontWeight: 700, fontSize: 14 }}>Order Pipeline</div>
          <Link href="/orders" className="btn" style={{ textDecoration: "none", fontSize: 12, padding: "8px 12px" }}>View All Orders</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))" }}>
          {STAGES.map((s) => (
            <Link key={s} href={`/orders`} style={{ textDecoration: "none", color: "inherit" }}>
              <div style={{ padding: "12px 16px", borderRight: "1px solid var(--border)" }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: "0.06em", color: "var(--text-3)", textTransform: "uppercase" }}>{STATUS_LABEL[s]}</div>
                <div style={{ fontSize: 22, fontWeight: 800 }}>{count(s)}</div>
              </div>
            </Link>
          ))}
        </div>
        <table className="data">
          <thead><tr><th>Order</th><th>Client</th><th>Status</th><th>Due</th><th>Total</th></tr></thead>
          <tbody>
            {data?.rows?.slice(0, 5).map((o: any) => (
              <tr key={o.id} onClick={() => (window.location.href = `/orders/${o.id}`)}>
                <td><div style={{ fontWeight: 600 }}>{o.projectName}</div><div style={{ fontSize: 11, color: "var(--green)" }}>{o.number}</div></td>
                <td style={{ color: "var(--text-2)" }}>{o.client.company}</td>
                <td><span className={`badge ${o.status}`}>● {STATUS_LABEL[o.status]}</span></td>
                <td style={{ color: "var(--text-2)" }}>{dateFmt(o.dueAt)}</td>
                <td style={{ fontWeight: 700 }}>{money(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
