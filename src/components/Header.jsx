import { Link, NavLink } from "react-router-dom";
import { GENRES } from "../data/catalog.js";

export default function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link to="/" className="text-lg font-black tracking-tight">
          <span className="text-cyan-400">Ink</span>flow
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {GENRES.map((g) => (
            <NavLink
              key={g.slug}
              to={`/genre/${g.slug}`}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 transition ${
                  isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"
                }`
              }
            >
              {g.emoji} {g.name}
            </NavLink>
          ))}
        </nav>
        <NavLink to="/upload"
          className="ml-auto rounded-full bg-cyan-500 px-3.5 py-1.5 text-sm font-semibold text-black hover:bg-cyan-400">
          + Localize
        </NavLink>
      </div>
    </header>
  );
}
