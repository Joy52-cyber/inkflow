// Creator-work API (chapters, library, admin). Replaces the old uploads.js.
import { api } from "./api.js";

export function localize({ title, genre, files }) {
  const fd = new FormData();
  fd.append("title", title);
  fd.append("genre", genre);
  for (const f of files) fd.append("pages", f);
  return api("/localize", { method: "POST", body: fd, form: true, auth: true });
}

export const getChapter = (id) => api(`/chapters/${id}`);
export const publishChapter = (id) => api(`/chapters/${id}/publish`, { method: "POST", auth: true });
export const discardChapter = (id) => api(`/chapters/${id}`, { method: "DELETE", auth: true });

export const listLibrary = () => api("/library").catch(() => []);
export const listMine = () => api("/mine", { auth: true });

export const adminQueue = () => api("/admin/queue", { auth: true });
export const reviewChapter = (id, decision, note = "") =>
  api(`/admin/chapters/${id}/review`, { method: "POST", body: { decision, note }, auth: true });
