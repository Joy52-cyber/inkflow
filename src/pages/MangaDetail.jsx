import { useParams, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { getManga, getGenre } from "../data/catalog.js";
import Cover from "../components/Cover.jsx";
import { getProgress, isBookmarked, toggleBookmark } from "../lib/progress.js";

export default function MangaDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const manga = getManga(id);
  const [marked, setMarked] = useState(isBookmarked(id));
  if (!manga) return <div className="mx-auto max-w-6xl p-8">Not found. <Link className="text-cyan-400" to="/">Home</Link></div>;

  const progress = getProgress(id);
  const resumeChapter = progress?.chapterId || manga.chapters[0].id;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="w-40 shrink-0"><Cover manga={manga} /></div>
        <div className="flex-1">
          <h1 className="text-2xl font-black">{manga.title}</h1>
          <p className="mt-0.5 text-sm text-neutral-400">{manga.author} · {manga.year} · {manga.status}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {manga.genres.map((g) => (
              <Link key={g} to={`/genre/${g}`} className="rounded-full bg-white/10 px-2.5 py-1 text-xs hover:bg-white/20">
                {getGenre(g)?.emoji} {getGenre(g)?.name}
              </Link>
            ))}
            <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-xs text-amber-300">★ {manga.rating.toFixed(1)}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-neutral-300">{manga.synopsis}</p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => nav(`/read/${manga.id}/${resumeChapter}`)}
              className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-semibold text-black hover:bg-cyan-400"
            >
              {progress ? `Resume · pg ${progress.page + 1}` : "Start reading"}
            </button>
            <button
              onClick={() => setMarked(toggleBookmark(manga.id))}
              className={`rounded-lg px-4 py-2 text-sm font-semibold ring-1 ring-white/15 ${marked ? "bg-white/15" : "hover:bg-white/10"}`}
            >
              {marked ? "★ Saved" : "☆ Save"}
            </button>
          </div>
        </div>
      </div>

      <h2 className="mb-2 mt-8 text-lg font-bold">Chapters</h2>
      <div className="divide-y divide-white/5 overflow-hidden rounded-xl ring-1 ring-white/10">
        {manga.chapters.map((c) => {
          const isResume = progress?.chapterId === c.id;
          return (
            <Link
              key={c.id}
              to={`/read/${manga.id}/${c.id}`}
              className="flex items-center justify-between px-4 py-3 transition hover:bg-white/5"
            >
              <span className="text-sm">{c.title}</span>
              <span className="text-xs text-neutral-500">
                {isResume ? <span className="text-cyan-400">reading · pg {progress.page + 1}</span> : `${c.pages} pages`}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
