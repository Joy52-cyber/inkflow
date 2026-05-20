// Tiny localStorage layer for "continue reading" + bookmarks. Swap for an API
// once accounts exist.
const READ_KEY = "inkflow.progress";
const BM_KEY = "inkflow.bookmarks";

const load = (k) => {
  try { return JSON.parse(localStorage.getItem(k)) || {}; } catch { return {}; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));

export function saveProgress(mangaId, chapterId, page) {
  const all = load(READ_KEY);
  all[mangaId] = { chapterId, page, at: Date.now() };
  save(READ_KEY, all);
}
export function getProgress(mangaId) {
  return load(READ_KEY)[mangaId] || null;
}
export function continueReading() {
  const all = load(READ_KEY);
  return Object.entries(all)
    .map(([mangaId, v]) => ({ mangaId, ...v }))
    .sort((a, b) => b.at - a.at);
}

export function toggleBookmark(mangaId) {
  const all = load(BM_KEY);
  all[mangaId] = !all[mangaId];
  if (!all[mangaId]) delete all[mangaId];
  save(BM_KEY, all);
  return !!all[mangaId];
}
export function isBookmarked(mangaId) {
  return !!load(BM_KEY)[mangaId];
}
