import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { adminQueue, reviewChapter } from "../lib/library.js";

export default function Admin() {
  const { creator } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!creator) { nav("/login?next=/admin"); return; }
    adminQueue().then(setRows).catch((e) => setErr(e.message));
  }, [creator]);

  async function decide(id, decision) {
    const note = decision === "reject" ? prompt("Reason for rejection (optional):") || "" : "";
    await reviewChapter(id, decision, note);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  if (!creator) return null;
  if (err) return <div className="mx-auto max-w-3xl p-8 text-red-300">{err} — admin access required.</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-black">Review queue</h1>
      <p className="mt-1 text-sm text-neutral-400">Chapters submitted for publishing, awaiting moderation.</p>

      {rows === null ? (
        <p className="mt-8 text-neutral-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-neutral-400">
          Nothing to review. 🎉
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl px-4 py-3 ring-1 ring-white/10">
              <div>
                <div className="text-sm font-semibold">{c.series_title}</div>
                <div className="text-xs text-neutral-500">by {c.creator_name} · {c.genre} · {c.pageCount ?? "?"} pg</div>
              </div>
              <div className="flex items-center gap-2">
                <Link to={`/u/${c.id}`} className="rounded-md px-2.5 py-1 text-xs ring-1 ring-white/15 hover:bg-white/10">Preview</Link>
                <button onClick={() => decide(c.id, "approve")}
                  className="rounded-md bg-emerald-500 px-3 py-1 text-xs font-semibold text-black hover:bg-emerald-400">Approve</button>
                <button onClick={() => decide(c.id, "reject")}
                  className="rounded-md px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-400/30 hover:bg-red-500/10">Reject</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
