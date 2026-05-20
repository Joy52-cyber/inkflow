import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { getManga, getChapter, pageUrls } from "../data/catalog.js";
import { saveProgress } from "../lib/progress.js";

export default function Reader() {
  const { mangaId, chapterId } = useParams();
  const nav = useNavigate();
  const manga = getManga(mangaId);
  const chapter = getChapter(mangaId, chapterId);
  const [mode, setMode] = useState("vertical"); // 'vertical' | 'page'
  const [page, setPage] = useState(0);
  const pageRefs = useRef([]);

  if (!manga || !chapter)
    return <div className="p-8">Chapter not found. <Link className="text-cyan-400" to="/">Home</Link></div>;

  const urls = pageUrls(chapter);
  const idx = manga.chapters.findIndex((c) => c.id === chapter.id);
  const prev = manga.chapters[idx - 1];
  const next = manga.chapters[idx + 1];

  // Persist progress as the current page changes.
  useEffect(() => { saveProgress(mangaId, chapterId, page); }, [mangaId, chapterId, page]);

  // In vertical mode, track which page is centered in the viewport.
  useEffect(() => {
    if (mode !== "vertical") return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setPage(Number(e.target.dataset.i));
        });
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    pageRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [mode, chapterId]);

  // Page-mode keyboard nav.
  useEffect(() => {
    if (mode !== "page") return;
    const onKey = (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") setPage((p) => Math.min(urls.length - 1, p + 1));
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") setPage((p) => Math.max(0, p - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode, urls.length]);

  return (
    <div className="min-h-screen bg-neutral-950">
      {/* reader top bar */}
      <div className="sticky top-0 z-20 flex items-center justify-between border-b border-white/10 bg-neutral-950/90 px-4 py-2.5 backdrop-blur">
        <Link to={`/manga/${manga.id}`} className="truncate text-sm font-semibold hover:text-cyan-400">
          ‹ {manga.title} <span className="text-neutral-500">/ {chapter.title.split(" — ")[0]}</span>
        </Link>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">pg {page + 1}/{urls.length}</span>
          <button
            onClick={() => setMode((m) => (m === "vertical" ? "page" : "vertical"))}
            className="rounded-md px-2 py-1 ring-1 ring-white/15 hover:bg-white/10"
          >
            {mode === "vertical" ? "↕ Vertical" : "▭ Page"}
          </button>
        </div>
      </div>

      {/* pages */}
      {mode === "vertical" ? (
        <div className="mx-auto max-w-[760px] pb-24">
          {urls.map((u, i) => (
            <img
              key={u}
              ref={(el) => (pageRefs.current[i] = el)}
              data-i={i}
              src={u}
              alt={`Page ${i + 1}`}
              loading={i < 2 ? "eager" : "lazy"}
              className="block w-full"
            />
          ))}
          <ChapterNav prev={prev} next={next} mangaId={manga.id} nav={nav} />
        </div>
      ) : (
        <div className="mx-auto flex max-w-[760px] flex-col items-center pb-24">
          <img src={urls[page]} alt={`Page ${page + 1}`} className="block w-full" />
          <div className="mt-3 flex w-full items-center justify-between px-4 text-sm">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)}
              className="rounded-md px-3 py-1.5 ring-1 ring-white/15 disabled:opacity-30 hover:enabled:bg-white/10">‹ Prev</button>
            <span className="text-neutral-500">{page + 1} / {urls.length}</span>
            {page < urls.length - 1 ? (
              <button onClick={() => setPage((p) => p + 1)}
                className="rounded-md px-3 py-1.5 ring-1 ring-white/15 hover:bg-white/10">Next ›</button>
            ) : (
              <button disabled={!next} onClick={() => next && nav(`/read/${manga.id}/${next.id}`)}
                className="rounded-md bg-cyan-500 px-3 py-1.5 font-semibold text-black disabled:opacity-30">
                {next ? "Next chapter ›" : "The end"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ChapterNav({ prev, next, mangaId, nav }) {
  return (
    <div className="mt-6 flex justify-between gap-3 px-4">
      <button disabled={!prev} onClick={() => prev && nav(`/read/${mangaId}/${prev.id}`)}
        className="flex-1 rounded-lg py-3 text-sm ring-1 ring-white/15 disabled:opacity-30 hover:enabled:bg-white/10">
        ‹ Previous chapter
      </button>
      <button disabled={!next} onClick={() => next && nav(`/read/${mangaId}/${next.id}`)}
        className="flex-1 rounded-lg bg-cyan-500 py-3 text-sm font-semibold text-black disabled:opacity-30">
        {next ? "Next chapter ›" : "You're all caught up"}
      </button>
    </div>
  );
}
