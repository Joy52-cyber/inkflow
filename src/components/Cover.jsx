// Generated cover art: gradient from the title's accent + initials + genre glyph.
// Keeps the app asset-free for covers; swap for real cover images later.
import { GENRES } from "../data/catalog.js";

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.max(0, Math.min(255, (n >> 16) + amt));
  const g = Math.max(0, Math.min(255, ((n >> 8) & 0xff) + amt));
  const b = Math.max(0, Math.min(255, (n & 0xff) + amt));
  return `rgb(${r},${g},${b})`;
}

export default function Cover({ manga, className = "" }) {
  const emoji = GENRES.find((g) => g.slug === manga.genres[0])?.emoji || "📖";
  const initials = manga.title.split(" ").slice(0, 2).map((w) => w[0]).join("");
  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden rounded-xl ring-1 ring-white/10 ${className}`}
      style={{ background: `linear-gradient(150deg, ${shade(manga.accent, 25)}, ${shade(manga.accent, -70)})` }}
    >
      <div className="absolute inset-0 opacity-25 mix-blend-overlay"
           style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px)", backgroundSize: "14px 14px" }} />
      <div className="absolute right-2 top-2 text-2xl drop-shadow">{emoji}</div>
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-black/70 to-transparent p-3">
        <span className="text-3xl font-black leading-none text-white/90">{initials}</span>
        <span className="line-clamp-2 text-sm font-semibold leading-tight text-white">{manga.title}</span>
      </div>
    </div>
  );
}
