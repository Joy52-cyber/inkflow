import { useParams, Link } from "react-router-dom";
import { getGenre, mangaByGenre } from "../data/catalog.js";
import MangaCard from "../components/MangaCard.jsx";

export default function Genre() {
  const { slug } = useParams();
  const genre = getGenre(slug);
  if (!genre) return <div className="mx-auto max-w-6xl p-8">Unknown genre. <Link className="text-cyan-400" to="/">Go home</Link></div>;
  const items = mangaByGenre(slug);
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-black">{genre.emoji} {genre.name}</h1>
      <p className="mt-1 text-sm text-neutral-400">{genre.blurb}</p>
      <div className="mt-6 grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 md:grid-cols-6">
        {items.map((m) => <MangaCard key={m.id} manga={m} width="w-full" />)}
      </div>
    </div>
  );
}
