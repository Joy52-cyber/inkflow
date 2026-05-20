import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getChapter } from "../lib/library.js";

export default function UploadReader() {
  const { id } = useParams();
  const [work, setWork] = useState(null);
  const [err, setErr] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);

  useEffect(() => {
    getChapter(id).then(setWork).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="p-8">Couldn't load this work. <Link className="text-cyan-400" to="/">Home</Link></div>;
  if (!work) return <div className="p-8 text-neutral-400">Loading…</div>;

  return (
    <div className="min-h-screen bg-neutral-950">
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-neutral-950/90 px-4 py-2.5 backdrop-blur">
        <Link to="/" className="truncate text-sm font-semibold hover:text-cyan-400">
          ‹ {work.series_title || work.title} <span className="text-neutral-500">/ localized</span>
        </Link>
        <button onClick={() => setShowOriginal((v) => !v)}
          className="rounded-md px-2 py-1 text-xs ring-1 ring-white/15 hover:bg-white/10">
          {showOriginal ? "Hide source text" : "Show source text"}
        </button>
      </div>

      <div className="mx-auto max-w-[760px] pb-24">
        {work.pages.map((pg, i) => (
          <div key={i}>
            <img src={pg.src} alt={`Page ${i + 1}`} loading={i < 2 ? "eager" : "lazy"} className="block w-full" />
            {showOriginal && (
              <div className="space-y-1 bg-neutral-900/60 px-4 py-3 text-xs">
                {pg.lines.map((l, j) => (
                  <div key={j} className="flex gap-2">
                    <span className="shrink-0 rounded bg-white/10 px-1.5 text-neutral-400">{l.type}</span>
                    <span className="text-neutral-500">{l.original}</span>
                    <span className="text-neutral-600">→</span>
                    <span className="text-neutral-200">{l.translation}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        <div className="px-4 pt-6 text-center text-sm text-neutral-500">End of localized chapter</div>
      </div>
    </div>
  );
}
