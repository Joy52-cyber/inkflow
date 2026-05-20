import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GENRES } from "../data/catalog.js";
import { localize, publishUpload, discardUpload } from "../lib/uploads.js";

export default function Upload() {
  const nav = useNavigate();
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("action");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null); // localized but not yet published

  const previews = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));

  async function onLocalize(e) {
    e.preventDefault();
    if (!files.length) return setError("Add at least one page.");
    setBusy(true); setError("");
    try {
      setDraft(await localize({ title: title || "Untitled", genre, files }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onPublish() {
    setBusy(true);
    try {
      await publishUpload(draft.id);
      nav(`/u/${draft.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function onDiscard() {
    if (draft) await discardUpload(draft.id);
    setDraft(null);
  }

  // --- Preview state: review the localized result before publishing ---
  if (draft) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Preview · {draft.title}</h1>
          <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs text-amber-300">Draft</span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          Review the localized {draft.pageCount}-page chapter. Publish to add it to Inkflow, or discard and try again.
        </p>

        <div className="mt-6 flex gap-2">
          <button disabled={busy} onClick={onPublish}
            className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
            {busy ? "Publishing…" : "Publish chapter"}
          </button>
          <button disabled={busy} onClick={onDiscard}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10 disabled:opacity-50">
            Discard
          </button>
        </div>

        <div className="mt-6 space-y-6">
          {draft.pages.map((pg, i) => (
            <div key={i}>
              <div className="mb-1 text-xs text-neutral-500">Page {i + 1}</div>
              <img src={pg.src} alt={`Page ${i + 1}`} className="w-full rounded-lg ring-1 ring-white/10" />
              <details className="mt-1.5 text-xs text-neutral-400">
                <summary className="cursor-pointer hover:text-neutral-200">Source → English ({pg.lines.length} lines)</summary>
                <div className="mt-1 space-y-1">
                  {pg.lines.map((l, j) => (
                    <div key={j} className="flex gap-2">
                      <span className="shrink-0 rounded bg-white/10 px-1.5">{l.type}</span>
                      <span className="text-neutral-500">{l.original}</span>
                      <span className="text-neutral-600">→</span>
                      <span className="text-neutral-200">{l.translation}</span>
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Upload form ---
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-black">Localize a chapter</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Upload raw Japanese or Korean pages. Inkflow reads the text, localizes it into natural English,
        and publishes it as a readable chapter. For indie creators, not piracy.
      </p>

      <form onSubmit={onLocalize} className="mt-6 space-y-5">
        <div>
          <label className="mb-1 block text-sm font-semibold">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="My one-shot"
            className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm ring-1 ring-white/15 outline-none focus:ring-cyan-400" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Genre</label>
          <div className="flex gap-2">
            {GENRES.map((g) => (
              <button type="button" key={g.slug} onClick={() => setGenre(g.slug)}
                className={`rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/15 ${genre === g.slug ? "bg-white/15" : "hover:bg-white/10"}`}>
                {g.emoji} {g.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">Pages (JP/KO images)</label>
          <input type="file" accept="image/png,image/jpeg,image/webp" multiple
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-cyan-500 file:px-3 file:py-1.5 file:font-semibold file:text-black" />
          {previews.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {previews.map((p) => (
                <img key={p.url} src={p.url} alt={p.name} className="h-28 rounded-md ring-1 ring-white/10" />
              ))}
            </div>
          )}
        </div>

        {error && <div className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</div>}

        <button disabled={busy}
          className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
          {busy ? `Localizing ${files.length} page${files.length > 1 ? "s" : ""}…` : "Localize & preview"}
        </button>
        {busy && <p className="text-xs text-neutral-500">Reading text, translating, and typesetting. ~10s per page.</p>}
      </form>

      <Link to="/" className="mt-8 inline-block text-sm text-cyan-400 hover:underline">‹ Back to browse</Link>
    </div>
  );
}
