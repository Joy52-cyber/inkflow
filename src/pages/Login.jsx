import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Login() {
  const { login, register } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const next = new URLSearchParams(loc.search).get("next") || "/";
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (mode === "login") await login(email, password);
      else await register(email, name, password);
      nav(next);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-12">
      <h1 className="text-2xl font-black">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
      <p className="mt-1 text-sm text-neutral-400">
        {mode === "login" ? "Log in to localize and publish chapters." : "Join Inkflow as a creator."}
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        {mode === "register" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name" required
            className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/15 outline-none focus:ring-cyan-400" />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required
          className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/15 outline-none focus:ring-cyan-400" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password (8+ chars)" required
          className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/15 outline-none focus:ring-cyan-400" />

        {error && <div className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</div>}

        <button disabled={busy}
          className="w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
          {busy ? "…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>

      <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
        className="mt-4 text-sm text-cyan-400 hover:underline">
        {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
      </button>
      <div className="mt-6"><Link to="/" className="text-sm text-neutral-500 hover:text-neutral-300">‹ Back to browse</Link></div>
    </div>
  );
}
