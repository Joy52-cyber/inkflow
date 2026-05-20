import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getCreator } from "../lib/library.js";
import LibraryCard from "../components/LibraryCard.jsx";

export default function Creator() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    getCreator(id).then(setData).catch((e) => setErr(e.message));
  }, [id]);

  if (err) return <div className="mx-auto max-w-6xl p-8">Creator not found. <Link className="text-cyan-400" to="/">Home</Link></div>;
  if (!data) return <div className="mx-auto max-w-6xl p-8 text-neutral-500">Loading…</div>;

  const joined = new Date(data.creator.created_at).toLocaleDateString(undefined, { year: "numeric", month: "long" });

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/30 to-fuchsia-500/20 text-2xl font-black ring-1 ring-white/10">
          {data.creator.display_name[0]?.toUpperCase()}
        </div>
        <div>
          <h1 className="text-2xl font-black">{data.creator.display_name}</h1>
          <p className="text-sm text-neutral-400">Creator on Inkflow · since {joined} · {data.works.length} published</p>
        </div>
      </div>

      <h2 className="mb-3 mt-8 text-lg font-bold">Published works</h2>
      {data.works.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing published yet.</p>
      ) : (
        <div className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
          {data.works.map((w) => <LibraryCard key={w.id} work={w} width="w-full" />)}
        </div>
      )}
    </div>
  );
}
