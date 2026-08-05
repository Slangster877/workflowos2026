"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useState } from "react";

const NAV = [
  { section: "Work", items: [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/orders", label: "Orders" },
    { href: "/estimates", label: "Estimates" },
  ]},
  { section: "CRM", items: [
    { href: "/clients", label: "Clients" },
    { href: "/contacts", label: "Contacts" },
  ]},
  { section: "Inventory", items: [
    { href: "/materials", label: "Materials" },
    { href: "/vendors", label: "Vendors" },
  ]},
  { section: "Connect", items: [
    { href: "/inbox", label: "Inbox" },
    { href: "/shipping", label: "Shipping" },
    { href: "/settings", label: "Settings" },
  ]},
];

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  return (
    <div className="shell">
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 8px 10px" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--green)", display: "grid", placeItems: "center", color: "#04110b", fontWeight: 800, fontSize: 14 }}>G</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: "0.02em" }}>GRANDMARK</div>
            <div style={{ fontSize: 9, color: "var(--text-3)", letterSpacing: "0.14em" }}>WORKFLOWOS</div>
          </div>
        </div>
        {NAV.map((s) => (
          <div key={s.section}>
            <div className="nav-section">{s.section}</div>
            {s.items.map((i) => (
              <Link key={i.href} href={i.href} onClick={() => setOpen(false)} style={{ textDecoration: "none" }}>
                <div className={`nav-item ${path.startsWith(i.href) ? "active" : ""}`}>{i.label}</div>
              </Link>
            ))}
          </div>
        ))}
        <div className="nav-section">Account</div>
        <div className="nav-item" onClick={() => signOut({ callbackUrl: "/login" })}>Sign out</div>
      </aside>
      <div className="main">
        <button className="btn ghost" style={{ marginBottom: 12, display: "none" }} data-mobile-menu onClick={() => setOpen(!open)}>☰ Menu</button>
        <style>{`@media (max-width:900px){ [data-mobile-menu]{display:inline-block !important} }`}</style>
        {children}
      </div>
    </div>
  );
}
