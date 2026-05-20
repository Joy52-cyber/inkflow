import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/AuthContext.jsx";
import { listMine, discardChapter } from "../lib/library.js";

const STATE_STYLES = {
  draft: "bg-neutral-500/20 text-neutral-300",
  published_pending: "bg-amber-400/15 text-amber-300",
  published_approved: "bg-emerald-400/15 text-emerald-300",
  published_rejected: "bg-red-500/15 text-red-300",
};

function stateLabel(c) {
  if (c.status === "draft") return ["draft", "Draft"];
  if (c.review_status === "approved") return ["published_approved", "Live"];
  if (c.review_status === "rejected") return ["published_rejected", "Rejected"];
  return ["published_pending", "In review"];
}

export default function Dashboard() {
  const { creator } = useAuth();
  const nav = useNavigate();
  const [rows, setRows] = useState(null);

  useEffect(() => {
    if (!creator) { nav("/login?next=/dashboard"); return; }
    listMine().then(setRows).catch(() => setRows([]));
  }, [creator]);

  async function remove(id) {
    await discardChapter(id);
    setRows((r) => r.filter((x) => x.id !== id));
  }

  if (!creator) return null;
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black">Your works</h1>
        <Link to="/upload" className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400">+ Localize a chapter</Link>
      </div>
      <p className="mt-1 text-sm text-neutral-400">Signed in as {creator.display_name} ({creator.email})</p>

      {rows === null ? (
        <p className="mt-8 text-neutral-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-neutral-400">
          No chapters yet. <Link to="/upload" className="text-cyan-400">Localize your first page →</Link>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-white/5 overflow-hidden rounded-xl ring-1 ring-white/10">
          {rows.map((c) => {
            const [key, label] = stateLabel(c);
            return (
              <div key={c.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-semibold">{c.series_title}</div>
                  <div className="text-xs text-neutral-500">{c.genre} · {c.pageCount ?? "?"} pg
                    {c.review_status === "rejected" && c.review_note ? ` · note: ${c.review_note}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs ${STATE_STYLES[key]}`}>{label}</span>
                  <Link to={`/u/${c.id}`} className="rounded-md px-2.5 py-1 text-xs ring-1 ring-white/15 hover:bg-white/10">View</Link>
                  <button onClick={() => remove(c.id)} className="rounded-md px-2.5 py-1 text-xs text-red-300 ring-1 ring-white/15 hover:bg-red-500/10">Delete</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
