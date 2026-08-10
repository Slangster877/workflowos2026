"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

const NAV = [
  { section: "Command", items: [
    { href: "/dashboard", label: "Dashboard", icon: "⌂" }, { href: "/orders", label: "Orders", icon: "▣" },
    { href: "/quotes", label: "Quotes", icon: "$" }, { href: "/proofs", label: "Proofs", icon: "◈" },
  ] },
  { section: "Operations", items: [
    { href: "/production", label: "Production", icon: "⚙" }, { href: "/installs", label: "Installs", icon: "◇" },
    { href: "/schedule", label: "Schedule", icon: "□" }, { href: "/permits", label: "Permits", icon: "✓" },
    { href: "/service", label: "Service", icon: "＋" },
  ] },
  { section: "Business", items: [
    { href: "/clients", label: "Customers", icon: "◎" }, { href: "/contacts", label: "Contacts", icon: "◉" },
    { href: "/materials", label: "Materials", icon: "▤" }, { href: "/vendors", label: "Vendors", icon: "◆" },
    { href: "/shipping", label: "Shipping", icon: "→" }, { href: "/accounting", label: "Accounting", icon: "∑" },
  ] },
  { section: "Workspace", items: [
    { href: "/inbox", label: "Email", icon: "@" }, { href: "/files", label: "Files & Logs", icon: "▱" },
    { href: "/ai-tools", label: "AI Tools", icon: "✦" }, { href: "/settings", label: "Settings", icon: "⚙" },
  ] },
];
const ALL_ITEMS = NAV.flatMap((group) => group.items);

export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = localStorage.getItem("workflowos-theme") === "light" ? "light" : "dark";
    setTheme(saved); document.documentElement.dataset.theme = saved;
  }, []);
  const results = useMemo(() => search.trim() ? ALL_ITEMS.filter((item) => item.label.toLowerCase().includes(search.toLowerCase())).slice(0, 6) : [], [search]);
  const go = (href: string) => { setSearch(""); setOpen(false); router.push(href); };
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next); localStorage.setItem("workflowos-theme", next); document.documentElement.dataset.theme = next;
  };
  return <div className={`shell ${collapsed ? "is-collapsed" : ""}`}>
    <aside className={`sidebar ${open ? "open" : ""}`}>
      <div className="brand"><div className="brand-mark">G</div><div className="brand-copy"><strong>GRANDMARK</strong><span>WORKFLOWOS</span></div><button className="collapse-button" onClick={() => setCollapsed(!collapsed)} aria-label="Collapse navigation">{collapsed ? "›" : "‹"}</button></div>
      <nav>{NAV.map((group) => <div key={group.section}><div className="nav-section">{group.section}</div>{group.items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`nav-item ${path.startsWith(item.href) ? "active" : ""}`} title={item.label}><span className="nav-icon">{item.icon}</span><span className="nav-label">{item.label}</span></Link>)}</div>)}</nav>
      <button className="nav-item sign-out" onClick={() => signOut({ callbackUrl: "/login" })}><span className="nav-icon">↪</span><span className="nav-label">Sign out</span></button>
    </aside>
    <div className="workspace">
      <header className="topbar"><button className="mobile-menu" onClick={() => setOpen(!open)}>☰</button><div className="global-search"><span>⌕</span><input placeholder="Search WorkflowOS…" value={search} onChange={(event) => setSearch(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && results[0]) go(results[0].href); }} />{results.length > 0 && <div className="search-results">{results.map((item) => <button key={item.href} onClick={() => go(item.href)}><span>{item.icon}</span>{item.label}</button>)}</div>}</div><div className="topbar-actions"><span className="live-pill"><i /> LIVE</span><button className="theme-button" onClick={toggleTheme}>{theme === "dark" ? "☀" : "☾"}</button></div></header>
      <main className="main">{children}</main>
    </div>
    {open && <button className="mobile-scrim" onClick={() => setOpen(false)} aria-label="Close navigation" />}
  </div>;
}
