"use client";

// PUBLIC customer approval page — no login; the token is the credential.
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

export default function ApprovePage() {
  const { token } = useParams<{ token: string }>();
  const [p, setP] = useState<any>(null);
  const [err, setErr] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/public/proof/${token}`).then(async (r) => {
      const j = await r.json();
      if (!r.ok) setErr(j.error); else setP(j);
    });
  }, [token]);

  async function act(action: "APPROVED" | "REVISIONS") {
    setBusy(true);
    const r = await fetch(`/api/public/proof/${token}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, note }) });
    setBusy(false);
    if (r.ok) setDone(action); else setErr((await r.json()).error);
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <div className="card" style={{ width: "min(520px, 100%)", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: "var(--green)", display: "grid", placeItems: "center", color: "#04110b", fontWeight: 800 }}>G</div>
          <div style={{ fontWeight: 800 }}>GRANDMARK SIGNS — Proof Approval</div>
        </div>
        {err && <div style={{ color: "#f87171" }}>{err}</div>}
        {!p && !err && <div style={{ color: "var(--text-3)" }}>Loading…</div>}
        {p && !done && (
          <>
            <div style={{ fontSize: 14 }}>
              <b>{p.client}</b> · {p.orderNumber} · {p.signType}<br />
              <span style={{ color: "var(--text-2)" }}>Proof v{p.version} — {p.fileName}</span>
            </div>
            {p.fileUrl && <a className="btn ghost" style={{ textDecoration: "none", width: "fit-content" }} href={p.fileUrl} target="_blank" rel="noopener">Open artwork ↗</a>}
            {p.status === "APPROVED" ? (
              <div style={{ color: "var(--green)", fontWeight: 700 }}>✓ This proof is already approved — thank you!</div>
            ) : (
              <>
                <textarea placeholder="Notes or change requests (optional)…" value={note} onChange={(e) => setNote(e.target.value)} rows={3}
                  style={{ width: "100%", boxSizing: "border-box", background: "#1a2233", color: "var(--text-1)", border: "1px solid var(--border2)", borderRadius: 8, padding: 11, fontFamily: "inherit", fontSize: 14 }} />
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button className="btn" disabled={busy} onClick={() => act("APPROVED")}>✓ Approve for Production</button>
                  <button className="btn ghost" disabled={busy} onClick={() => act("REVISIONS")}>Request Changes</button>
                </div>
                <div style={{ fontSize: 11.5, color: "var(--text-3)" }}>Approving authorizes GrandMark Signs to release this artwork to production as shown.</div>
              </>
            )}
          </>
        )}
        {done === "APPROVED" && <div style={{ color: "var(--green)", fontWeight: 700, fontSize: 15 }}>✓ Approved — we're releasing it to production. Thank you!</div>}
        {done === "REVISIONS" && <div style={{ fontWeight: 700, fontSize: 15 }}>Got it — your change request is with the team and your project manager has been notified.</div>}
      </div>
    </main>
  );
}
