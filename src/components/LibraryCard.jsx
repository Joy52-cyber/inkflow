import { Link } from "react-router-dom";
import Cover from "./Cover.jsx";

// Renders a DB library/trending/search row (series_title, genre, accent, creator).
export default function LibraryCard({ work, width = "w-36" }) {
  return (
    <div className={`shrink-0 ${width}`}>
      <Link to={`/u/${work.id}`} className="group block">
        <Cover
          manga={{ title: work.series_title, accent: work.accent, genres: [work.genre] }}
          className="transition-transform group-hover:-translate-y-1 group-hover:ring-white/30"
        />
      </Link>
      <Link to={`/creator/${work.creator_id}`} className="mt-1.5 block truncate text-xs text-cyan-400 hover:underline">
        {work.creator_name}
      </Link>
      {typeof work.views === "number" && (
        <div className="text-xs text-neutral-500">{work.views.toLocaleString()} views</div>
      )}
    </div>
  );
}
