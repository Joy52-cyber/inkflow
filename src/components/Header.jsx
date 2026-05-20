import { Link, NavLink, useNavigate } from "react-router-dom";
import { GENRES } from "../data/catalog.js";
import { useAuth } from "../lib/AuthContext.jsx";

export default function Header() {
  const { creator, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-neutral-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link to="/" className="text-lg font-black tracking-tight">
          <span className="text-cyan-400">Ink</span>flow
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {GENRES.map((g) => (
            <NavLink key={g.slug} to={`/genre/${g.slug}`}
              className={({ isActive }) =>
                `rounded-full px-3 py-1.5 transition ${isActive ? "bg-white/10 text-white" : "text-neutral-400 hover:text-white"}`}>
              {g.emoji} {g.name}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2 text-sm">
          {creator?.role === "admin" && (
            <NavLink to="/admin" className="rounded-full px-3 py-1.5 text-neutral-400 hover:text-white">Review</NavLink>
          )}
          {creator ? (
            <>
              <NavLink to="/dashboard" className="rounded-full px-3 py-1.5 text-neutral-300 hover:text-white">
                {creator.display_name}
              </NavLink>
              <Link to="/upload" className="rounded-full bg-cyan-500 px-3.5 py-1.5 font-semibold text-black hover:bg-cyan-400">+ Localize</Link>
              <button onClick={() => { logout(); nav("/"); }} className="rounded-full px-3 py-1.5 text-neutral-500 hover:text-white">Log out</button>
            </>
          ) : (
            <Link to="/login" className="rounded-full bg-cyan-500 px-3.5 py-1.5 font-semibold text-black hover:bg-cyan-400">Log in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
