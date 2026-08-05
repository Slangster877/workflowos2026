"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setBusy(false);
    if (res?.error) setError("Email or password is incorrect.");
    else router.push("/dashboard");
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 16 }}>
      <form onSubmit={submit} className="card" style={{ width: "min(380px, 100%)", display: "grid", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--green)", display: "grid", placeItems: "center", color: "#04110b", fontWeight: 800 }}>G</div>
          <div>
            <div style={{ fontWeight: 800, letterSpacing: "0.02em" }}>GRANDMARK</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", letterSpacing: "0.14em" }}>WORKFLOWOS</div>
          </div>
        </div>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </label>
        <label style={{ display: "grid", gap: 6, fontSize: 12, color: "var(--text-2)" }}>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>
        {error && <div style={{ color: "#f87171", fontSize: 12.5 }}>{error}</div>}
        <button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  );
}
