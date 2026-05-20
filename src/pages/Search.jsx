import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { searchWorks } from "../lib/library.js";
import LibraryCard from "../components/LibraryCard.jsx";

export default function Search() {
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [results, setResults] = useState(null);

  useEffect(() => {
    if (!q.trim()) { setResults([]); return; }
    setResults(null);
    searchWorks(q).then(setResults);
  }, [q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-black">Search</h1>
      <p className="mt-1 text-sm text-neutral-400">
        {q ? <>Results for <span className="text-white">"{q}"</span></> : "Type a title or creator name."}
      </p>

      {results === null ? (
        <p className="mt-8 text-neutral-500">Searching…</p>
      ) : results.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-white/15 p-8 text-center text-sm text-neutral-400">
          {q ? <>No published works match "{q}".</> : "Nothing to show yet."}
          {" "}<Link to="/" className="text-cyan-400">Browse →</Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
          {results.map((w) => <LibraryCard key={w.id} work={w} width="w-full" />)}
        </div>
      )}
    </div>
  );
}
