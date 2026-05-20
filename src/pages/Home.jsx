import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { GENRES, mangaByGenre, getManga, getChapter } from "../data/catalog.js";
import MangaCard from "../components/MangaCard.jsx";
import Cover from "../components/Cover.jsx";
import { continueReading } from "../lib/progress.js";
import { listUploads } from "../lib/uploads.js";

function Rail({ title, to, items }) {
  return (
    <section className="mb-9">
      <div className="mb-3 flex items-end justify-between px-4">
        <h2 className="text-lg font-bold">{title}</h2>
        {to && <Link to={to} className="text-sm text-cyan-400 hover:underline">See all</Link>}
      </div>
      <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((m) => <MangaCard key={m.id} manga={m} />)}
      </div>
    </section>
  );
}

export default function Home() {
  const reading = continueReading();
  const [uploads, setUploads] = useState([]);
  useEffect(() => { listUploads().then(setUploads); }, []);
  return (
    <div className="mx-auto max-w-6xl py-6">
      <div className="mb-8 px-4">
        <div className="rounded-2xl bg-gradient-to-br from-cyan-500/15 via-fuchsia-500/10 to-amber-500/10 p-6 ring-1 ring-white/10">
          <h1 className="text-2xl font-black sm:text-3xl">Read manga in English.</h1>
          <p className="mt-1 max-w-lg text-sm text-neutral-300">
            Localized, vertical-scroll reading. Browse by genre, pick up where you left off.
          </p>
        </div>
      </div>

      {reading.length > 0 && (
        <section className="mb-9">
          <h2 className="mb-3 px-4 text-lg font-bold">Continue reading</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {reading.map((r) => {
              const m = getManga(r.mangaId);
              const c = getChapter(r.mangaId, r.chapterId);
              if (!m || !c) return null;
              return (
                <Link key={r.mangaId} to={`/read/${m.id}/${c.id}`} className="w-36 shrink-0">
                  <MangaCard manga={m} />
                  <div className="mt-1 text-xs text-cyan-400">{c.title.split(" — ")[0]} · pg {r.page + 1}</div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {uploads.length > 0 && (
        <section className="mb-9">
          <h2 className="mb-3 px-4 text-lg font-bold">✨ Localized by creators</h2>
          <div className="no-scrollbar flex gap-3 overflow-x-auto px-4 pb-1">
            {uploads.map((u) => (
              <Link key={u.id} to={`/u/${u.id}`} className="w-36 shrink-0">
                <Cover manga={{ title: u.title, accent: u.accent, genres: [u.genre] }} />
                <div className="mt-1.5 text-xs text-cyan-400">{u.pageCount} pg · localized</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {GENRES.map((g) => (
        <Rail key={g.slug} title={`${g.emoji} ${g.name}`} to={`/genre/${g.slug}`} items={mangaByGenre(g.slug)} />
      ))}
    </div>
  );
}
