import { Link } from "react-router-dom";
import Cover from "./Cover.jsx";

export default function MangaCard({ manga, width = "w-36" }) {
  return (
    <Link to={`/manga/${manga.id}`} className={`group relative shrink-0 ${width}`}>
      <Cover manga={manga} className="transition-transform group-hover:-translate-y-1 group-hover:ring-white/30" />
      <span title="Generated sample content, not a real series"
        className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/15">
        Sample
      </span>
      <div className="mt-1.5 flex items-center gap-1 text-xs text-neutral-400">
        <span className="text-amber-400">★</span>
        <span>{manga.rating.toFixed(1)}</span>
        <span className="text-neutral-600">·</span>
        <span>{manga.status}</span>
      </div>
    </Link>
  );
}
