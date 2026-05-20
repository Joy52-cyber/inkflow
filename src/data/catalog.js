// Sample catalog. Replace with API/DB + real licensed/creator content later.
// Every chapter points at a generated English page set in /public/pages/<set>.

export const GENRES = [
  { slug: "cooking", name: "Cooking", emoji: "🍜", blurb: "Kitchens, rivalries, and food that fights back." },
  { slug: "action", name: "Action", emoji: "⚔️", blurb: "Blades, fists, and last stands." },
];

// Each chapter: { id, title, pages } where pages is a count served from set folder.
const ch = (id, title, set, pages) => ({ id, title, set, pages });

export const MANGA = [
  {
    id: "midnight-ramen",
    title: "Midnight Ramen",
    author: "R. Tanaka",
    genres: ["cooking"],
    set: "cooking",
    status: "Ongoing",
    year: 2025,
    accent: "#f59e0b",
    rating: 4.7,
    synopsis:
      "A burned-out salaryman inherits a tiny midnight ramen stall and discovers the broth holds his late father's secret recipe — and a city of hungry strangers each carrying a story.",
    chapters: [
      ch("c1", "Ch. 1 — The First Bowl", "cooking", 4),
      ch("c2", "Ch. 2 — Stock and Steam", "cooking", 4),
      ch("c3", "Ch. 3 — The Rival Stall", "cooking", 4),
    ],
  },
  {
    id: "patissiers-promise",
    title: "The Pâtissier's Promise",
    author: "M. Aoki",
    genres: ["cooking"],
    set: "cooking",
    status: "Ongoing",
    year: 2024,
    accent: "#ec4899",
    rating: 4.5,
    synopsis:
      "A prodigy pastry chef returns to her hometown bakery to honor a promise, armed with technique, nerves, and a temperamental oven.",
    chapters: [ch("c1", "Ch. 1 — Rise", "cooking", 4), ch("c2", "Ch. 2 — Fold", "cooking", 4)],
  },
  {
    id: "iron-wok-rivals",
    title: "Iron Wok Rivals",
    author: "K. Sato",
    genres: ["cooking", "action"],
    set: "cooking",
    status: "Completed",
    year: 2023,
    accent: "#ef4444",
    rating: 4.8,
    synopsis:
      "In an underground cooking league, chefs duel with flame and flavor. One challenger fights to reclaim her family's stolen recipe book.",
    chapters: [ch("c1", "Ch. 1 — Ignition", "cooking", 4), ch("c2", "Ch. 2 — High Heat", "cooking", 4)],
  },
  {
    id: "blade-of-the-tide",
    title: "Blade of the Tide",
    author: "H. Mori",
    genres: ["action"],
    set: "action",
    status: "Ongoing",
    year: 2025,
    accent: "#06b6d4",
    rating: 4.9,
    synopsis:
      "A masterless swordsman walks a drowning coastline, hunting the warlord who sank his clan beneath the waves.",
    chapters: [
      ch("c1", "Ch. 1 — Low Tide", "action", 4),
      ch("c2", "Ch. 2 — The Breakwater", "action", 4),
      ch("c3", "Ch. 3 — Undertow", "action", 4),
    ],
  },
  {
    id: "fist-of-the-fallen-star",
    title: "Fist of the Fallen Star",
    author: "D. Kuro",
    genres: ["action"],
    set: "action",
    status: "Ongoing",
    year: 2024,
    accent: "#8b5cf6",
    rating: 4.6,
    synopsis:
      "When a meteor grants ordinary brawlers impossible strength, a street fighter must master a power that's slowly burning him out.",
    chapters: [ch("c1", "Ch. 1 — Impact", "action", 4), ch("c2", "Ch. 2 — Aftershock", "action", 4)],
  },
  {
    id: "neon-ronin",
    title: "Neon Ronin",
    author: "S. Hayashi",
    genres: ["action"],
    set: "action",
    status: "Ongoing",
    year: 2026,
    accent: "#22d3ee",
    rating: 4.4,
    synopsis:
      "In a rain-soaked megacity, a disgraced cyber-samurai takes contracts she can't refuse to buy back the memories someone stole.",
    chapters: [ch("c1", "Ch. 1 — Signal", "action", 4)],
  },
];

export const getManga = (id) => MANGA.find((m) => m.id === id);
export const getGenre = (slug) => GENRES.find((g) => g.slug === slug);
export const mangaByGenre = (slug) => MANGA.filter((m) => m.genres.includes(slug));
export const getChapter = (mangaId, chapterId) => {
  const m = getManga(mangaId);
  return m ? m.chapters.find((c) => c.id === chapterId) : null;
};
export const pageUrls = (chapter) =>
  Array.from({ length: chapter.pages }, (_, i) => `/pages/${chapter.set}/p${i + 1}.png`);
