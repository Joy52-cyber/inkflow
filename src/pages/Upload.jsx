import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { GENRES } from "../data/catalog.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { localize, publishChapter, discardChapter, retranslateBubble, reviseChapter, sendFeedback } from "../lib/library.js";

const FELT_WRONG = ["Tone", "Meaning", "Bubble fit", "Other"];
const BUCKETS = ["0-10%", "10-30%", "30-60%", "60%+"];

export default function Upload() {
  const nav = useNavigate();
  const { creator } = useAuth();
  useEffect(() => { if (!creator) nav("/login?next=/upload"); }, [creator]);

  // form
  const [files, setFiles] = useState([]);
  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("action");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // reviewer
  const [draft, setDraft] = useState(null);
  const [pages, setPages] = useState([]);
  const [rev, setRev] = useState(0);          // image cache-buster
  const [retrying, setRetrying] = useState({}); // `${pi}:${bi}` -> bool
  const [dirty, setDirty] = useState(false);

  // feedback
  const [published, setPublished] = useState(false);
  const [bucket, setBucket] = useState(null);
  const [feltWrong, setFeltWrong] = useState(null);

  const previews = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
  const allLines = pages.flatMap((p) => p.lines);
  const editedCount = allLines.filter((l) => l.edited).length;
  const editRate = allLines.length ? Math.round((editedCount / allLines.length) * 100) : 0;

  async function onLocalize(e) {
    e.preventDefault();
    if (!files.length) return setError("Add at least one page.");
    setBusy(true); setError("");
    try {
      const ch = await localize({ title: title || "Untitled", genre, files });
      setDraft(ch);
      setPages(ch.pages.map((p) => ({ idx: p.idx, src: p.src, lines: p.lines.map((l) => ({ ...l })) })));
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  function editLine(pi, bi, value) {
    setPages((ps) => ps.map((p) => p.idx !== pi ? p : {
      ...p, lines: p.lines.map((l, i) => i !== bi ? l : { ...l, translation: value, edited: value !== l.ai_translation }),
    }));
    setDirty(true);
  }

  async function retry(pi, bi) {
    const key = `${pi}:${bi}`;
    setRetrying((r) => ({ ...r, [key]: true }));
    try {
      const { translation } = await retranslateBubble(draft.id, pi, bi);
      setPages((ps) => ps.map((p) => p.idx !== pi ? p : {
        ...p, lines: p.lines.map((l, i) => i !== bi ? l : { ...l, translation, retries: (l.retries || 0) + 1 }),
      }));
      setDirty(true);
    } catch (err) { setError(err.message); } finally {
      setRetrying((r) => ({ ...r, [key]: false }));
    }
  }

  async function save() {
    setBusy(true); setError("");
    try {
      const payload = pages.map((p) => ({ idx: p.idx, lines: p.lines.map((l) => ({ translation: l.translation, edited: !!l.edited })) }));
      const updated = await reviseChapter(draft.id, payload);
      setPages(updated.pages.map((p) => ({ idx: p.idx, src: p.src, lines: p.lines.map((l) => ({ ...l })) })));
      setRev((v) => v + 1);
      setDirty(false);
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  async function publish() {
    setBusy(true); setError("");
    try {
      if (dirty) {
        const payload = pages.map((p) => ({ idx: p.idx, lines: p.lines.map((l) => ({ translation: l.translation, edited: !!l.edited })) }));
        await reviseChapter(draft.id, payload);
      }
      await publishChapter(draft.id);
      setPublished(true);
    } catch (err) { setError(err.message); setBusy(false); }
  }

  async function onDiscard() {
    if (draft) await discardChapter(draft.id).catch(() => {});
    setDraft(null); setPages([]); setDirty(false);
  }

  async function submitFeedback() {
    try { await sendFeedback(draft.id, bucket || "", feltWrong || ""); } catch {}
    nav("/dashboard");
  }

  if (!creator) return null;

  // --- Phase 3: post-publish feedback ---
  if (published) {
    return (
      <div className="mx-auto max-w-md px-4 py-12 text-center">
        <h1 className="text-2xl font-black">Submitted for review 🎉</h1>
        <p className="mt-1 text-sm text-neutral-400">One quick question to help us improve the localization.</p>
        <div className="mt-6 text-left">
          <label className="mb-1 block text-sm font-semibold">How much did you edit?</label>
          <div className="flex flex-wrap gap-2">
            {BUCKETS.map((b) => (
              <button key={b} onClick={() => setBucket(b)}
                className={`rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/15 ${bucket === b ? "bg-cyan-500 text-black" : "hover:bg-white/10"}`}>{b}</button>
            ))}
          </div>
          <label className="mb-1 mt-4 block text-sm font-semibold">What felt wrong? <span className="font-normal text-neutral-500">(optional)</span></label>
          <div className="flex flex-wrap gap-2">
            {FELT_WRONG.map((f) => (
              <button key={f} onClick={() => setFeltWrong(feltWrong === f ? null : f)}
                className={`rounded-lg px-3 py-1.5 text-sm ring-1 ring-white/15 ${feltWrong === f ? "bg-white/15" : "hover:bg-white/10"}`}>{f}</button>
            ))}
          </div>
        </div>
        <button onClick={submitFeedback} disabled={!bucket}
          className="mt-6 w-full rounded-lg bg-cyan-500 px-4 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
          Done
        </button>
        <p className="mt-2 text-xs text-neutral-500">Measured edit rate this chapter: {editRate}%</p>
      </div>
    );
  }

  // --- Phase 2: reviewer ---
  if (draft) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-black">Review · {draft.series_title || draft.title}</h1>
          <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs text-amber-300">Draft</span>
        </div>
        <p className="mt-1 text-sm text-neutral-400">
          Edit any line or hit Retry for an alternate. Re-render to see it on the page, then publish.
          Edited {editedCount}/{allLines.length} bubbles ({editRate}%).
        </p>

        <div className="sticky top-14 z-10 mt-4 flex flex-wrap gap-2 rounded-xl bg-neutral-950/90 py-2 backdrop-blur">
          <button onClick={save} disabled={busy || !dirty}
            className="rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-white/15 hover:bg-white/10 disabled:opacity-40">
            {busy ? "Working…" : dirty ? "Save & re-render" : "Saved"}
          </button>
          <button onClick={publish} disabled={busy}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
            Publish (submit for review)
          </button>
          <button onClick={onDiscard} disabled={busy}
            className="rounded-lg px-4 py-2 text-sm font-semibold text-red-300 ring-1 ring-white/15 hover:bg-red-500/10 disabled:opacity-50">
            Discard
          </button>
        </div>
        {error && <div className="mt-3 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</div>}

        <div className="mt-5 space-y-8">
          {pages.map((p) => (
            <div key={p.idx} className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs text-neutral-500">Page {p.idx + 1}</div>
                <img src={`${p.src}?v=${rev}`} alt={`Page ${p.idx + 1}`} className="w-full rounded-lg ring-1 ring-white/10" />
              </div>
              <div className="space-y-3">
                {p.lines.map((l, bi) => (
                  <div key={bi} className="rounded-lg ring-1 ring-white/10 p-2.5">
                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>{l.type}{l.edited ? " · edited" : ""}{l.retries ? ` · ${l.retries} retries` : ""}</span>
                      <button onClick={() => retry(p.idx, bi)} disabled={retrying[`${p.idx}:${bi}`]}
                        className="rounded px-1.5 py-0.5 ring-1 ring-white/15 hover:bg-white/10 disabled:opacity-40">
                        {retrying[`${p.idx}:${bi}`] ? "…" : "↻ Retry"}
                      </button>
                    </div>
                    {l.original && <div className="mt-1 text-xs text-neutral-500">{l.original}</div>}
                    <textarea value={l.translation} onChange={(e) => editLine(p.idx, bi, e.target.value)} rows={2}
                      className="mt-1 w-full resize-none rounded bg-white/5 px-2 py-1 text-sm ring-1 ring-white/10 outline-none focus:ring-cyan-400" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- Phase 1: upload form ---
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-black">Localize a chapter</h1>
      <p className="mt-1 text-sm text-neutral-400">
        Upload raw Japanese or Korean pages. Inkflow localizes them into natural English you can review,
        edit, and publish. For indie creators, not piracy.
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
              {previews.map((p) => <img key={p.url} src={p.url} alt={p.name} className="h-28 rounded-md ring-1 ring-white/10" />)}
            </div>
          )}
        </div>
        {error && <div className="rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300">{error}</div>}
        <button disabled={busy}
          className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-black hover:bg-cyan-400 disabled:opacity-50">
          {busy ? `Localizing ${files.length} page${files.length > 1 ? "s" : ""}…` : "Localize & review"}
        </button>
        {busy && <p className="text-xs text-neutral-500">Reading text, translating, and typesetting. ~10s per page.</p>}
      </form>
      <Link to="/" className="mt-8 inline-block text-sm text-cyan-400 hover:underline">‹ Back to browse</Link>
    </div>
  );
}
